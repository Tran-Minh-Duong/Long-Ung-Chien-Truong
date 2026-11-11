import { sanitizePlayerName } from '../game/commandParser';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface LiveChatPayload {
  username: string;
  nickname: string;
  avatar: string;
  comment: string;
}

export interface LiveGiftPayload {
  username: string;
  nickname: string;
  avatar: string;
  giftName: string;
  diamondCount: number;
  repeatCount: number;
}

export interface LiveLikePayload {
  username: string;
  nickname: string;
  likeCount: number;
}

export interface LiveConnectorHandlers {
  onStatus?: (state: ConnectionState, message?: string) => void;
  onChat?: (payload: LiveChatPayload) => void;
  onGift?: (payload: LiveGiftPayload) => void;
  onLike?: (payload: LiveLikePayload) => void;
  onViewerCount?: (count: number) => void;
}

interface SpeechItem {
  text: string;
  priority: boolean;
  createdAt: number;
}

const DEFAULT_WS_STORAGE_KEY = 'long_ung_ws_url';

export function getSavedWsUrl(): string {
  try {
    return localStorage.getItem(DEFAULT_WS_STORAGE_KEY) || 'ws://localhost:8081';
  } catch {
    return 'ws://localhost:8081';
  }
}

export function saveWsUrl(url: string): void {
  try {
    localStorage.setItem(DEFAULT_WS_STORAGE_KEY, url);
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage
  }
}

/**
 * Giọng đọc MC tiếng Việt qua Web Speech API (TTS trình duyệt).
 * Ưu tiên đọc ngay khi người xem triệu hồi rồng lớn hoặc ăn boss.
 */
class VietnameseVoiceMc {
  enabled = true;
  rate = 1.05;
  volume = 1;
  private queue: SpeechItem[] = [];
  private speaking = false;

  private pickVietnameseVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    return (
      voices.find((v) => v.lang.toLowerCase() === 'vi-vn' && /hoaimy|namminh|google/i.test(v.name)) ||
      voices.find((v) => v.lang.toLowerCase().startsWith('vi')) ||
      null
    );
  }

  speak(text: string, priority = false): void {
    if (!this.enabled || !text.trim()) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const item: SpeechItem = {
      text: text.trim(),
      priority,
      createdAt: Date.now(),
    };

    if (priority) {
      // Giữ tối đa 5 câu ưu tiên mới nhất
      const priItems = this.queue.filter((q) => q.priority).slice(-4);
      const normalItems = this.queue.filter((q) => !q.priority);
      this.queue = [...priItems, item, ...normalItems];
    } else {
      if (this.queue.length >= 6) return;
      this.queue.push(item);
    }

    this.flush();
  }

  announceSummon(rawName: string, unitName: string, teamLabel: string): void {
    const safeName = sanitizePlayerName(rawName);
    this.speak(
      `Cổng không gian mở ra! Tướng quân ${safeName} vừa triệu hồi ${unitName} tiếp viện cho ${teamLabel}!`,
      true,
    );
  }

  stop(): void {
    this.queue = [];
    this.speaking = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  private flush(): void {
    if (this.speaking || this.queue.length === 0) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // Loại bỏ câu cũ quá 12 giây để MC luôn bám sát diễn biến
    const now = Date.now();
    while (this.queue.length > 0 && now - this.queue[0].createdAt > 12_000) {
      this.queue.shift();
    }
    const next = this.queue.shift();
    if (!next) return;

    this.speaking = true;
    const utter = new SpeechSynthesisUtterance(next.text);
    utter.lang = 'vi-VN';
    utter.rate = this.rate;
    utter.volume = this.volume;

    const viVoice = this.pickVietnameseVoice();
    if (viVoice) utter.voice = viVoice;

    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      this.speaking = false;
      this.flush();
    };

    // Guard phòng trường hợp trình duyệt treo sự kiện onend
    const guard = window.setTimeout(done, 11_000);
    utter.onend = done;
    utter.onerror = done;

    try {
      window.speechSynthesis.speak(utter);
    } catch {
      done();
    }
  }
}

export const mcVoice = new VietnameseVoiceMc();

/**
 * Âm thanh hiệu ứng tổng hợp bằng Web Audio API (không phụ thuộc file mp3 ngoài).
 */
class SynthSfx {
  enabled = true;
  private ctx: AudioContext | null = null;

  private context(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  playPortal(isBigDragon = false): void {
    const ctx = this.context();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isBigDragon ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isBigDragon ? 140 : 280, now);
    osc.frequency.exponentialRampToValueAtTime(isBigDragon ? 520 : 620, now + 0.35);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  }

  playExplosion(): void {
    const ctx = this.context();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.65);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.72);
  }
}

export const gameSfx = new SynthSfx();

/**
 * Kết nối WebSocket tới backend TikTok LIVE (TikFinity / Node tiktok-live-connector relay).
 */
export class LiveConnector {
  private ws: WebSocket | null = null;
  private handlers: LiveConnectorHandlers = {};
  private state: ConnectionState = 'disconnected';

  setHandlers(handlers: LiveConnectorHandlers): void {
    this.handlers = handlers;
  }

  getState(): ConnectionState {
    return this.state;
  }

  connect(wsUrl: string): void {
    const trimmed = wsUrl.trim();
    if (!trimmed) {
      this.updateStatus('error', 'Vui lòng nhập địa chỉ WebSocket hợp lệ (vd: ws://localhost:8081)');
      return;
    }
    this.disconnect(false);
    saveWsUrl(trimmed);
    this.updateStatus('connecting', `Đang kết nối tới ${trimmed}...`);

    try {
      const socket = new WebSocket(trimmed);
      this.ws = socket;

      socket.onopen = () => {
        if (this.ws !== socket) return;
        this.updateStatus('connected', `Đã kết nối WebSocket (${trimmed})`);
      };

      socket.onmessage = (evt) => {
        if (this.ws !== socket) return;
        this.handleRawMessage(String(evt.data || ''));
      };

      socket.onerror = () => {
        if (this.ws !== socket) return;
        this.updateStatus('error', 'Không kết nối được tới WebSocket backend TikTok Live');
      };

      socket.onclose = () => {
        if (this.ws !== socket) return;
        this.ws = null;
        if (this.state !== 'error') {
          this.updateStatus('disconnected', 'Đã ngắt kết nối WebSocket');
        }
      };
    } catch (err) {
      this.updateStatus('error', err instanceof Error ? err.message : 'Lỗi khởi tạo WebSocket');
    }
  }

  disconnect(notify = true): void {
    if (this.ws) {
      const old = this.ws;
      this.ws = null;
      old.close();
    }
    if (notify) {
      this.updateStatus('disconnected', 'Đã ngắt kết nối');
    }
  }

  private updateStatus(state: ConnectionState, message?: string): void {
    this.state = state;
    this.handlers.onStatus?.(state, message);
  }

  private handleRawMessage(raw: string): void {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }

    const eventType = String(parsed.event ?? parsed.type ?? '').toLowerCase();
    const data = (parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed) as Record<string, unknown>;

    const username = String(data.uniqueId ?? data.username ?? data.displayId ?? 'viewer');
    const nickname = String(data.nickname ?? data.userName ?? username);
    const avatar = String(data.profilePictureUrl ?? data.avatar ?? '');

    if (eventType === 'chat' || eventType === 'comment') {
      const comment = String(data.comment ?? data.text ?? '');
      if (comment) {
        this.handlers.onChat?.({ username, nickname, avatar, comment });
      }
      return;
    }

    if (eventType === 'gift') {
      const giftName = String(data.giftName ?? data.gift ?? 'Hoa hồng');
      const diamondCount = Number(data.diamondCount ?? data.coins ?? 1) || 1;
      const repeatCount = Math.max(1, Number(data.repeatCount ?? data.count ?? 1) || 1);
      // Nếu backend gửi kèm repeatEnd === false (combo chưa dứt) và có cờ streakable, vẫn cho xử lý nếu không trùng
      if (data.giftType === 1 && data.repeatEnd === false) {
        return;
      }
      this.handlers.onGift?.({ username, nickname, avatar, giftName, diamondCount, repeatCount });
      return;
    }

    if (eventType === 'like') {
      const likeCount = Math.max(1, Number(data.likeCount ?? 1) || 1);
      this.handlers.onLike?.({ username, nickname, likeCount });
      return;
    }

    if (eventType === 'roomuser' || eventType === 'viewers') {
      const count = Number(data.viewerCount ?? data.count ?? 0) || 0;
      this.handlers.onViewerCount?.(count);
    }
  }
}

export const liveConnector = new LiveConnector();

