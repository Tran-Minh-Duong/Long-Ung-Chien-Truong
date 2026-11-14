/**
 * Server chung cho game live TikTok:
 * - Kết nối phòng live TikTok (tiktok-live-connector 2.x, proto v3)
 * - Đẩy sự kiện xuống trình duyệt qua SSE: /api/tiktok/events
 * - Lệnh từ trang điều khiển -> trang stage: /api/control
 * - Giọng đọc tiếng Việt: /api/tts (VieNeu cục bộ tại 127.0.0.1:8000 hoặc Edge TTS NamMinh / HoaiMy, lỗi thì Google)
 * - Giả lập sự kiện để test không cần live: /api/test/emit
 */
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import http from 'http';
import net from 'net';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { cloneDefaultGifts, sanitizeGiftRules } from './src/game/gifts';
import type { GiftRule, TikTokCatalogGift } from './src/live/types';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Giọng đọc. MC chính (câu không ghi gì hoặc "M:") là giọng nam; câu "F:" là MC nữ HoaiMy.
const TTS_VOICE = process.env.TTS_VOICE || 'vi-VN-NamMinhNeural';
const TTS_VOICE_F = 'vi-VN-HoaiMyNeural';
const TTS_PITCH = process.env.TTS_PITCH || '-4%';

// Chặn DNS rebinding: chỉ cho phép Host/Origin nội bộ
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', 'lvh.me']);
const hostOk = (h?: string) => !!h && LOCAL_HOSTS.has(h.replace(/:\d+$/, '').toLowerCase());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!hostOk(req.headers.host) || (origin && !hostOk(origin.replace(/^https?:\/\//, '')))) {
    return res.status(403).end();
  }
  next();
});

app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

// ---------- SSE ----------
interface LiveStats {
  isConnected: boolean;
  isConnecting: boolean;
  username: string;
  roomId: string;
  viewerCount: number;
  totalLikes: number;
  error?: string;
  stages: number;
}

const emptyStats = (): LiveStats => ({
  isConnected: false,
  isConnecting: false,
  username: '',
  roomId: '',
  viewerCount: 0,
  totalLikes: 0,
  error: '',
  stages: 0,
});

let liveStats = emptyStats();
let sseClients: express.Response[] = [];
// Chỉ trang stage mở sau cùng được phát tiếng để tránh đè giọng
let stageIds: string[] = [];
const speakerInfo = () => ({ id: stageIds[stageIds.length - 1] ?? null, count: stageIds.length });
function announceSpeaker() {
  liveStats.stages = stageIds.length;
  broadcast('speaker', speakerInfo());
  broadcast('status', liveStats);
}
let activeConn: InstanceType<typeof TikTokLiveConnection> | null = null;
let lastRateControl: { action: string; text: string } | null = null;

// Lưu cài đặt kênh/giọng/giao diện/tuỳ chỉnh vào settings.json
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
let lastNameControl: { action: string; text: string } | null = null;
let lastVoiceControl: { action: string; text: string } | null = null;
let lastThemeControl: { action: string; text: string } | null = null;
let lastPrefsControl: { action: string; text: string } | null = null;
let settings: {
  channelName?: string;
  voice?: string;
  theme?: string;
  prefs?: Record<string, string>;
  giftRules?: GiftRule[];
  giftCatalog?: TikTokCatalogGift[];
  giftSyncedAt?: number;
} = {};
let activeGiftRules: GiftRule[] = cloneDefaultGifts();
let activeGiftCatalog: TikTokCatalogGift[] = [];
let activeGiftSyncedAt: number | null = null;

/** Cài đặt game: object chữ -> chữ, tối đa 40 mục, mỗi mục 120 ký tự. */
function cleanPrefs(v: unknown): Record<string, string> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v).slice(0, 40)) {
    if (/^[a-zA-Z0-9_]{1,40}$/.test(k) && typeof val === 'string') {
      out[k] = val.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 120);
    }
  }
  return out;
}

try {
  settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) || {};
  if (typeof settings.channelName === 'string' && settings.channelName.trim()) {
    lastNameControl = { action: 'setName', text: settings.channelName.trim() };
  }
  if (settings.voice === 'M' || settings.voice === 'F') {
    lastVoiceControl = { action: 'setVoice', text: settings.voice };
  }
  if (typeof settings.theme === 'string' && /^[a-z0-9-]{1,40}$/.test(settings.theme)) {
    lastThemeControl = { action: 'setTheme', text: settings.theme };
  }
  const p = cleanPrefs(settings.prefs);
  if (p) lastPrefsControl = { action: 'setPrefs', text: JSON.stringify(p) };
  const loadedGifts = sanitizeGiftRules(settings.giftRules);
  if (loadedGifts) activeGiftRules = loadedGifts;
  if (Array.isArray(settings.giftCatalog)) {
    activeGiftCatalog = settings.giftCatalog.slice(0, 1200);
  }
  if (typeof settings.giftSyncedAt === 'number') {
    activeGiftSyncedAt = settings.giftSyncedAt;
  }
} catch {
  // Dùng mặc định trong config.ts / gifts.ts
}

function saveSettings(patch: typeof settings) {
  settings = { ...settings, ...patch };
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error('Không lưu được settings.json:', err);
  }
}

function broadcast(eventType: string, data: unknown) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      // Trình duyệt đã đóng
    }
  }
}

app.get('/api/tiktok/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write(`event: status\ndata: ${JSON.stringify(liveStats)}\n\n`);
  if (lastRateControl) res.write(`event: control\ndata: ${JSON.stringify(lastRateControl)}\n\n`);
  if (lastNameControl) res.write(`event: control\ndata: ${JSON.stringify(lastNameControl)}\n\n`);
  if (lastVoiceControl) res.write(`event: control\ndata: ${JSON.stringify(lastVoiceControl)}\n\n`);
  if (lastThemeControl) res.write(`event: control\ndata: ${JSON.stringify(lastThemeControl)}\n\n`);
  if (lastPrefsControl) res.write(`event: control\ndata: ${JSON.stringify(lastPrefsControl)}\n\n`);
  res.write(`event: gifts\ndata: ${JSON.stringify({ rules: activeGiftRules })}\n\n`);
  sseClients.push(res);

  const stageId = typeof req.query.stage === 'string' ? req.query.stage.slice(0, 40) : '';
  if (stageId) {
    stageIds = [...stageIds.filter((x) => x !== stageId), stageId];
    announceSpeaker();
  } else {
    res.write(`event: speaker\ndata: ${JSON.stringify(speakerInfo())}\n\n`);
  }

  const heartbeat = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter((c) => c !== res);
    if (stageId) {
      stageIds = stageIds.filter((x) => x !== stageId);
      announceSpeaker();
    }
  });
});

app.get('/api/tiktok/status', (_req, res) => res.json({ success: true, data: liveStats }));

// ---------- Đọc dữ liệu TikTok (proto v3) ----------
const userOf = (data: any) => data?.user?.displayId || data?.user?.uniqueId || data?.uniqueId || 'nguoi-xem';
const nickOf = (data: any) => data?.user?.nickname || data?.nickname || data?.uniqueId || 'Bạn';
function avatarOf(data: any): string {
  const user = data?.user;
  const images = [
    user?.avatarThumb, user?.avatarMedium, user?.avatarLarge,
    user?.profilePictureUrl, user?.avatar, data?.profilePictureUrl, data?.avatar,
  ];
  for (const image of images) {
    const candidates: unknown[] = typeof image === 'string'
      ? [image]
      : [
        ...(Array.isArray(image?.urlList) ? image.urlList : []),
        ...(Array.isArray(image?.urls) ? image.urls : []),
        image?.url,
      ];
    for (const candidate of candidates) {
      if (typeof candidate !== 'string') continue;
      const source = candidate.trim();
      const url = source.startsWith('//') ? 'https:' + source : source;
      if (!/^https?:\/\//i.test(url)) continue;
      try {
        if (new URL(url).hostname) return url;
      } catch {
        // Try the next URL supplied by TikTok.
      }
    }
  }
  return '';
}

function cleanTikTokUsername(raw: unknown): string {
  let s = String(raw || '').trim();
  if (!s) return '';
  const match = s.match(/@([a-zA-Z0-9_.]+)/i);
  if (match) return match[1];
  s = s.split('?')[0].replace(/^@/, '').replace(/\/$/, '').trim();
  if (s.includes('/')) {
    const parts = s.split('/').filter(Boolean);
    s = (parts[parts.length - 1] || '').replace(/^@/, '');
  }
  return s;
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null) {
    const e = err as any;
    if (e.message && typeof e.message === 'string') return e.message;
    if (e.error && typeof e.error === 'string') return e.error;
    try {
      const json = JSON.stringify(err);
      if (json && json !== '{}') return json;
    } catch {
      // bỏ qua
    }
  }
  return String(err);
}

app.post('/api/tiktok/connect', async (req, res) => {
  const cleanUser = cleanTikTokUsername(req.body?.username);
  if (!cleanUser) return res.status(400).json({ success: false, error: 'Chưa nhập username TikTok (ví dụ: zuonggg04)' });

  if (activeConn) {
    try {
      activeConn.disconnect();
    } catch {
      // bỏ qua
    }
    activeConn = null;
  }

  liveStats = { ...emptyStats(), isConnecting: true, username: cleanUser, stages: stageIds.length };
  broadcast('status', liveStats);

  const conn = new TikTokLiveConnection(cleanUser, {
    processInitialData: true,
    enableExtendedGiftInfo: false,
  });

  conn.on(ControlEvent.CONNECTED, (state: { roomId?: string }) => {
    console.log(`[TikTok] Đã kết nối @${cleanUser}, room ${state?.roomId}`);
    liveStats = { ...liveStats, isConnected: true, isConnecting: false, roomId: state?.roomId || '', error: '' };
    broadcast('status', liveStats);
  });

  conn.on(ControlEvent.DISCONNECTED, () => {
    console.log(`[TikTok] Mất kết nối @${cleanUser}`);
    if (activeConn === conn) {
      liveStats = {
        ...liveStats,
        isConnected: false,
        isConnecting: false,
        error: 'Mất kết nối với phiên live TikTok (tài khoản chưa phát trực tiếp hoặc phiên live đã kết thúc)',
      };
      broadcast('status', liveStats);
    }
  });

  conn.on(WebcastEvent.STREAM_END, () => {
    liveStats = { ...liveStats, isConnected: false, isConnecting: false, error: 'Phiên live đã kết thúc' };
    broadcast('status', liveStats);
  });

  conn.on(WebcastEvent.CHAT, (data: any) => {
    broadcast('chat', {
      username: userOf(data),
      nickname: nickOf(data),
      comment: data?.content || data?.comment || '',
      avatar: avatarOf(data),
      timestamp: Date.now(),
    });
  });

  const streakCounts = new Map<string, number>();
  const giftMessages = new Set<string>();
  conn.on(WebcastEvent.GIFT, (data: any) => {
    const username = userOf(data);
    const giftId = data?.giftId || 0;
    const isStreakable = (data?.gift?.type ?? data?.giftDetails?.giftType ?? data?.giftType) === 1;
    const count = Math.floor(Number(data?.repeatCount));
    const total = Number.isSafeInteger(count) && count > 0 ? count : 1;
    const messageId = String(data?.common?.msgId || data?.msgId || '');
    if (messageId && messageId !== '0') {
      const message = `${messageId}_${total}_${!!data?.repeatEnd}`;
      if (giftMessages.has(message)) return;
      giftMessages.add(message);
      if (giftMessages.size > 2048) giftMessages.delete(giftMessages.values().next().value!);
    }
    const group = String(data?.groupId || '');
    const hasGroup = group !== '' && group !== '0';
    const key = `${username}_${giftId}_${hasGroup ? group : ''}`;
    const previous = isStreakable ? (streakCounts.get(key) || 0) : 0;
    const delta = total - previous;
    if (isStreakable) {
      if (hasGroup || !data?.repeatEnd) {
        streakCounts.set(key, Math.max(total, previous));
        if (streakCounts.size > 2048) streakCounts.delete(streakCounts.keys().next().value!);
      } else {
        streakCounts.delete(key);
      }
    }
    if (delta <= 0) return;

    broadcast('gift', {
      username,
      nickname: nickOf(data),
      giftName: data?.gift?.name || data?.giftDetails?.giftName || data?.giftName || 'Quà',
      giftId,
      diamondCount: data?.gift?.diamondCount || data?.diamondCount || data?.giftDetails?.diamondCount || 1,
      repeatCount: delta,
      avatar: avatarOf(data),
      timestamp: Date.now(),
    });
  });

  conn.on(WebcastEvent.MEMBER, (data: any) => {
    broadcast('member', { username: userOf(data), nickname: nickOf(data), avatar: avatarOf(data), timestamp: Date.now() });
  });

  conn.on(WebcastEvent.FOLLOW, (data: any) => {
    broadcast('follow', { username: userOf(data), nickname: nickOf(data), avatar: avatarOf(data), timestamp: Date.now() });
  });

  conn.on(WebcastEvent.SHARE, (data: any) => {
    broadcast('share', { username: userOf(data), nickname: nickOf(data), avatar: avatarOf(data), timestamp: Date.now() });
  });

  conn.on(WebcastEvent.ROOM_USER, (data: any) => {
    if (typeof data?.viewerCount === 'number') {
      liveStats.viewerCount = data.viewerCount;
      broadcast('roomUser', { viewerCount: data.viewerCount });
    }
  });

  conn.on(WebcastEvent.LIKE, (data: any) => {
    if (typeof data?.totalLikeCount === 'number') liveStats.totalLikes = data.totalLikeCount;
    broadcast('like', {
      username: userOf(data),
      nickname: nickOf(data),
      avatar: avatarOf(data),
      likeCount: data?.likeCount || 1,
      totalLikes: liveStats.totalLikes,
    });
  });

  conn.on(ControlEvent.ERROR, (err: unknown) => {
    const msg = formatError(err);
    console.warn(`[TikTok] Lỗi @${cleanUser}:`, msg);
    liveStats.error = msg;
    broadcast('status', liveStats);
  });

  activeConn = conn;

  try {
    const live = await conn.fetchIsLive().catch(() => true);
    if (!live) {
      throw new Error('TikTok báo tài khoản này CHƯA LIVE. Bấm Phát trực tiếp trong LIVE Studio trước rồi mới kết nối');
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const state = await Promise.race([
      conn.connect(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('quá 30 giây không vào được phòng live')), 30_000);
      }),
    ]).finally(() => clearTimeout(timer));
    return res.json({ success: true, roomId: state?.roomId });
  } catch (err) {
    const msg = formatError(err);
    if (activeConn === conn) {
      try {
        conn.disconnect();
      } catch {
        // bỏ qua
      }
      activeConn = null;
      liveStats = { ...liveStats, isConnected: false, isConnecting: false, error: msg };
      broadcast('status', liveStats);
    }
    return res.status(400).json({
      success: false,
      error: `Không kết nối được @${cleanUser}: ${msg}`,
    });
  }
});

app.post('/api/tiktok/disconnect', (_req, res) => {
  try {
    activeConn?.disconnect();
  } catch {
    // bỏ qua
  }
  activeConn = null;
  liveStats = { ...emptyStats(), stages: stageIds.length };
  broadcast('status', liveStats);
  res.json({ success: true });
});

// ---------- Lệnh từ trang điều khiển ----------
const CONTROL_ACTIONS = ['speak', 'setRate', 'reset', 'setName', 'setVoice', 'setTheme', 'setPrefs', 'custom'];
app.post('/api/control', (req, res) => {
  const { action, text } = req.body || {};
  if (!CONTROL_ACTIONS.includes(action)) return res.status(400).json({ success: false, error: 'Lệnh không hợp lệ' });
  if (action === 'speak' && (typeof text !== 'string' || !text.trim())) {
    return res.status(400).json({ success: false, error: 'Chưa nhập nội dung cần đọc' });
  }
  const payload = { action, text: typeof text === 'string' ? text.trim().slice(0, 1000) : undefined };
  if (action === 'setRate' && payload.text) lastRateControl = { action, text: payload.text };
  if (action === 'setName') {
    const name = (payload.text || '').replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 40);
    if (!name) return res.status(400).json({ success: false, error: 'Chưa nhập tên kênh' });
    payload.text = name;
    lastNameControl = { action, text: name };
    saveSettings({ channelName: name });
  }
  if (action === 'setVoice') {
    if (payload.text !== 'M' && payload.text !== 'F') return res.status(400).json({ success: false, error: 'Giọng không hợp lệ' });
    lastVoiceControl = { action, text: payload.text };
    saveSettings({ voice: payload.text });
  }
  if (action === 'setTheme') {
    if (!payload.text || !/^[a-z0-9-]{1,40}$/.test(payload.text)) return res.status(400).json({ success: false, error: 'Giao diện không hợp lệ' });
    lastThemeControl = { action, text: payload.text };
    saveSettings({ theme: payload.text });
  }
  if (action === 'setPrefs') {
    let incoming: unknown = null;
    try {
      incoming = JSON.parse(payload.text || '');
    } catch {
      // sai JSON
    }
    const p = cleanPrefs(incoming);
    if (!p) return res.status(400).json({ success: false, error: 'Cài đặt không hợp lệ' });
    const merged = { ...(cleanPrefs(settings.prefs) ?? {}), ...p };
    payload.text = JSON.stringify(merged);
    lastPrefsControl = { action, text: payload.text };
    saveSettings({ prefs: merged });
  }
  broadcast('control', payload);
  res.json({ success: true, pages: sseClients.length });
});

// ---------- Giả lập sự kiện ----------
const TEST_EVENTS = ['chat', 'gift', 'member', 'follow', 'share', 'like'];
app.post('/api/test/emit', (req, res) => {
  const { type, data } = req.body || {};
  if (!TEST_EVENTS.includes(type)) return res.status(400).json({ success: false, error: 'Loại sự kiện không hợp lệ' });
  const event = { timestamp: Date.now(), avatar: '', ...(data || {}) };
  if (type === 'like') {
    liveStats.totalLikes += Number(event.likeCount) || 1;
    event.totalLikes = liveStats.totalLikes;
  }
  broadcast(type, event);
  res.json({ success: true });
});

// ---------- Giọng đọc ----------
const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function splitText(text: string, max = 190): string[] {
  const chunks: string[] = [];
  let rest = text.trim();
  while (rest.length > max) {
    const win = rest.slice(0, max + 1);
    let cut = Math.max(win.lastIndexOf('. '), win.lastIndexOf('! '), win.lastIndexOf('? '));
    if (cut < max / 2) cut = Math.max(win.lastIndexOf(', '), win.lastIndexOf('; '));
    if (cut < max / 2) cut = win.lastIndexOf(' ');
    if (cut <= 0) cut = max - 1;
    chunks.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

async function edgeTts(text: string, rate: number, voiceName: string, hype: boolean): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(escapeXml(text), {
      rate: `${rate >= 1 ? '+' : ''}${Math.round((rate - 1) * 100)}%`,
      pitch: TTS_PITCH,
      volume: hype ? '+40%' : '+0%',
    });
    const chunks: Buffer[] = [];
    const read = (async () => {
      for await (const c of audioStream) chunks.push(c as Buffer);
    })();
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Edge TTS timeout')), 20000);
    });
    await Promise.race([read, timeout]);
    if (chunks.length === 0) throw new Error('Edge TTS không trả âm thanh');
    return Buffer.concat(chunks);
  } finally {
    clearTimeout(timer);
    tts.close();
  }
}

async function googleTts(text: string): Promise<Buffer> {
  const parts: Buffer[] = [];
  for (const chunk of splitText(text)) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(chunk)}`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
      },
    });
    if (!r.ok) throw new Error(`Google TTS lỗi ${r.status}`);
    parts.push(Buffer.from(await r.arrayBuffer()));
  }
  return Buffer.concat(parts);
}

const VIENEU_URL = process.env.VIENEU_URL || 'http://127.0.0.1:8000';
async function vieneuTts(text: string, voice: string, temperature: number, signal: AbortSignal): Promise<Buffer> {
  const r = await fetch(`${VIENEU_URL}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'vieneu', input: text, voice, response_format: 'wav', temperature }),
    signal,
  });
  if (!r.ok) throw new Error(`VieNeu ${r.status}`);
  const wav = Buffer.from(await r.arrayBuffer());
  const di = wav.indexOf('data', 12);
  if (wav.toString('ascii', 0, 4) !== 'RIFF' || di < 0 || wav.length <= di + 8) {
    throw new Error('VieNeu không trả âm thanh WAV hợp lệ');
  }
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.writeUInt32LE(wav.length - di - 8, di + 4);
  return wav;
}

const ttsCache = new Map<string, Buffer>();
app.get('/api/tts', async (req, res) => {
  try {
    const preview = req.query.preview === '1';
    if (preview) res.setHeader('Cache-Control', 'no-store');
    const text = String(req.query.text || '').trim().slice(0, 1500);
    if (!text) return res.status(400).send('Thiếu text');
    if (req.query.eng === 'vn') {
      const voice = String(req.query.voice || 'Adam bựa').replace(/[^\p{L}\p{N} ]/gu, '').slice(0, 40) || 'Adam bựa';
      const temp = Math.min(1.5, Math.max(0.3, Number(req.query.temp) || 0.95));
      const timeout = AbortSignal.timeout(preview ? 30000 : 15000);
      const cancel = new AbortController();
      const onClose = () => cancel.abort();
      if (preview) res.once('close', onClose);
      try {
        const wav = await vieneuTts(text.slice(0, 400), voice, temp, AbortSignal.any([timeout, cancel.signal]));
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Cache-Control', 'no-store');
        return res.send(wav);
      } catch (err) {
        if (cancel.signal.aborted) return;
        if (preview) {
          console.warn('VieNeu nghe thử lỗi:', err instanceof Error ? err.message : err);
          return res.status(503).json({ error: timeout.aborted
            ? 'VieNeu-TTS phản hồi quá lâu. Hãy thử lại.'
            : `Chưa tạo được mẫu giọng ${voice}. Kiểm tra VieNeu-TTS đang chạy và có giọng này, rồi thử lại.` });
        }
        console.warn('VieNeu lỗi, đọc bằng Edge:', err instanceof Error ? err.message : err);
      } finally {
        if (preview) res.off('close', onClose);
      }
    }
    const said = text.replace(/\[[^\]]{1,20}\]\s*/g, '').trim() || text;
    const rate = Math.min(1.5, Math.max(0.5, Number(req.query.rate) || 1));
    const hype = req.query.hype === '1';
    const voiceName = req.query.v === 'f' ? TTS_VOICE_F : TTS_VOICE;
    const key = `${preview ? 'preview|' : ''}${voiceName}|${rate}|${hype}|${said}`;
    let audio = ttsCache.get(key);
    if (!audio) {
      try {
        audio = await edgeTts(said, rate, voiceName, hype);
      } catch (err) {
        if (preview) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn('Edge nghe thử lỗi:', message);
          if (/\b429\b/.test(message)) {
            return res.status(429).json({ error: 'Dịch vụ giọng đọc đang giới hạn lượt thử. Hãy chờ một chút rồi thử lại.' });
          }
          return res.status(503).json({ error: 'Microsoft Edge chưa tạo được mẫu giọng. Kiểm tra kết nối mạng rồi thử lại.' });
        }
        console.warn('Edge TTS lỗi, chuyển Google:', err instanceof Error ? err.message : err);
        audio = await googleTts(said);
      }
      ttsCache.set(key, audio);
      if (ttsCache.size > 200) ttsCache.delete(ttsCache.keys().next().value!);
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    if (!preview) res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(audio);
  } catch (err) {
    console.error('TTS lỗi:', err);
    res.status(500).json({ error: 'TTS failed' });
  }
});

// ---------- Đồng bộ & tùy chỉnh quà tặng TikTok ----------
function normalizeTikTokGifts(rawList: any[]): TikTokCatalogGift[] {
  const byId = new Map<number, TikTokCatalogGift>();
  for (const item of rawList) {
    const id = Number(item?.id);
    const name = String(item?.name || '').trim();
    if (!id || !name) continue;
    const iconUrl = String(item?.icon?.url_list?.[0] || item?.image?.url_list?.[0] || '');
    const diamondCount = Math.max(0, Math.round(Number(item?.diamond_count) || 0));
    const describe = String(item?.describe || '').trim();
    if (!byId.has(id)) {
      byId.set(id, { id, name, diamondCount, iconUrl, ...(describe ? { describe } : {}) });
    }
  }
  return [...byId.values()].sort((a, b) => a.diamondCount - b.diamondCount || a.name.localeCompare(b.name));
}

app.get('/api/gifts', (_req, res) => {
  res.json({
    success: true,
    rules: activeGiftRules,
    catalog: activeGiftCatalog,
    syncedAt: activeGiftSyncedAt,
  });
});

app.post('/api/gifts', (req, res) => {
  const { rules, reset } = req.body || {};
  const next = reset ? cloneDefaultGifts() : sanitizeGiftRules(rules);
  if (!next) return res.status(400).json({ success: false, error: 'Danh sách quà không hợp lệ' });
  activeGiftRules = next;
  saveSettings({ giftRules: next });
  broadcast('gifts', { rules: next });
  return res.json({ success: true, rules: next, pages: sseClients.length });
});

app.post('/api/gifts/sync', async (_req, res) => {
  try {
    let raw: any[] = [];
    if (activeConn && liveStats.isConnected && activeConn.roomId) {
      try {
        raw = await activeConn.fetchAvailableGifts();
      } catch {
        raw = [];
      }
    }
    if (!Array.isArray(raw) || raw.length === 0) {
      const client = new TikTokLiveConnection('tiktok', {});
      const resp = await client.webClient.getJsonObjectFromWebcastApi(
        'gift/list/',
        { ...client.webClient.clientParams },
        false,
      );
      raw = Array.isArray(resp?.data?.gifts) ? resp.data.gifts : [];
    }
    const catalog = normalizeTikTokGifts(raw);
    if (catalog.length === 0) {
      return res.status(502).json({ success: false, error: 'TikTok chưa trả về danh mục quà' });
    }
    const syncedAt = Date.now();
    activeGiftCatalog = catalog;
    activeGiftSyncedAt = syncedAt;
    saveSettings({ giftCatalog: catalog, giftSyncedAt: syncedAt });
    return res.json({ success: true, catalog, syncedAt, count: catalog.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(502).json({ success: false, error: `Đồng bộ quà TikTok thất bại: ${msg}` });
  }
});

// ---------- API riêng của game ----------
app.get('/api/voices', async (_req, res) => {
  try {
    const r = await fetch(`${VIENEU_URL}/v1/voices`, { signal: AbortSignal.timeout(1200) });
    if (!r.ok) return res.json({ vieneu: false, voices: [] });
    const data = (await r.json()) as { voices?: unknown; data?: unknown };
    const voices = Array.isArray(data?.voices) ? data.voices : data?.data;
    return res.json({ vieneu: true, voices: Array.isArray(voices) ? voices : [] });
  } catch {
    return res.json({ vieneu: false, voices: [] });
  }
});

// ---------- Khởi động ----------
const PORT_TRIES = 20;

function inUse(port: number) {
  return new Promise<boolean>((resolve) => {
    const sock = net.connect(port, '127.0.0.1');
    sock.setTimeout(500);
    sock.once('connect', () => (sock.destroy(), resolve(true)));
    sock.once('timeout', () => (sock.destroy(), resolve(false)));
    sock.once('error', () => resolve(false));
  });
}

async function listenFree(server: http.Server, port: number, what: string): Promise<number> {
  for (let p = port; p < port + PORT_TRIES; p++) {
    const ok =
      !(await inUse(p)) &&
      (await new Promise<boolean>((resolve, reject) => {
        const onError = (err: NodeJS.ErrnoException) => (err.code === 'EADDRINUSE' ? resolve(false) : reject(err));
        server.once('error', onError);
        server.listen(p, '127.0.0.1', () => {
          server.off('error', onError);
          resolve(true);
        });
      }));
    if (ok) return p;
    console.log(`${what}: cổng ${p} đang bận, thử ${p + 1}...`);
  }
  throw new Error(`${what}: cổng ${port} tới ${port + PORT_TRIES - 1} đều bận`);
}

async function start() {
  const port = await listenFree(http.createServer(app), PORT, 'Server');
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const live = process.env.LIVE_MODE === '1';
    const hmrServer = http.createServer();
    const hmrPort = live ? 0 : await listenFree(hmrServer, 24680, 'Tự tải lại (HMR)');
    const vite = await createServer({
      server: live
        ? { middlewareMode: true, hmr: false, ws: false }
        : { middlewareMode: true, hmr: { server: hmrServer, clientPort: hmrPort } },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    if (!live) console.log(`Cổng tự tải lại (HMR): ${hmrPort}`);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
  }

  const dashboard = `http://localhost:${port}`;
  console.log('');
  console.log(`  Trang điều khiển : ${dashboard}`);
  console.log(`  Link LIVE Studio : http://lvh.me:${port}/?view=stage   (1080 x 1920)`);
  if (port !== PORT) console.log(`  Chú ý: cổng ${PORT} đang bận nên dùng cổng ${port}. Link trong LIVE Studio phải đúng cổng này.`);
  console.log('');
  if (process.env.OPEN_DASHBOARD === '1' && process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', dashboard], { detached: true, stdio: 'ignore' }).unref();
  }
}

start().catch((err) => {
  console.error('Không bật được server:', err);
  process.exit(1);
});
