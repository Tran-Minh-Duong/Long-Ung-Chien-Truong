import type { GiftRule, UnitTierId } from '../live/types';

export interface TierMeta {
  id: UnitTierId;
  label: string;
  defaultCount: number;
  isBig: boolean;
  fallbackIcon: string;
}

export const UNIT_TIERS: TierMeta[] = [
  { id: 'soldier', label: 'Binh Lính', defaultCount: 3, isBig: false, fallbackIcon: '/img/game/gift_rose.webp' },
  { id: 'archer', label: 'Cung Binh', defaultCount: 3, isBig: false, fallbackIcon: '/img/game/gift_rosa.webp' },
  { id: 'dragonKnight', label: 'Kỵ Sĩ Rồng', defaultCount: 1, isBig: true, fallbackIcon: '/img/game/gift_doughnut.webp' },
  { id: 'boneDragon', label: 'Rồng Xương', defaultCount: 1, isBig: true, fallbackIcon: '/img/game/gift_cap.webp' },
  { id: 'eagleDragonLord', label: 'Bá Chủ Rồng Ưng', defaultCount: 1, isBig: true, fallbackIcon: '/img/game/gift_corgi.webp' },
];

export const UNIT_TIER_MAP: Record<UnitTierId, TierMeta> = Object.fromEntries(
  UNIT_TIERS.map((t) => [t.id, t]),
) as Record<UnitTierId, TierMeta>;

/** 5 quà mặc định giữ nguyên đúng theo hình mẫu của người dùng. */
export const DEFAULT_GIFT_RULES: GiftRule[] = [
  {
    id: 'gift_soldier',
    title: 'Triệu Binh',
    description: 'Mở cổng triệu hồi 3 Binh Lính xung phong theo làn đường đã chọn.',
    tier: 'soldier',
    count: 3,
    enabled: true,
    giftId: 5655,
    giftName: 'Rose',
    aliases: ['Hoa hồng'],
    diamondCount: 1,
    iconUrl: '/img/game/gift_rose.webp',
  },
  {
    id: 'gift_archer',
    title: 'Triệu Cung Binh',
    description: 'Mở cổng triệu hồi 3 Cung Binh bắn tên yểm trợ tầm xa.',
    tier: 'archer',
    count: 3,
    enabled: true,
    giftId: 8913,
    giftName: 'Rosa',
    aliases: ['Quà cấp 2', 'Kem', 'Tim'],
    diamondCount: 10,
    iconUrl: '/img/game/gift_rosa.webp',
  },
  {
    id: 'gift_knight',
    title: 'Triệu hồi kỵ sĩ rồng',
    description: 'Triệu hồi Kỵ Sĩ Rồng bọc giáp càn lướt tuyến đầu phe mình.',
    tier: 'dragonKnight',
    count: 1,
    enabled: true,
    giftId: 5879,
    giftName: 'Doughnut',
    aliases: ['Donut'],
    diamondCount: 30,
    iconUrl: '/img/game/gift_doughnut.webp',
  },
  {
    id: 'gift_bonedragon',
    title: 'Triệu hồi rồng xương',
    description: 'Triệu hồi Rồng Xương bay tầm xa phun lửa thiêu đốt đội hình địch.',
    tier: 'boneDragon',
    count: 1,
    enabled: true,
    giftId: 6104,
    giftName: 'Cap',
    aliases: ['Mũ'],
    diamondCount: 99,
    iconUrl: '/img/game/gift_cap.webp',
  },
  {
    id: 'gift_lord',
    title: 'Triệu hồi bá chủ rồng ưng',
    description: 'Mở đại cổng vàng, triệu hồi Bá Chủ Rồng Ưng mang tên người tặng & MC xướng danh.',
    tier: 'eagleDragonLord',
    count: 1,
    enabled: true,
    giftId: 6267,
    giftName: 'Corgi',
    aliases: [],
    diamondCount: 299,
    iconUrl: '/img/game/gift_corgi.webp',
  },
];

const VALID_TIERS = new Set<string>(UNIT_TIERS.map((t) => t.id));

function cleanIconUrl(raw: unknown, tier: UnitTierId): string {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return UNIT_TIER_MAP[tier].fallbackIcon;
  if (s.startsWith('/img/') || s.startsWith('img/') || /^https?:\/\//i.test(s)) {
    return s.slice(0, 400);
  }
  return UNIT_TIER_MAP[tier].fallbackIcon;
}

function cleanText(raw: unknown, max: number): string {
  return String(raw ?? '').replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, max);
}

/** Chuẩn hóa danh sách quà trước khi lưu server hoặc phát xuống stage. */
export function sanitizeGiftRules(input: unknown): GiftRule[] | null {
  if (!Array.isArray(input)) return null;
  const out: GiftRule[] = [];
  const seenIds = new Set<string>();
  for (const item of input.slice(0, 40)) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, unknown>;
    const tier: UnitTierId = VALID_TIERS.has(String(raw.tier)) ? (raw.tier as UnitTierId) : 'soldier';
    let id = cleanText(raw.id, 48).replace(/[^a-zA-Z0-9_-]/g, '');
    if (!id || seenIds.has(id)) id = `gift_${Date.now().toString(36)}_${out.length}`;
    seenIds.add(id);

    const giftIdNum = raw.giftId === null || raw.giftId === undefined || raw.giftId === '' ? null : Number(raw.giftId);
    const giftId = giftIdNum !== null && Number.isFinite(giftIdNum) && giftIdNum > 0 ? Math.round(giftIdNum) : null;
    const count = Math.max(1, Math.min(20, Math.round(Number(raw.count) || UNIT_TIER_MAP[tier].defaultCount)));
    const diamondCount = Math.max(0, Math.min(1_000_000, Math.round(Number(raw.diamondCount) || 0)));
    const aliases = Array.isArray(raw.aliases)
      ? raw.aliases.map((a) => cleanText(a, 40)).filter(Boolean).slice(0, 8)
      : [];

    out.push({
      id,
      title: cleanText(raw.title, 60) || UNIT_TIER_MAP[tier].label,
      description: cleanText(raw.description, 160),
      tier,
      count,
      enabled: raw.enabled !== false,
      giftId,
      giftName: cleanText(raw.giftName, 60),
      aliases,
      diamondCount,
      iconUrl: cleanIconUrl(raw.iconUrl, tier),
    });
  }
  return out;
}

export function cloneDefaultGifts(): GiftRule[] {
  return DEFAULT_GIFT_RULES.map((r) => ({ ...r, aliases: [...(r.aliases || [])] }));
}

