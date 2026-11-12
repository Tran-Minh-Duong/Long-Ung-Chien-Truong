import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { LiveStatus } from './types';
import { emitTest, sendControl } from './page';
import { startAutoLive } from './autoLive';
import { McSettings } from '../game/McSettings';

export interface AutoLiveConfig {
  durationMs: number;
  comment: (i: number) => string;
  onStart?: () => void;
}

const pickOne = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

const DEFAULT_AUTO: AutoLiveConfig = {
  durationMs: 120_000,
  comment: (i) => pickOne([i % 2 === 0 ? '1' : '2', 'top', 'mid', 'adc', 'bac', 'upatk', 'downatk']),
};

const FAKE_NAMES = ['Lan Anh', 'Minh Tuấn', 'Bé Na 🌸', 'Hoàng Long', 'Thu Trang', 'Quốc Bảo', 'duyanh99', '𝑵𝒈𝒐̣𝒄 𝑨𝒏𝒉'];
const pick = () => {
  const nickname = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
  return { nickname, username: nickname.normalize('NFKD').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'khach' };
};

export function Dashboard({
  status,
  channelName,
  voiceWho,
  prefs,
  preview,
  top,
  extra,
  autoLive = DEFAULT_AUTO,
}: {
  status: LiveStatus | null;
  channelName: string;
  voiceWho?: 'M' | 'F';
  prefs: Record<string, string>;
  preview: ReactNode;
  top?: ReactNode;
  extra?: ReactNode;
  autoLive?: AutoLiveConfig;
}) {
  const [user, setUser] = useState(() => localStorageGet('tiktokUser'));
  const [nameText, setNameText] = useState('');
  const [msg, setMsg] = useState('');
  const [speakText, setSpeakText] = useState('');
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    setBusy(true);
    setMsg('');
    localStorageSet('tiktokUser', user);
    try {
      const r = await fetch('/api/tiktok/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user }),
      }).then((x) => x.json());
      setMsg(r.success ? 'Đã kết nối' : r.error);
    } catch (e) {
      setMsg(String(e));
    }
    setBusy(false);
  };

  const disconnect = () => fetch('/api/tiktok/disconnect', { method: 'POST' });

  const speak = async () => {
    const r = await sendControl('speak', speakText);
    setMsg(r.pages > 1 ? `Đã gửi (đang mở ${r.pages} trang)` : 'Đã gửi');
    setSpeakText('');
  };

  const saveName = async () => {
    const r = await sendControl('setName', nameText);
    setMsg(r.success ? `Đã lưu tên kênh: ${nameText.trim()}` : r.error);
    if (r.success) setNameText('');
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100 md:p-6">
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <Card title="Kết nối TikTok LIVE">
            <div className="flex flex-wrap gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg bg-slate-800 px-3 py-2"
                placeholder="username TikTok (không cần @)"
                value={user}
                onChange={(e) => setUser(e.target.value)}
              />
              <Btn onClick={connect} disabled={busy || !user.trim()}>
                {busy ? 'Đang nối...' : 'Kết nối'}
              </Btn>
              <Btn onClick={disconnect} tone="ghost">
                Ngắt
              </Btn>
            </div>
            <div className="mt-3 text-sm">
              Trạng thái:{' '}
              {status?.isConnected ? (
                <span className="text-emerald-400">
                  Đang live @{status.username} · {status.viewerCount} người xem · {status.totalLikes} tim
                </span>
              ) : status?.isConnecting ? (
                <span className="text-amber-400">Đang kết nối...</span>
              ) : (
                <span className="text-slate-400">Chưa kết nối</span>
              )}
            </div>
            {(msg || status?.error) && <div className="mt-1 text-sm text-amber-300">{msg || status?.error}</div>}
            {(status?.stages ?? 0) > 1 && (
              <div className="mt-2 rounded-lg bg-red-900/60 p-2 text-sm text-red-100">
                Đang mở {status!.stages} trang stage. Chỉ trang mở sau cùng phát tiếng, các trang kia im. Nên đóng bớt cho đỡ nhầm.
              </div>
            )}
            <div className="mt-3 rounded-lg bg-slate-800/60 p-3 text-xs text-slate-400">
              Link cho TikTok LIVE Studio: <b className="text-slate-200">http://lvh.me:{window.location.port || 80}/?view=stage</b> · 1080 × 1920.
              Chỉ trang đó phát tiếng.
            </div>
          </Card>

          <Card title="Giọng MC">
            <McSettings prefs={prefs} voiceWho={voiceWho} />
            <div className="mb-3 mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-4 text-sm">
              <span>
                Tên kênh: <b className="text-amber-300">{channelName}</b>
              </span>
              <input
                className="min-w-0 flex-1 rounded-lg bg-slate-800 px-3 py-2"
                placeholder="Đổi tên kênh mà giọng đọc xưng..."
                maxLength={40}
                value={nameText}
                onChange={(e) => setNameText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && nameText.trim() && saveName()}
              />
              <Btn onClick={saveName} disabled={!nameText.trim()}>
                Lưu tên
              </Btn>
            </div>
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg bg-slate-800 px-3 py-2"
                placeholder="Gõ câu muốn đọc trên sân khấu..."
                value={speakText}
                onChange={(e) => setSpeakText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && speakText.trim() && speak()}
              />
              <Btn onClick={speak} disabled={!speakText.trim()}>
                Đọc trên sân khấu
              </Btn>
            </div>
            <div className="mt-3">
              <Btn tone="danger" onClick={() => sendControl('reset')}>
                Reset game
              </Btn>
            </div>
          </Card>

          {top}

          <Card title="Giả lập nhanh (test khi chưa live)">
            <div className="flex flex-wrap gap-2">
              <Btn tone="ghost" onClick={() => emitTest('member', pick())}>
                👋 Người vào
              </Btn>
              <Btn tone="ghost" onClick={() => emitTest('chat', { ...pick(), comment: '1' })}>
                🔴 Gõ "1" (Đỏ)
              </Btn>
              <Btn tone="ghost" onClick={() => emitTest('chat', { ...pick(), comment: '2' })}>
                🔵 Gõ "2" (Xanh)
              </Btn>
              <Btn tone="ghost" onClick={() => emitTest('chat', { ...pick(), comment: 'upatk' })}>
                🐉 Gõ "upatk" (Ăn Rồng)
              </Btn>
              <Btn tone="ghost" onClick={() => emitTest('chat', { ...pick(), comment: 'mong mai thi được điểm cao' })}>
                🙏 Comment cầu chúc
              </Btn>
              <Btn
                tone="ghost"
                onClick={() => emitTest('gift', { ...pick(), giftName: 'Hoa hồng', giftId: 5655, diamondCount: 1, repeatCount: 5 })}
              >
                🌹 5 Hoa hồng
              </Btn>
              <Btn
                tone="ghost"
                onClick={() => emitTest('gift', { ...pick(), giftName: 'Corgi', giftId: 6369, diamondCount: 299, repeatCount: 1 })}
              >
                🐶 Corgi (Rồng Ưng)
              </Btn>
              <Btn tone="ghost" onClick={() => comboSameUser()}>
                🔁 1 người tặng 3 lần liền
              </Btn>
              <Btn tone="ghost" onClick={() => emitTest('follow', pick())}>
                ➕ Follow
              </Btn>
              <Btn tone="ghost" onClick={() => emitTest('like', { ...pick(), likeCount: 100 })}>
                ❤️ 100 tim
              </Btn>
            </div>
            <AutoLivePanel config={autoLive} />
            <p className="mt-2 text-xs text-slate-500">Sự kiện giả đi tới mọi trang đang mở, kể cả stage trong LIVE Studio.</p>
          </Card>

          {extra}
        </div>

        <div className="justify-self-center">
          <div className="mb-2 text-center text-sm text-slate-400">Xem trước (im lặng)</div>
          <div className="overflow-hidden rounded-2xl ring-1 ring-slate-700">{preview}</div>
        </div>
      </div>
    </div>
  );
}

function AutoLivePanel({ config }: { config: AutoLiveConfig }) {
  const [run, setRun] = useState<{ people: number; elapsedMs: number; sent: number; done: boolean } | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  useEffect(() => () => stopRef.current?.(), []);

  const start = (people: number) => {
    stopRef.current?.();
    config.onStart?.();
    setRun({ people, elapsedMs: 0, sent: 0, done: false });
    stopRef.current = startAutoLive({
      people,
      durationMs: config.durationMs,
      comment: config.comment,
      onProgress: (p) => setRun({ people, ...p }),
    });
  };
  const stop = () => {
    stopRef.current?.();
    stopRef.current = null;
  };
  const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
  const running = run && !run.done;

  return (
    <div className="mt-4 rounded-xl bg-slate-800/60 p-3">
      <div className="mb-2 text-sm font-semibold">Live tự động (chạy trọn 1 vòng {mmss(config.durationMs)})</div>
      <div className="flex flex-wrap gap-2">
        {[10, 50, 100].map((n) => (
          <Btn key={n} tone={running && run.people === n ? 'primary' : 'ghost'} onClick={() => start(n)}>
            ▶ {n} người
          </Btn>
        ))}
        <Btn tone="danger" onClick={stop} disabled={!running}>
          ⏹ Dừng
        </Btn>
      </div>
      {run && (
        <div className="mt-2 text-xs text-slate-300">
          {run.done ? 'Xong' : 'Đang chạy'} {run.people} người: {mmss(run.elapsedMs)} / {mmss(config.durationMs)}, đã bắn {run.sent} sự kiện
        </div>
      )}
    </div>
  );
}

function comboSameUser() {
  const who = pick();
  for (let i = 0; i < 3; i++) {
    setTimeout(() => emitTest('gift', { ...who, giftName: 'Hoa hồng', giftId: 5655, diamondCount: 1, repeatCount: 1 }), i * 1000);
  }
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  tone = 'primary',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'ghost' | 'danger';
}) {
  const cls = {
    primary: 'bg-amber-500 text-slate-950 hover:bg-amber-400',
    ghost: 'bg-slate-800 hover:bg-slate-700',
    danger: 'bg-rose-700 hover:bg-rose-600',
  }[tone];
  return (
    <button onClick={onClick} disabled={disabled} className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-40 ${cls}`}>
      {children}
    </button>
  );
}

function localStorageGet(k: string) {
  try {
    return localStorage.getItem(k) || '';
  } catch {
    return '';
  }
}
function localStorageSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    // bỏ qua
  }
}

