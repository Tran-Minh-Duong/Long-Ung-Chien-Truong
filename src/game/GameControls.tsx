import { useEffect, useRef, useState, type ReactNode } from 'react';
import { emitTest, sendControl } from '../live/page';
import type { GiftRule } from '../live/types';
import { GAME } from './config';
import { gameApi, type GameStats } from './frame';
import { GiftManager } from './GiftManager';
import { DISCLAIMER_ITEMS } from './unitConfig';

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi'];
const TEN = ['Lan Anh', 'Minh Tuấn', 'Thu Hà', 'Quốc Bảo', 'Ngọc Mai', 'Hoàng Long', 'Gia Huy', 'Khánh Vy', 'Bé Na 🌸', 'duyanh99'];
let uid = 0;
const who = () => {
  uid++;
  const nickname = uid % 7 === 0 ? TEN[uid % TEN.length] : `${HO[uid % HO.length]} ${TEN[(uid * 3) % TEN.length]}`;
  return { nickname, username: `test${Date.now().toString(36)}${uid}` };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function GameControls({ prefs, giftRules }: { prefs: Record<string, string>; giftRules: GiftRule[] }) {
  const [side, setSide] = useState<'1' | '2'>('1');
  const [count, setCount] = useState('');
  const [mc, setMc] = useState<Record<string, string>>({ ...GAME.mc, ...prefs });
  const [showRules, setShowRules] = useState(false);
  useEffect(() => setMc((m) => ({ ...m, ...prefs })), [prefs]);
  const sim = useRef<(() => void) | null>(null);
  const rulesRef = useRef<GiftRule[]>(giftRules);
  rulesRef.current = giftRules;
  const [simInfo, setSimInfo] = useState('');
  const [stats, setStats] = useState<GameStats | null>(null);
  const refreshStats = () => setStats(gameApi()?.stats() ?? null);
  useEffect(() => {
    refreshStats();
    const timer = setInterval(refreshStats, 1000);
    return () => clearInterval(timer);
  }, []);

  const asPlayer = async (s: string, then?: (u: ReturnType<typeof who>) => Promise<void>) => {
    const u = who();
    await emitTest('chat', { ...u, comment: s });
    await then?.(u);
  };

  const voteAs = (team: '1' | '2', lane: 'top' | 'mid' | 'adc') => asPlayer(`${team} ${lane}`);

  // Kiểm tra đếm comment: gửi 200 comment đủ kiểu và so sánh bộ đếm của game
  const testCount = async () => {
    const api = gameApi();
    if (!api) return setCount('Game chưa tải xong, thử lại sau vài giây.');
    if (api.phase() !== 'fight') return setCount('Đang màn kết quả, chờ trận mới rồi thử.');
    const before = api.stats().cmt;
    const forms = ['1', '2', 'top', 'mid', 'adc', 'bac', 'upatk', 'downatk', '1111', 'hay quá', 'cố lên'];
    const people = Array.from({ length: 40 }, who);
    let sent = 0;
    setCount('Đang gửi 200 comment...');
    for (let i = 0; i < 200; i++) {
      const u = people[i % people.length];
      await emitTest('chat', { ...u, comment: forms[i % forms.length] });
      sent++;
    }
    await sleep(1500);
    const after = gameApi()?.stats().cmt ?? before;
    const got = after[0] - before[0] + (after[1] - before[1]);
    setCount(
      `Gửi ${sent} comment, game đếm ${got}. ${got === sent ? 'Khớp toàn bộ comment.' : 'Lệch bộ đếm, kiểm tra lại.'} (Đỏ +${after[0] - before[0]}, Xanh +${after[1] - before[1]})`,
    );
  };

  const startSim = (kind: 'full' | 'low') => {
    sim.current?.();
    const SCRIPT: [number, number, number, number, number, string][] =
      kind === 'full'
        ? [
            [0, 12, 120, 0.5, 0, 'Mở live, người vào lác đác'],
            [2, 30, 360, 0.5, 0, 'Người vào đều 3 đường'],
            [8, 60, 40, 0.65, 60, 'DỒN DẬP 1: Ăn Rồng tranh thế'],
            [11, 15, 240, 0.5, 0, 'Giao tranh đường Mid'],
            [15, 45, 30, 0.3, 75, 'DỒN DẬP 2: Tập kích Hang Baron'],
            [19, 20, 300, 0.5, 0, 'Đẩy trụ 3 đường'],
            [27, 150, 60, 0.5, 180, 'DỒN DẬP 3: 3 phút cuối tổng lực'],
          ]
        : [
            [0, 2, 240, 0.5, 0, 'Vắng: 1-2 người'],
            [6, 3, 480, 0.5, 0, 'Vẫn vắng'],
            [16, 3, 360, 0.5, 0, 'Thêm vài người'],
            [26, 6, 120, 0.5, 45, 'Cuối trận thêm chút người'],
          ];
    void sendControl('custom', 'len:1800');
    const t0 = Date.now();
    const crowd: { u: ReturnType<typeof who>; side: string; at: number; until: number; next: number }[] = [];
    const rushes: [number, number][] = [];
    const fired = new Set<number>();
    let label = '';
    const LANES = ['top', 'mid', 'adc', 'bac', 'upatk', 'downatk'];
    const timer = setInterval(() => {
      const el = (Date.now() - t0) / 1000;
      if (el > 1800) return stop();
      SCRIPT.forEach(([min, n, over, share, rush, lb], i) => {
        if (fired.has(i) || el < min * 60) return;
        fired.add(i);
        label = lb;
        if (rush) rushes.push([el, el + rush]);
        for (let j = 0; j < n; j++) {
          crowd.push({
            u: who(),
            side: Math.random() < share ? '1' : '2',
            at: el + Math.random() * over,
            until: min >= 27 ? 1e9 : el + 180 + Math.random() * 720,
            next: 0,
          });
        }
      });
      const busy = rushes.some(([a, b]) => el >= a && el <= b) ? 3 : 1;
      let active = 0;
      for (const p of crowd) {
        if (el < p.at || el > p.until) continue;
        active++;
        if (el < p.next) continue;
        p.next = el + (6 + Math.random() * 14) / busy;
        const cmt = Math.random() < 0.4 ? p.side : Math.random() < 0.8 ? LANES[Math.floor(Math.random() * LANES.length)] : 'cố lên';
        void emitTest('chat', { ...p.u, comment: cmt });
        if (Math.random() < (busy > 1 ? 0.8 : 0.35)) {
          void emitTest('like', { ...p.u, likeCount: busy > 1 ? 20 + Math.floor(Math.random() * 60) : 5 + Math.floor(Math.random() * 25) });
        }
        const r = Math.random() / busy;
        const pool = rulesRef.current
          .filter((x) => x.enabled && (x.giftId || x.giftName))
          .sort((a, b) => a.diamondCount - b.diamondCount);
        let picked: GiftRule | undefined;
        if (pool.length > 0 && r < 0.0261) {
          if (r < 0.02) picked = pool[0];
          else if (r < 0.023) picked = pool[Math.min(1, pool.length - 1)];
          else if (r < 0.025) picked = pool[Math.min(2, pool.length - 1)];
          else if (r < 0.0258) picked = pool[Math.min(3, pool.length - 1)];
          else picked = pool[pool.length - 1];
        }
        if (picked) {
          void emitTest('gift', {
            ...p.u,
            giftName: picked.giftName || picked.title,
            giftId: picked.giftId || 0,
            diamondCount: picked.diamondCount || 1,
            repeatCount: 1,
          });
        }
      }
      setSimInfo(`Phút ${(el / 60).toFixed(1)}/30 · ${active} người đang xem · ${label}`);
    }, 250);
    const stop = () => {
      clearInterval(timer);
      sim.current = null;
      setSimInfo('Đã dừng mô phỏng.');
    };
    sim.current = stop;
  };
  useEffect(() => () => sim.current?.(), []);

  const saveMc = (patch: Record<string, string>) => {
    const next = { ...mc, ...patch };
    setMc(next);
    void sendControl('setPrefs', JSON.stringify(patch));
  };

  return (
    <section className="space-y-4 rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-amber-300">Long Ưng Chiến Trường · Zuong · Điều khiển</h2>
        <button
          onClick={() => setShowRules((v) => !v)}
          className="rounded-lg bg-slate-800 px-3 py-1 text-xs text-amber-200 hover:bg-slate-700"
        >
          {showRules ? 'Ẩn lưu ý trách nhiệm' : 'Xem 7 lưu ý & trách nhiệm'}
        </button>
      </div>

      {showRules && (
        <div className="max-h-60 space-y-2 overflow-y-auto rounded-xl bg-slate-950/80 p-3 text-xs text-slate-300 ring-1 ring-amber-500/30">
          {DISCLAIMER_ITEMS.map((item) => (
            <div key={item.title}>
              <div className="font-semibold text-amber-300">{item.title}</div>
              <p className="text-slate-400">{item.body}</p>
            </div>
          ))}
        </div>
      )}

      <Row title="Trận đấu">
        <B onClick={() => sendControl('custom', 'match')}>Trận mới</B>
        <LeaderboardButton stats={stats} onAfterClick={() => setTimeout(refreshStats, 150)} />
        <B onClick={() => sendControl('custom', 'len:1800')}>30 phút</B>
        <B onClick={() => sendControl('custom', 'len:300')}>5 phút (thử)</B>
        <B onClick={() => sendControl('custom', 'len:90')}>90 giây (thử)</B>
        <span className="self-center text-xs text-slate-500">Nhảy tới:</span>
        <B onClick={() => sendControl('custom', 'jump:1')}>Hiệp 2</B>
        <B onClick={() => sendControl('custom', 'jump:1.5')}>Rồng / Baron</B>
        <B onClick={() => sendControl('custom', 'jump:2')}>Hiệp 3</B>
        <B onClick={() => sendControl('custom', 'jump:3')}>3 phút cuối</B>
      </Row>

      <Row title="Đếm bình luận (kiểm tra nhận toàn bộ lệnh & bình luận)">
        <B onClick={testCount}>Kiểm tra đếm bình luận (200 comment)</B>
        {count && <div className="w-full text-sm text-amber-300">{count}</div>}
      </Row>

      <Row title="Người xem giả · Điều khiển phe & 3 đường">
        <B onClick={() => asPlayer('1')}>Gõ "1" (Đỏ)</B>
        <B onClick={() => asPlayer('2')}>Gõ "2" (Xanh)</B>
        <B onClick={() => asPlayer('top')}>top</B>
        <B onClick={() => asPlayer('mid')}>mid</B>
        <B onClick={() => asPlayer('adc')}>adc</B>
        <B onClick={() => asPlayer('bac')}>bac</B>
        <B onClick={() => asPlayer('upatk')}>upatk</B>
        <B onClick={() => asPlayer('downatk')}>downatk</B>
        <B onClick={() => asPlayer('1111')}>Gõ "1111"</B>
        <B onClick={() => asPlayer('hay quá')}>Bình luận thường</B>
        <B onClick={() => asPlayer('1', (u) => emitTest('like', { ...u, likeCount: 1000 }))}>+1k tim Đỏ</B>
        <B onClick={() => asPlayer('2', (u) => emitTest('like', { ...u, likeCount: 1000 }))}>+1k tim Xanh</B>
        <B onClick={() => asPlayer('1', (u) => emitTest('share', u))}>Chia sẻ</B>
        <B onClick={() => asPlayer('2', (u) => emitTest('follow', u))}>Theo dõi</B>
      </Row>

      <Row title="Xe Công Thành (Bỏ phiếu khán giả)">
        <B onClick={() => sendControl('custom', 'siegeVote')}>Bỏ phiếu (20s)</B>
        <B onClick={() => voteAs('1', 'top')}>Đỏ vote top</B>
        <B onClick={() => voteAs('1', 'mid')}>Đỏ vote mid</B>
        <B onClick={() => voteAs('1', 'adc')}>Đỏ vote adc</B>
        <B onClick={() => voteAs('2', 'top')}>Xanh vote top</B>
        <B onClick={() => voteAs('2', 'mid')}>Xanh vote mid</B>
        <B onClick={() => voteAs('2', 'adc')}>Xanh vote adc</B>
        <B onClick={() => sendControl('custom', 'spawnSiege:0:mid')}>Sinh Xe Đỏ (mid)</B>
        <B onClick={() => sendControl('custom', 'spawnSiege:1:mid')}>Sinh Xe Xanh (mid)</B>
      </Row>

      <Row title="Giao tranh & Hiệp phụ">
        <B onClick={() => sendControl('custom', 'overtime')}>Thử Hiệp phụ 60s</B>
        <B onClick={() => sendControl('custom', 'contest:drag')}>Rồng tranh chấp</B>
        <B onClick={() => sendControl('custom', 'contest:baron')}>Baron tranh chấp</B>
        <B onClick={() => sendControl('custom', 'moment:turret')}>Thử Phá trụ</B>
        <B onClick={() => sendControl('custom', 'moment:boss')}>Thử Hạ boss</B>
        <B onClick={() => sendControl('custom', 'moment:lord')}>Thử Bá Chủ</B>
      </Row>

      <GiftManager
        rules={giftRules}
        side={side}
        onSideChange={setSide}
        onSaveRules={async (next) => {
          await fetch('/api/gifts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rules: next }),
          });
        }}
        onResetDefaults={async () => {
          await fetch('/api/gifts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reset: true }),
          });
        }}
        onTestGift={(rule) => {
          void asPlayer(side, (u) =>
            emitTest('gift', {
              ...u,
              giftName: rule.giftName || rule.title,
              giftId: rule.giftId || 0,
              diamondCount: rule.diamondCount || 1,
              repeatCount: 1,
            }),
          );
        }}
      />

      <Row title="Mô phỏng trận 30 phút">
        <B onClick={() => startSim('full')}>Live đông (3 đợt dồn dập)</B>
        <B onClick={() => startSim('low')}>Live ít người</B>
        <B onClick={() => sim.current?.()}>Dừng</B>
        {simInfo && <div className="w-full text-sm text-amber-300">{simInfo}</div>}
      </Row>

      <Row title="Đồ họa sân khấu">
        <B onClick={() => saveMc({ graphics: 'full' })} on={mc.graphics !== 'lite'}>Chuẩn</B>
        <B onClick={() => saveMc({ graphics: 'lite' })} on={mc.graphics === 'lite'}>Nhẹ (30 FPS)</B>
        {stats && (
          <span className="text-xs text-slate-400">
            Xem trước: {stats.fps} FPS · {stats.frameP95 ?? 0} ms p95 · {stats.units} quân · {stats.pendingGiftUnits ?? 0} đang chờ
          </span>
        )}
      </Row>

      <Row title="Âm lượng trên live (đổi ngay, lưu cho lần sau)">
        <Vol label="Nhạc nền" value={mc.musicVol} max={1.5} onChange={(v) => saveMc({ musicVol: v })} />
        <Vol label="Hiệu ứng" value={mc.sfxVol} max={1.5} onChange={(v) => saveMc({ sfxVol: v })} />
        <Vol label="Giọng MC" value={mc.mcVol} max={1} onChange={(v) => saveMc({ mcVol: v })} />
      </Row>

    </section>
  );
}

export function LeaderboardButton({ stats, onAfterClick }: { stats?: GameStats | null; onAfterClick?: () => void }) {
  const [polled, setPolled] = useState<GameStats | null>(null);
  const sync = () => setPolled(gameApi()?.stats() ?? null);
  useEffect(() => {
    if (stats !== undefined) return;
    sync();
    const timer = setInterval(sync, 500);
    return () => clearInterval(timer);
  }, [stats]);
  const s = stats !== undefined ? stats : polled;
  const pinned = !!s?.leaderboardPinned;
  const open = !!s?.leaderboardOpen;
  const label = !s
    ? '🏆 Bật / Tắt BXH'
    : pinned
      ? '✕ Đóng BXH'
      : open
        ? '📌 Giữ BXH'
        : '🏆 Xem BXH';
  const action = !s ? 'toggleLeaderboard' : pinned ? 'hideLeaderboard' : 'showLeaderboard';
  return (
    <B
      onClick={() => {
        void sendControl('custom', action).then(() => {
          onAfterClick?.();
          if (stats === undefined) setTimeout(sync, 150);
        });
      }}
      on={pinned}
    >
      {label}
    </B>
  );
}

export type ViewMode = 'game' | 'both' | 'panel';
export function ViewSwitch({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const opts: [ViewMode, string][] = [
    ['game', 'Chỉ game'],
    ['both', 'Game + bảng điều khiển'],
    ['panel', 'Chỉ bảng điều khiển'],
  ];
  return (
    <div className="flex gap-1 rounded-xl bg-slate-900/90 p-1 ring-1 ring-slate-700 backdrop-blur">
      {opts.map(([m, label]) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${mode === m ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Vol({ label, value, max, onChange }: { label: string; value: string; max: number; onChange: (v: string) => void }) {
  return (
    <label className="flex w-full items-center gap-3 text-sm">
      <span className="w-36 shrink-0">{label}</span>
      <input type="range" min="0" max={max} step="0.05" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1" />
      <span className="w-12 text-right tabular-nums">{Math.round(Number(value) * 100)}%</span>
    </label>
  );
}

function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs text-slate-400">{title}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function B({ children, onClick, on }: { children: ReactNode; onClick: () => void; on?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-medium ${on ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700'}`}
    >
      {children}
    </button>
  );
}
