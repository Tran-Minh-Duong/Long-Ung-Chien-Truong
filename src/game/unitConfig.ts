export type Team = 'red' | 'blue';

export type UnitTier =
  | 'soldier'
  | 'archer'
  | 'dragonKnight'
  | 'boneDragon'
  | 'eagleDragonLord';

export interface UnitSpec {
  tier: UnitTier;
  name: string;
  hp: number;
  speed: number;
  range: number;
  detectRange: number;
  damage: number;
  attackCooldown: number;
  size: number;
  projectile: 'arrow' | 'boneFire' | 'dragonBreath' | null;
  projectileSpeed: number;
  splashRadius: number;
  isFlying: boolean;
  announceTier: boolean;
  scoreValue: number;
  giftLabel: string;
  giftIcon: string;
}

export interface StructureSpec {
  name: string;
  hp: number;
  range: number;
  damage: number;
  attackCooldown: number;
  size: number;
}

export interface BossSpec {
  id: 'dragon' | 'baron';
  code: 'DRAG' | 'BARON';
  name: string;
  hp: number;
  range: number;
  damage: number;
  attackCooldown: number;
  size: number;
  respawnSec: number;
  buffDurationSec: number;
  atkMultiplier: number;
  speedMultiplier: number;
  killScore: number;
}

export interface GiftOption {
  tier: UnitTier;
  giftName: string;
  icon: string;
  title: string;
  coins: number;
  spawnCount: number;
  badgeColor: string;
}

/**
 * Cấu hình 5 cấp độ lính và rồng.
 * Chỉnh sửa các chỉ số máu, tốc chạy, tầm đánh, sát thương, kích thước tại đây.
 */
export const UNIT_CONFIG: Record<UnitTier, UnitSpec> = {
  soldier: {
    tier: 'soldier',
    name: 'Binh Lính',
    hp: 150,
    speed: 58,
    range: 26,
    detectRange: 135,
    damage: 18,
    attackCooldown: 0.85,
    size: 11,
    projectile: null,
    projectileSpeed: 0,
    splashRadius: 0,
    isFlying: false,
    announceTier: false,
    scoreValue: 12,
    giftLabel: 'Hoa hồng',
    giftIcon: '🌹',
  },
  archer: {
    tier: 'archer',
    name: 'Cung Binh',
    hp: 120,
    speed: 55,
    range: 112,
    detectRange: 155,
    damage: 24,
    attackCooldown: 0.95,
    size: 11.5,
    projectile: 'arrow',
    projectileSpeed: 340,
    splashRadius: 0,
    isFlying: false,
    announceTier: false,
    scoreValue: 25,
    giftLabel: 'Quà cấp 2',
    giftIcon: '🌺',
  },
  dragonKnight: {
    tier: 'dragonKnight',
    name: 'Kỵ Sĩ Rồng',
    hp: 480,
    speed: 74,
    range: 34,
    detectRange: 165,
    damage: 52,
    attackCooldown: 0.78,
    size: 16,
    projectile: null,
    projectileSpeed: 0,
    splashRadius: 22,
    isFlying: false,
    announceTier: true,
    scoreValue: 95,
    giftLabel: 'Donut',
    giftIcon: '🍩',
  },
  boneDragon: {
    tier: 'boneDragon',
    name: 'Rồng Xương',
    hp: 1150,
    speed: 60,
    range: 138,
    detectRange: 205,
    damage: 88,
    attackCooldown: 1.05,
    size: 24,
    projectile: 'boneFire',
    projectileSpeed: 310,
    splashRadius: 34,
    isFlying: true,
    announceTier: true,
    scoreValue: 280,
    giftLabel: 'Mũ',
    giftIcon: '🧢',
  },
  eagleDragonLord: {
    tier: 'eagleDragonLord',
    name: 'Bá Chủ Rồng Ưng',
    hp: 2800,
    speed: 54,
    range: 158,
    detectRange: 235,
    damage: 155,
    attackCooldown: 1.05,
    size: 33,
    projectile: 'dragonBreath',
    projectileSpeed: 330,
    splashRadius: 48,
    isFlying: true,
    announceTier: true,
    scoreValue: 750,
    giftLabel: 'Corgi',
    giftIcon: '🐶',
  },
};

export const STRUCTURE_CONFIG: Record<'outerTurret' | 'innerTurret' | 'nexus', StructureSpec> = {
  outerTurret: {
    name: 'Trụ Ngoài',
    hp: 1650,
    range: 134,
    damage: 64,
    attackCooldown: 1.05,
    size: 22,
  },
  innerTurret: {
    name: 'Trụ Trong',
    hp: 2300,
    range: 142,
    damage: 84,
    attackCooldown: 0.95,
    size: 24,
  },
  nexus: {
    name: 'Nhà Chính',
    hp: 6800,
    range: 168,
    damage: 115,
    attackCooldown: 0.85,
    size: 40,
  },
};

export const BOSS_CONFIG: Record<'dragon' | 'baron', BossSpec> = {
  dragon: {
    id: 'dragon',
    code: 'DRAG',
    name: 'Rồng Cổ Đại (DRAG)',
    hp: 2900,
    range: 118,
    damage: 72,
    attackCooldown: 1.25,
    size: 30,
    respawnSec: 36,
    buffDurationSec: 40,
    atkMultiplier: 1.35,
    speedMultiplier: 1.12,
    killScore: 450,
  },
  baron: {
    id: 'baron',
    code: 'BARON',
    name: 'Baron Tối Thượng',
    hp: 4300,
    range: 128,
    damage: 98,
    attackCooldown: 1.2,
    size: 34,
    respawnSec: 48,
    buffDurationSec: 45,
    atkMultiplier: 1.5,
    speedMultiplier: 1.22,
    killScore: 700,
  },
};

export const GIFT_CATALOG: GiftOption[] = [
  {
    tier: 'soldier',
    giftName: 'Hoa hồng',
    icon: '🌹',
    title: 'Triệu Binh',
    coins: 1,
    spawnCount: 3,
    badgeColor: '#fb7185',
  },
  {
    tier: 'archer',
    giftName: 'Quà cấp 2',
    icon: '🌺',
    title: 'Triệu Cung Binh',
    coins: 10,
    spawnCount: 2,
    badgeColor: '#f472b6',
  },
  {
    tier: 'dragonKnight',
    giftName: 'Donut',
    icon: '🍩',
    title: 'Triệu hồi kỵ sĩ rồng',
    coins: 30,
    spawnCount: 1,
    badgeColor: '#fbbf24',
  },
  {
    tier: 'boneDragon',
    giftName: 'Mũ',
    icon: '🧢',
    title: 'Triệu hồi rồng xương',
    coins: 99,
    spawnCount: 1,
    badgeColor: '#38bdf8',
  },
  {
    tier: 'eagleDragonLord',
    giftName: 'Corgi',
    icon: '🐶',
    title: 'Triệu hồi bá chủ rồng ưng',
    coins: 299,
    spawnCount: 1,
    badgeColor: '#f59e0b',
  },
];

export const MATCH_CONFIG = {
  ambientWaveIntervalSec: 7.5,
  commentSpawnCooldownMs: 1400,
  maxActiveUnits: 210,
  victoryResetDelaySec: 6,
};

/**
 * Ánh xạ quà tặng từ TikTok LIVE hoặc giả lập sang cấp độ lính tương ứng.
 */
export function resolveGiftToUnit(giftName: string, diamondCount: number): GiftOption {
  const normalized = giftName.trim().toLowerCase();
  if (normalized.includes('corgi') || diamondCount >= 200) {
    return GIFT_CATALOG[4];
  }
  if (normalized.includes('mũ') || normalized.includes('mu') || normalized.includes('hat') || normalized.includes('cap') || diamondCount >= 50) {
    return GIFT_CATALOG[3];
  }
  if (normalized.includes('donut') || diamondCount >= 20) {
    return GIFT_CATALOG[2];
  }
  if (normalized.includes('cấp 2') || normalized.includes('cap 2') || normalized.includes('perfume') || normalized.includes('rosa') || diamondCount >= 5) {
    return GIFT_CATALOG[1];
  }
  return GIFT_CATALOG[0];
}

export const DISCLAIMER_ITEMS: readonly { title: string; body: string }[] = [
  {
    title: '1. Đồ hoạ và bản đồ là hình mô phỏng.',
    body: 'Bản đồ 3 đường, quái vật, rồng và hiệu ứng kỹ năng được thiết kế mô phỏng theo phong cách chiến thuật giải trí, không thuộc hay đại diện cho bất kỳ tựa game MOBA thương mại nào. Giao diện đã tối ưu cho khung hình dọc 864x1536 để vừa màn hình điện thoại.',
  },
  {
    title: '2. Không dùng game để cá cược hay trao thưởng.',
    body: 'Game chỉ tính sát thương, phá nhà chính và xếp hạng Top 1, 2, 3 người đóng góp nhiều nhất mỗi trận cho vui, không có giải thưởng. Nếu bạn tự đặt thêm thưởng tiền, quà hay tổ chức bắt kèo thắng thua giữa Đội Đỏ và Đội Xanh, việc đó có thể bị coi là cờ bạc, cá cược hoặc trò chơi có thưởng trái phép theo luật, và bạn tự chịu hoàn toàn trách nhiệm.',
  },
  {
    title: '3. Tiền quà là thu nhập của bạn.',
    body: 'Quà người xem tặng để triệu hồi lính và rồng là thu nhập của người live. Việc kê khai, nộp thuế thì bạn tự tìm hiểu theo quy định hiện hành.',
  },
  {
    title: '4. Kết nối và giọng đọc dùng công cụ không chính thức.',
    body: 'Game nối vào phòng live (bắt comment, bắt quà) và tạo giọng đọc thông báo qua các công cụ bên ngoài, không phải công cụ chính thức của nền tảng hay của Microsoft, Google. Các công cụ này có thể ngừng chạy bất cứ lúc nào. Rủi ro với tài khoản của bạn (bị hạn chế, khoá tính năng live) bạn tự cân nhắc.',
  },
  {
    title: '5. Bộ lọc từ tục không bắt được hết.',
    body: 'Game chỉ nhận các từ khoá lệnh hợp lệ (1, 2, top, mid, adc, bac, upatk, downatk) và đã lọc tên hiển thị nhạy cảm, MC không bao giờ đọc nguyên văn comment tự do của người xem. Dù vậy người xem luôn nghĩ ra cách đặt tên lách luật, nên chủ kênh vẫn phải tự để mắt và chịu trách nhiệm về nội dung buổi live của mình.',
  },
  {
    title: '6. Thông số máu, sát thương và cấu hình quà tặng',
    body: '(Hoa hồng, Donut, Mũ, Corgi...) được đặt theo mức cân bằng mặc định, có thể chưa khớp với ý đồ phòng live của bạn. Muốn chỉnh lại sức mạnh lính hoặc đổi loại quà thì sửa trong src/game/unitConfig.ts.',
  },
  {
    title: '7. Dùng game là bạn tự trách nhiệm.',
    body: 'Game được chia sẻ nguyên trạng, không kèm cam kết gì. Tác giả không chịu trách nhiệm về thiệt hại hay rắc rối pháp lý phát sinh khi bạn sử dụng. Mấy điều trên là tự tìm hiểu, không phải tư vấn pháp lý. Ai live với mục đích kinh doanh thì nên hỏi luật sư.',
  },
];

