export const plain = (text: string) =>
  ` ${text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `;

export class GiftThanker {
  private last = new Map<string, number>();
  constructor(
    private cooldownMs = 30_000,
    private bigCoins = 99,
    private maxWaiting = 6,
  ) {}
  shouldThank(username: string, coins: number, giftLinesWaiting: number, now = Date.now()) {
    const key = username.toLowerCase();
    const big = coins >= this.bigCoins;
    if (!big && now - (this.last.get(key) ?? -Infinity) < this.cooldownMs) return false;
    if (!big && giftLinesWaiting >= this.maxWaiting) return false;
    this.last.set(key, now);
    return true;
  }
  reset() {
    this.last.clear();
  }
}

export class OncePerPerson {
  private seen = new Set<string>();
  first(username: string) {
    const key = username.toLowerCase();
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    return true;
  }
  reset() {
    this.seen.clear();
  }
}

export class RecentPeople {
  private at = new Map<string, { name: string; at: number }>();
  note(username: string, name: string, now = Date.now()) {
    this.at.delete(username);
    this.at.set(username, { name, at: now });
    if (this.at.size > 200) this.at.delete(this.at.keys().next().value!);
  }
  latest(n: number, withinMs: number, now = Date.now()) {
    return [...this.at.values()]
      .filter((p) => now - p.at <= withinMs)
      .reverse()
      .slice(0, n)
      .map((p) => p.name);
  }
  reset() {
    this.at.clear();
  }
}

export type WishTopic = 'exam' | 'health' | 'love' | 'family' | 'work' | 'wealth' | 'peace';

const WISH_WORDS = [' mong ', ' cau ', ' xin ', ' nguyen ', ' uoc ', ' muon ', ' chuc ', ' phu ho ', ' gia ho '];

const TOPICS: Array<[WishTopic, string[]]> = [
  ['exam', [' thi ', ' diem ', ' dau dai hoc ', ' do dai hoc ', ' tot nghiep ', ' kiem tra ', ' hoc gioi ', ' hoc tot ', ' ielts ', ' bang lai ']],
  ['health', [' suc khoe ', ' khoe ', ' khoe manh ', ' khoi benh ', ' benh ', ' om ', ' phau thuat ', ' nam vien ', ' het dau ', ' binh phuc ']],
  ['love', [' nguoi yeu ', ' tinh duyen ', ' ny ', ' crush ', ' lay chong ', ' lay vo ', ' cuoi ', ' quay lai ', ' nguoi thuong ', ' duyen ']],
  ['family', [' gia dinh ', ' gia dao ', ' con cai ', ' bo me ', ' cha me ', ' em be ', ' sinh con ', ' mang thai ', ' co con ', ' vo chong ']],
  ['work', [' viec ', ' phong van ', ' thang chuc ', ' tang luong ', ' di lam ']],
  ['wealth', [' tien ', ' tai loc ', ' lam an ', ' buon ban ', ' kinh doanh ', ' giau ', ' tra no ', ' het no ', ' trung so ', ' tai chinh ', ' ban hang ', ' don hang ']],
  ['peace', [' binh an ', ' an lanh ', ' tai qua ', ' qua nan ', ' het xui ', ' giai han ', ' thuan loi ', ' may man ']],
];

export function detectWish(comment: string): WishTopic | null {
  const t = plain(comment);
  if (!WISH_WORDS.some((w) => t.includes(w))) return null;
  for (const [topic, words] of TOPICS) {
    if (words.some((w) => t.includes(w))) return topic;
  }
  return null;
}

export class WishLimiter {
  private byUser = new Map<string, number>();
  private lastAny = -Infinity;
  constructor(
    private perUserMs = 10 * 60_000,
    private globalMs = 20_000,
  ) {}
  allow(username: string, now = Date.now()) {
    const key = username.toLowerCase();
    if (now - this.lastAny < this.globalMs) return false;
    if (now - (this.byUser.get(key) ?? -Infinity) < this.perUserMs) return false;
    this.lastAny = now;
    this.byUser.set(key, now);
    return true;
  }
  reset() {
    this.byUser.clear();
    this.lastAny = -Infinity;
  }
}

export function makePicker() {
  const lastIndex = new Map<readonly unknown[], number>();
  return <T,>(list: readonly T[]): T | undefined => {
    if (!list.length) return undefined;
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === lastIndex.get(list)) i = (i + 1) % list.length;
    lastIndex.set(list, i);
    return list[i];
  };
}

