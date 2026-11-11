import { emitTest } from './page';

export interface AutoLiveOptions {
  people: number;
  durationMs: number;
  comment: (i: number) => string;
  onProgress?: (p: { elapsedMs: number; sent: number; done: boolean }) => void;
}

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const TEN = [
  'Lan Anh', 'Minh Tuấn', 'Thu Hà', 'Quốc Bảo', 'Ngọc Mai', 'Hoàng Long',
  'Bích Trâm', 'Đức Anh', 'Kim Ngân', 'Mỹ Linh', 'Gia Huy', 'Thanh Tâm',
  'Văn Hùng', 'Hải Yến', 'Phương Thảo', 'Tuấn Kiệt', 'Diệu Linh', 'Khánh Vy',
];
const CHIT_CHAT = ['top', 'mid', 'adc', 'bac', 'upatk', 'downatk', 'Live hay quá', 'cố lên', '❤️❤️❤️'];
const GIFTS = [
  { giftName: 'Hoa hồng', giftId: 5655, diamondCount: 1 },
  { giftName: 'Quà cấp 2', giftId: 5827, diamondCount: 10 },
  { giftName: 'Donut', giftId: 5487, diamondCount: 30 },
  { giftName: 'Mũ', giftId: 6104, diamondCount: 99 },
  { giftName: 'Corgi', giftId: 6369, diamondCount: 299 },
];

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const any = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

function makePeople(n: number) {
  return Array.from({ length: n }, (_, i) => {
    let nickname = `${any(HO)} ${any(TEN)}`;
    const r = Math.random();
    if (r < 0.1) nickname = `${any(TEN)} 🌸`;
    else if (r < 0.15) nickname = `${any(TEN).toLowerCase().replace(/\s/g, '')}${Math.floor(rnd(1, 99))}`;
    return { username: `auto${i}_${Math.random().toString(36).slice(2, 6)}`, nickname, avatar: '' };
  });
}

type Ev = { at: number; type: string; data: Record<string, unknown> };

function plan({ people, durationMs, comment }: AutoLiveOptions): Ev[] {
  const D = durationMs;
  const evs: Ev[] = [];
  const users = makePeople(people);
  users.forEach((u, i) => {
    const join = i === 0 ? 300 : Math.random() < 0.85 ? rnd(0, 0.2 * D) : rnd(0.2 * D, 0.75 * D);
    evs.push({ at: join, type: 'member', data: u });
    for (let t = join + rnd(800, 4000); t < 0.9 * D; t += rnd(6000, 20000)) {
      evs.push({ at: t, type: 'chat', data: { ...u, comment: Math.random() < 0.75 ? comment(i) : any(CHIT_CHAT) } });
    }
    if (Math.random() < 0.4) {
      for (let t = join + rnd(2000, 8000); t < 0.9 * D; t += rnd(5000, 15000)) {
        evs.push({ at: t, type: 'like', data: { ...u, likeCount: Math.floor(rnd(5, 31)) } });
      }
    }
    const r = Math.random();
    if (r < 0.2) evs.push({ at: rnd(join + 3000, 0.88 * D), type: 'gift', data: { ...u, ...any(GIFTS.slice(0, 3)), repeatCount: Math.ceil(rnd(0, 5)) } });
    else if (r < 0.26) evs.push({ at: rnd(join + 3000, 0.88 * D), type: 'gift', data: { ...u, ...GIFTS[3], repeatCount: 1 } });
    if (Math.random() < 0.1) evs.push({ at: rnd(join + 2000, 0.9 * D), type: 'follow', data: u });
    if (Math.random() < 0.05) evs.push({ at: rnd(join + 2000, 0.9 * D), type: 'share', data: u });
  });
  const big = users.slice(0, Math.max(1, Math.min(2, users.length)));
  evs.push({ at: 0.45 * D, type: 'chat', data: { ...big[0], comment: comment(0) } });
  evs.push({ at: 0.45 * D + 1500, type: 'gift', data: { ...big[0], ...GIFTS[3], repeatCount: 1 } });
  const b2 = big[big.length - 1];
  evs.push({ at: 0.78 * D, type: 'gift', data: { ...b2, ...GIFTS[4], repeatCount: 1 } });
  evs.push({ at: rnd(0.2 * D, 0.6 * D), type: 'chat', data: { username: 'troll_auto', nickname: 'Troll', avatar: '', comment: 'dm live chán' } });
  return evs.sort((a, b) => a.at - b.at);
}

export function startAutoLive(opts: AutoLiveOptions) {
  const evs = plan(opts);
  const t0 = Date.now();
  let next = 0;
  let sent = 0;
  const timer = setInterval(() => {
    const now = Date.now() - t0;
    while (next < evs.length && evs[next].at <= now) {
      const e = evs[next++];
      void emitTest(e.type, e.data).catch(() => {});
      sent++;
    }
    const done = now >= opts.durationMs;
    opts.onProgress?.({ elapsedMs: Math.min(now, opts.durationMs), sent, done });
    if (done) clearInterval(timer);
  }, 200);
  return () => {
    clearInterval(timer);
    opts.onProgress?.({ elapsedMs: Date.now() - t0, sent, done: true });
  };
}

