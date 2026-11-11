import {
  BOSS_CONFIG,
  GIFT_CATALOG,
  MATCH_CONFIG,
  STRUCTURE_CONFIG,
  UNIT_CONFIG,
  resolveGiftToUnit,
  type GiftOption,
  type Team,
  type UnitTier,
} from './unitConfig';
import { parseCommand, sanitizePlayerName } from './commandParser';
import {
  BASE_POSITIONS,
  BOSS_POSITIONS,
  MAP_SIZE,
  PORTAL_POSITIONS,
  TURRET_SPOTS,
  findNearestWaypointIndex,
  getDisplayLanePoints,
  getRouteWaypoints,
  type LaneRoute,
  type Point,
  type TacticalRoute,
} from './waypoints';
import { gameSfx, mcVoice } from '../services/liveConnector';

export interface PlayerProfile {
  key: string;
  name: string;
  avatar: string;
  team: Team;
  route: TacticalRoute;
  score: number;
  lastSpawnAt: number;
}

export interface TopContributor {
  key: string;
  name: string;
  avatar: string;
  score: number;
}

export interface FeedEntry {
  id: number;
  team: Team | 'neutral';
  icon: string;
  text: string;
}

export interface EngineSnapshot {
  redNexusPct: number;
  blueNexusPct: number;
  redTurretsAlive: number;
  blueTurretsAlive: number;
  redPlayerCount: number;
  bluePlayerCount: number;
  redTop3: TopContributor[];
  blueTop3: TopContributor[];
  redBuffs: { dragonRemainSec: number; baronRemainSec: number };
  blueBuffs: { dragonRemainSec: number; baronRemainSec: number };
  dragonBoss: { alive: boolean; hpPct: number; respawnSec: number };
  baronBoss: { alive: boolean; hpPct: number; respawnSec: number };
  matchTimeSec: number;
  winner: Team | null;
  victoryCountdownSec: number;
  latestBanner: FeedEntry | null;
  feed: FeedEntry[];
}

interface UnitEntity {
  id: number;
  team: Team;
  tier: UnitTier;
  ownerKey: string | null;
  ownerName: string;
  ownerAvatar: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  speed: number;
  range: number;
  detectRange: number;
  damage: number;
  attackCooldown: number;
  cooldownTimer: number;
  size: number;
  isFlying: boolean;
  route: TacticalRoute;
  waypoints: Point[];
  wpIndex: number;
  lateralOffset: number;
  wingPhase: number;
  attackFlash: number;
  hitFlash: number;
}

interface StructureEntity {
  id: string;
  team: Team;
  kind: 'outerTurret' | 'innerTurret' | 'nexus';
  lane: LaneRoute | 'base';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  range: number;
  damage: number;
  attackCooldown: number;
  cooldownTimer: number;
  size: number;
  alive: boolean;
  targetPos: Point | null;
  beamTimer: number;
  hitFlash: number;
}

interface BossEntity {
  id: 'dragon' | 'baron';
  code: 'DRAG' | 'BARON';
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  range: number;
  damage: number;
  attackCooldown: number;
  cooldownTimer: number;
  size: number;
  alive: boolean;
  respawnTimer: number;
  respawnSec: number;
  phase: number;
  hitFlash: number;
}

interface ProjectileEntity {
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  damage: number;
  splashRadius: number;
  team: Team;
  ownerKey: string | null;
  kind: 'arrow' | 'boneFire' | 'dragonBreath' | 'turret';
  targetId: string | number;
  targetKind: 'unit' | 'structure' | 'boss';
  alive: boolean;
}

interface PortalEffect {
  x: number;
  y: number;
  team: Team;
  name: string;
  avatar: string;
  unitLabel: string;
  color: string;
  age: number;
  duration: number;
}

interface ParticleEffect {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  age: number;
  duration: number;
  ring?: boolean;
}

interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  size: number;
  age: number;
  duration: number;
}

const LANE_CYCLE: LaneRoute[] = ['top', 'mid', 'bot'];

export class MobaEngine {
  private canvas: HTMLCanvasElement | null = null;
  private terrainCache: HTMLCanvasElement | null = null;
  private avatarCache = new Map<string, HTMLImageElement | 'loading' | 'failed'>();

  private rafId: number | null = null;
  private lastTime = 0;
  private elapsed = 0;
  private snapshotAccum = 0;
  private ambientTimer = 1.2;
  private seq = 1;
  private feedSeq = 1;
  private laneRoundRobin = 0;

  private players = new Map<string, PlayerProfile>();
  private units: UnitEntity[] = [];
  private structures: StructureEntity[] = [];
  private bosses: Record<'dragon' | 'baron', BossEntity> = {
    dragon: this.makeBoss('dragon'),
    baron: this.makeBoss('baron'),
  };
  private projectiles: ProjectileEntity[] = [];
  private portals: PortalEffect[] = [];
  private particles: ParticleEffect[] = [];
  private floatTexts: FloatingText[] = [];
  private feed: FeedEntry[] = [];
  private latestBanner: FeedEntry | null = null;
  private bannerClearAt = 0;

  private buffs: Record<Team, { dragonUntil: number; baronUntil: number }> = {
    red: { dragonUntil: 0, baronUntil: 0 },
    blue: { dragonUntil: 0, baronUntil: 0 },
  };

  private winner: Team | null = null;
  private victoryTimer = 0;
  private screenShake = 0;
  private nexusFlash = 0;

  private onSnapshot?: (snap: EngineSnapshot) => void;

  constructor(onSnapshot?: (snap: EngineSnapshot) => void) {
    this.onSnapshot = onSnapshot;
    this.resetMatch(false);
  }

  setSnapshotListener(fn: (snap: EngineSnapshot) => void): void {
    this.onSnapshot = fn;
    this.emitSnapshot();
  }

  attachCanvas(canvas: HTMLCanvasElement | null): void {
    this.canvas = canvas;
    if (canvas && !this.terrainCache) {
      this.terrainCache = this.buildTerrainCache();
    }
  }

  start(): void {
    if (this.rafId !== null) return;
    this.lastTime = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;
      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  resetMatch(announce = true): void {
    this.units = [];
    this.projectiles = [];
    this.portals = [];
    this.particles = [];
    this.floatTexts = [];
    this.elapsed = 0;
    this.ambientTimer = 0.8;
    this.winner = null;
    this.victoryTimer = 0;
    this.screenShake = 0;
    this.nexusFlash = 0;
    this.buffs = {
      red: { dragonUntil: 0, baronUntil: 0 },
      blue: { dragonUntil: 0, baronUntil: 0 },
    };

    // Giữ tên & phe người chơi đang theo dõi để trận mới tiếp tục mượt, chỉ reset điểm vòng
    for (const p of this.players.values()) {
      p.score = 0;
      p.lastSpawnAt = 0;
    }

    this.structures = [
      ...TURRET_SPOTS.map((spot) => {
        const spec = STRUCTURE_CONFIG[spot.kind];
        return {
          id: spot.id,
          team: spot.team,
          kind: spot.kind,
          lane: spot.lane,
          x: spot.x,
          y: spot.y,
          hp: spec.hp,
          maxHp: spec.hp,
          range: spec.range,
          damage: spec.damage,
          attackCooldown: spec.attackCooldown,
          cooldownTimer: 0,
          size: spec.size,
          alive: true,
          targetPos: null,
          beamTimer: 0,
          hitFlash: 0,
        } satisfies StructureEntity;
      }),
      ...(['red', 'blue'] as const).map((team) => {
        const spec = STRUCTURE_CONFIG.nexus;
        const pos = BASE_POSITIONS[team];
        return {
          id: `${team}-nexus`,
          team,
          kind: 'nexus' as const,
          lane: 'base' as const,
          x: pos.x,
          y: pos.y,
          hp: spec.hp,
          maxHp: spec.hp,
          range: spec.range,
          damage: spec.damage,
          attackCooldown: spec.attackCooldown,
          cooldownTimer: 0,
          size: spec.size,
          alive: true,
          targetPos: null,
          beamTimer: 0,
          hitFlash: 0,
        } satisfies StructureEntity;
      }),
    ];

    this.bosses = {
      dragon: this.makeBoss('dragon'),
      baron: this.makeBoss('baron'),
    };

    // Thả ngay đợt lính mở màn ở 3 đường để bản đồ sống động ngay lập tức
    this.spawnAmbientWave();
    if (announce) {
      this.pushFeed('neutral', '⚔️', 'Trận đấu mới bắt đầu! Gõ 1 vào Đỏ, 2 vào Xanh!');
    }
    this.emitSnapshot();
  }

  private makeBoss(id: 'dragon' | 'baron'): BossEntity {
    const spec = BOSS_CONFIG[id];
    const pos = BOSS_POSITIONS[id];
    return {
      id,
      code: spec.code,
      name: spec.name,
      x: pos.x,
      y: pos.y,
      hp: spec.hp,
      maxHp: spec.hp,
      range: spec.range,
      damage: spec.damage,
      attackCooldown: spec.attackCooldown,
      cooldownTimer: 0,
      size: spec.size,
      alive: true,
      respawnTimer: 0,
      respawnSec: spec.respawnSec,
      phase: Math.random() * Math.PI * 2,
      hitFlash: 0,
    };
  }

  /**
   * Xử lý comment từ TikTok LIVE hoặc Simulator Panel.
   */
  handleComment(rawUser: string, rawNickname: string, avatar: string, comment: string): boolean {
    const cmd = parseCommand(comment);
    if (!cmd) return false;

    const key = (rawUser || rawNickname || 'viewer').toLowerCase().trim();
    const safeName = sanitizePlayerName(rawNickname, rawUser);
    if (avatar) this.preloadAvatar(avatar);

    let player = this.players.get(key);
    const balancedTeam = (): Team => {
      const counts = this.teamCounts();
      return counts.red <= counts.blue ? 'red' : 'blue';
    };

    if (!player) {
      const initialTeam: Team =
        cmd.kind === 'join' || cmd.kind === 'joinAndRoute' ? cmd.team : balancedTeam();
      const initialLane: TacticalRoute =
        cmd.kind === 'route' || cmd.kind === 'joinAndRoute'
          ? cmd.route
          : LANE_CYCLE[this.laneRoundRobin++ % LANE_CYCLE.length];
      player = {
        key,
        name: safeName,
        avatar,
        team: initialTeam,
        route: initialLane,
        score: 0,
        lastSpawnAt: 0,
      };
      this.players.set(key, player);
    } else {
      player.name = safeName;
      if (avatar) player.avatar = avatar;
    }

    if (cmd.kind === 'join') {
      const switched = player.team !== cmd.team;
      player.team = cmd.team;
      this.redirectPlayerUnits(player, player.route);
      this.trySpawnCommentTroop(player);
      if (switched) {
        this.pushFeed(
          player.team,
          player.team === 'red' ? '🔴' : '🔵',
          `${player.name} gia nhập Đội ${player.team === 'red' ? 'Đỏ' : 'Xanh'}`,
        );
      }
      this.emitSnapshot();
      return true;
    }

    if (cmd.kind === 'joinAndRoute') {
      player.team = cmd.team;
      player.route = cmd.route;
      this.redirectPlayerUnits(player, cmd.route);
      this.trySpawnCommentTroop(player);
      this.pushFeed(
        player.team,
        '🧭',
        `${player.name} dẫn quân đi ${this.routeLabel(cmd.route)}`,
      );
      this.emitSnapshot();
      return true;
    }

    // cmd.kind === 'route'
    player.route = cmd.route;
    this.redirectPlayerUnits(player, cmd.route);
    this.trySpawnCommentTroop(player);
    this.pushFeed(
      player.team,
      cmd.route === 'bac' ? '🛡️' : cmd.route === 'upatk' || cmd.route === 'downatk' ? '🐉' : '⚔️',
      `${player.name} lệnh quân: ${this.routeLabel(cmd.route)}`,
    );
    this.emitSnapshot();
    return true;
  }

  /**
   * Xử lý tặng quà từ TikTok LIVE hoặc nút bấm Simulator Panel.
   */
  handleGift(
    rawUser: string,
    rawNickname: string,
    avatar: string,
    giftName: string,
    diamondCount: number,
    repeatCount = 1,
    forcedTeam?: Team,
  ): GiftOption {
    const option = resolveGiftToUnit(giftName, diamondCount);
    const key = (rawUser || rawNickname || 'viewer').toLowerCase().trim();
    const safeName = sanitizePlayerName(rawNickname, rawUser);
    if (avatar) this.preloadAvatar(avatar);

    let player = this.players.get(key);
    if (!player) {
      const counts = this.teamCounts();
      const team: Team = forcedTeam ?? (counts.red <= counts.blue ? 'red' : 'blue');
      player = {
        key,
        name: safeName,
        avatar,
        team,
        route: LANE_CYCLE[this.laneRoundRobin++ % LANE_CYCLE.length],
        score: 0,
        lastSpawnAt: 0,
      };
      this.players.set(key, player);
    } else {
      player.name = safeName;
      if (avatar) player.avatar = avatar;
      if (forcedTeam) player.team = forcedTeam;
    }

    const totalSpawns = Math.min(8, option.spawnCount * Math.max(1, repeatCount));
    const portalPt = PORTAL_POSITIONS[player.team];
    const spec = UNIT_CONFIG[option.tier];

    // Mở cổng không gian triệu hồi
    this.portals.push({
      x: portalPt.x + (Math.random() - 0.5) * 32,
      y: portalPt.y + (Math.random() - 0.5) * 32,
      team: player.team,
      name: player.name,
      avatar: player.avatar,
      unitLabel: spec.name,
      color: option.badgeColor,
      age: 0,
      duration: spec.isFlying ? 2.4 : 1.7,
    });

    for (let i = 0; i < totalSpawns; i++) {
      this.spawnUnit(player.team, option.tier, player.route, player);
    }

    player.score += spec.scoreValue * totalSpawns;

    const teamLabel = player.team === 'red' ? 'Đội Đỏ' : 'Đội Xanh';
    this.pushFeed(
      player.team,
      option.icon,
      `${player.name} thả ${option.giftName} triệu hồi ${totalSpawns > 1 ? `${totalSpawns}x ` : ''}${spec.name} (${teamLabel})`,
      true,
    );

    gameSfx.playPortal(spec.isFlying);
    if (spec.announceTier) {
      mcVoice.announceSummon(player.name, spec.name, teamLabel);
    }

    this.emitSnapshot();
    return option;
  }

  handleLike(rawUser: string, rawNickname: string, likeCount: number): void {
    const key = (rawUser || rawNickname || 'viewer').toLowerCase().trim();
    const player = this.players.get(key);
    if (!player) return;
    player.score += Math.max(1, Math.floor(likeCount / 4));
    if (likeCount >= 15) {
      this.spawnUnit(player.team, 'soldier', player.route, player);
    }
  }

  private routeLabel(route: TacticalRoute): string {
    switch (route) {
      case 'top':
        return 'Đường Trên (TOP)';
      case 'mid':
        return 'Đường Giữa (MID)';
      case 'bot':
        return 'Đường Dưới (ADC)';
      case 'bac':
        return 'Kéo quân thủ nhà (BAC)';
      case 'upatk':
        return 'Tập kích Hang Rồng (DRAG)';
      case 'downatk':
        return 'Tập kích Hang Baron';
    }
  }

  private trySpawnCommentTroop(player: PlayerProfile): void {
    const now = performance.now();
    if (now - player.lastSpawnAt < MATCH_CONFIG.commentSpawnCooldownMs) return;
    player.lastSpawnAt = now;
    player.score += 6;
    this.spawnUnit(player.team, 'soldier', player.route, player);
  }

  private redirectPlayerUnits(player: PlayerProfile, route: TacticalRoute): void {
    const waypoints = getRouteWaypoints(player.team, route);
    for (const u of this.units) {
      if (u.ownerKey === player.key && u.team === player.team) {
        u.route = route;
        u.waypoints = waypoints;
        u.wpIndex = findNearestWaypointIndex(u, waypoints);
      }
    }
  }

  private spawnAmbientWave(): void {
    for (const team of ['red', 'blue'] as const) {
      for (const lane of LANE_CYCLE) {
        this.spawnUnit(team, 'soldier', lane, null);
        this.spawnUnit(team, 'archer', lane, null);
      }
    }
  }

  private spawnUnit(
    team: Team,
    tier: UnitTier,
    route: TacticalRoute,
    owner: PlayerProfile | null,
  ): void {
    if (this.winner) return;
    if (this.units.length >= MATCH_CONFIG.maxActiveUnits) {
      // Ưu tiên giữ lại rồng và đơn vị cấp cao
      const dropIdx = this.units.findIndex((u) => u.tier === 'soldier' && !u.ownerKey);
      if (dropIdx >= 0) this.units.splice(dropIdx, 1);
      else return;
    }

    const spec = UNIT_CONFIG[tier];
    const base = BASE_POSITIONS[team];
    const spawnRadius = owner && spec.announceTier ? PORTAL_POSITIONS[team] : base;
    const jitterAngle = Math.random() * Math.PI * 2;
    const jitterDist = 12 + Math.random() * 20;

    this.units.push({
      id: this.seq++,
      team,
      tier,
      ownerKey: owner?.key ?? null,
      ownerName: owner?.name ?? '',
      ownerAvatar: owner?.avatar ?? '',
      x: spawnRadius.x + Math.cos(jitterAngle) * jitterDist,
      y: spawnRadius.y + Math.sin(jitterAngle) * jitterDist,
      vx: 0,
      vy: 0,
      angle: team === 'red' ? -Math.PI / 4 : (3 * Math.PI) / 4,
      hp: spec.hp,
      maxHp: spec.hp,
      speed: spec.speed,
      range: spec.range,
      detectRange: spec.detectRange,
      damage: spec.damage,
      attackCooldown: spec.attackCooldown,
      cooldownTimer: Math.random() * 0.25,
      size: spec.size,
      isFlying: spec.isFlying,
      route,
      waypoints: getRouteWaypoints(team, route),
      wpIndex: 1,
      lateralOffset: (Math.random() - 0.5) * 26,
      wingPhase: Math.random() * Math.PI * 2,
      attackFlash: 0,
      hitFlash: 0,
    });
  }

  // ---------- VÒNG LẶP CẬP NHẬT 60FPS ----------
  private update(dt: number): void {
    this.elapsed += dt;
    this.screenShake = Math.max(0, this.screenShake - dt * 28);
    this.nexusFlash = Math.max(0, this.nexusFlash - dt * 1.4);

    if (this.latestBanner && this.elapsed > this.bannerClearAt) {
      this.latestBanner = null;
    }

    if (this.winner) {
      this.victoryTimer -= dt;
      this.updateEffects(dt);
      this.snapshotAccum += dt;
      if (this.snapshotAccum >= 0.15) {
        this.snapshotAccum = 0;
        this.emitSnapshot();
      }
      if (this.victoryTimer <= 0) {
        this.resetMatch(true);
      }
      return;
    }

    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0) {
      this.ambientTimer = MATCH_CONFIG.ambientWaveIntervalSec;
      this.spawnAmbientWave();
    }

    // Cập nhật hồi sinh boss
    for (const key of ['dragon', 'baron'] as const) {
      const b = this.bosses[key];
      b.phase += dt * 3;
      b.hitFlash = Math.max(0, b.hitFlash - dt * 5);
      if (!b.alive) {
        b.respawnTimer -= dt;
        if (b.respawnTimer <= 0) {
          b.alive = true;
          b.hp = b.maxHp;
          this.pushFeed('neutral', key === 'dragon' ? '🔥' : '👾', `${b.name} đã tái xuất hiện trên sông!`);
        }
      } else {
        this.updateBossCombat(b, dt);
      }
    }

    this.updateUnits(dt);
    this.updateStructures(dt);
    this.updateProjectiles(dt);
    this.updateEffects(dt);

    // Kiểm tra điều kiện phá Nhà Chính
    const redNexus = this.structures.find((s) => s.id === 'red-nexus');
    const blueNexus = this.structures.find((s) => s.id === 'blue-nexus');
    if (redNexus && !redNexus.alive) {
      this.triggerVictory('blue', redNexus);
    } else if (blueNexus && !blueNexus.alive) {
      this.triggerVictory('red', blueNexus);
    }

    this.snapshotAccum += dt;
    if (this.snapshotAccum >= 0.12) {
      this.snapshotAccum = 0;
      this.emitSnapshot();
    }
  }

  private teamAtkMultiplier(team: Team): number {
    let mult = 1;
    if (this.elapsed < this.buffs[team].dragonUntil) mult *= BOSS_CONFIG.dragon.atkMultiplier;
    if (this.elapsed < this.buffs[team].baronUntil) mult *= BOSS_CONFIG.baron.atkMultiplier;
    return mult;
  }

  private teamSpeedMultiplier(team: Team): number {
    let mult = 1;
    if (this.elapsed < this.buffs[team].dragonUntil) mult *= BOSS_CONFIG.dragon.speedMultiplier;
    if (this.elapsed < this.buffs[team].baronUntil) mult *= BOSS_CONFIG.baron.speedMultiplier;
    return mult;
  }

  private updateUnits(dt: number): void {
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      if (u.hp <= 0) {
        this.spawnDeathParticles(u.x, u.y, u.team, u.size);
        this.units.splice(i, 1);
        continue;
      }

      u.wingPhase += dt * (u.tier === 'eagleDragonLord' ? 7.5 : 9.2);
      u.cooldownTimer = Math.max(0, u.cooldownTimer - dt);
      u.attackFlash = Math.max(0, u.attackFlash - dt * 4);
      u.hitFlash = Math.max(0, u.hitFlash - dt * 5);

      const target = this.findTargetForUnit(u);
      if (target) {
        const dx = target.x - u.x;
        const dy = target.y - u.y;
        const dist = Math.hypot(dx, dy);
        const reach = u.range + target.radius;
        u.angle = Math.atan2(dy, dx);

        if (dist <= reach) {
          if (u.cooldownTimer <= 0) {
            u.cooldownTimer = u.attackCooldown;
            u.attackFlash = 1;
            const dmg = u.damage * this.teamAtkMultiplier(u.team);
            this.performUnitAttack(u, target, dmg);
          }
          continue;
        }

        // Tiến lại gần mục tiêu
        const spd = u.speed * this.teamSpeedMultiplier(u.team);
        u.x += (dx / dist) * spd * dt;
        u.y += (dy / dist) * spd * dt;
        continue;
      }

      // Di chuyển theo waypoint
      const wp = u.waypoints[u.wpIndex] ?? u.waypoints[u.waypoints.length - 1];
      if (!wp) continue;
      const targetX = wp.x + (u.route === 'bac' ? u.lateralOffset : u.lateralOffset * 0.45);
      const targetY = wp.y + (u.route === 'bac' ? -u.lateralOffset : u.lateralOffset * 0.45);
      const dx = targetX - u.x;
      const dy = targetY - u.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 16) {
        if (u.wpIndex < u.waypoints.length - 1) {
          u.wpIndex++;
        } else if (u.route === 'bac') {
          // Đứng gác quanh nhà chính
          u.angle = u.team === 'red' ? -Math.PI / 4 : (3 * Math.PI) / 4;
        }
      } else {
        const spd = u.speed * this.teamSpeedMultiplier(u.team);
        u.vx = (dx / dist) * spd;
        u.vy = (dy / dist) * spd;
        u.x += u.vx * dt;
        u.y += u.vy * dt;
        u.angle = Math.atan2(dy, dx);
      }
    }
  }

  private findTargetForUnit(
    u: UnitEntity,
  ): { kind: 'unit' | 'structure' | 'boss'; id: string | number; x: number; y: number; radius: number } | null {
    // Nếu đang thực hiện lệnh ăn Boss, ưu tiên đánh Boss khi tới gần hang
    if (u.route === 'upatk' || u.route === 'downatk') {
      const boss = u.route === 'upatk' ? this.bosses.dragon : this.bosses.baron;
      if (boss.alive) {
        const d = Math.hypot(boss.x - u.x, boss.y - u.y);
        if (d <= Math.max(u.detectRange, 190)) {
          return { kind: 'boss', id: boss.id, x: boss.x, y: boss.y, radius: boss.size * 0.8 };
        }
      }
    }

    let best: { kind: 'unit' | 'structure' | 'boss'; id: string | number; x: number; y: number; radius: number } | null = null;
    let bestDist = u.detectRange;

    for (const other of this.units) {
      if (other.team === u.team || other.hp <= 0) continue;
      const d = Math.hypot(other.x - u.x, other.y - u.y) - other.size;
      if (d < bestDist) {
        bestDist = d;
        best = { kind: 'unit', id: other.id, x: other.x, y: other.y, radius: other.size };
      }
    }

    if (best) return best;

    for (const s of this.structures) {
      if (!s.alive || s.team === u.team) continue;
      const d = Math.hypot(s.x - u.x, s.y - u.y) - s.size;
      if (d < bestDist + 20) {
        bestDist = d;
        best = { kind: 'structure', id: s.id, x: s.x, y: s.y, radius: s.size };
      }
    }

    return best;
  }

  private performUnitAttack(
    u: UnitEntity,
    target: { kind: 'unit' | 'structure' | 'boss'; id: string | number; x: number; y: number; radius: number },
    damage: number,
  ): void {
    const spec = UNIT_CONFIG[u.tier];
    if (spec.projectile) {
      this.projectiles.push({
        x: u.x,
        y: u.y,
        tx: target.x,
        ty: target.y,
        speed: spec.projectileSpeed,
        damage,
        splashRadius: spec.splashRadius,
        team: u.team,
        ownerKey: u.ownerKey,
        kind: spec.projectile,
        targetId: target.id,
        targetKind: target.kind,
        alive: true,
      });
      return;
    }

    // Đánh cận chiến + lan (nếu là Kỵ Sĩ Rồng)
    this.applyDamage(target.kind, target.id, damage, u.team, u.ownerKey);
    if (spec.splashRadius > 0) {
      for (const other of this.units) {
        if (other.team === u.team || other.hp <= 0) continue;
        if (target.kind === 'unit' && other.id === target.id) continue;
        if (Math.hypot(other.x - target.x, other.y - target.y) <= spec.splashRadius) {
          this.applyDamage('unit', other.id, damage * 0.55, u.team, u.ownerKey);
        }
      }
    }
    this.particles.push({
      x: target.x,
      y: target.y,
      vx: 0,
      vy: 0,
      radius: spec.splashRadius > 0 ? 22 : 10,
      color: u.team === 'red' ? '#fb7185' : '#38bdf8',
      age: 0,
      duration: 0.22,
      ring: true,
    });
  }

  private updateStructures(dt: number): void {
    for (const s of this.structures) {
      if (!s.alive) continue;
      s.cooldownTimer = Math.max(0, s.cooldownTimer - dt);
      s.beamTimer = Math.max(0, s.beamTimer - dt);
      s.hitFlash = Math.max(0, s.hitFlash - dt * 5);

      let nearest: UnitEntity | null = null;
      let nearestDist = s.range;
      for (const u of this.units) {
        if (u.team === s.team || u.hp <= 0) continue;
        const d = Math.hypot(u.x - s.x, u.y - s.y);
        if (d <= nearestDist) {
          nearestDist = d;
          nearest = u;
        }
      }

      if (nearest) {
        s.targetPos = { x: nearest.x, y: nearest.y };
        if (s.cooldownTimer <= 0) {
          s.cooldownTimer = s.attackCooldown;
          s.beamTimer = 0.2;
          this.projectiles.push({
            x: s.x,
            y: s.y - 12,
            tx: nearest.x,
            ty: nearest.y,
            speed: 410,
            damage: s.damage,
            splashRadius: 0,
            team: s.team,
            ownerKey: null,
            kind: 'turret',
            targetId: nearest.id,
            targetKind: 'unit',
            alive: true,
          });
        }
      } else {
        s.targetPos = null;
      }
    }
  }

  private updateBossCombat(b: BossEntity, dt: number): void {
    b.cooldownTimer = Math.max(0, b.cooldownTimer - dt);
    let nearest: UnitEntity | null = null;
    let bestD = b.range;
    for (const u of this.units) {
      if (u.hp <= 0) continue;
      const d = Math.hypot(u.x - b.x, u.y - b.y);
      if (d <= bestD) {
        bestD = d;
        nearest = u;
      }
    }
    if (nearest && b.cooldownTimer <= 0) {
      b.cooldownTimer = b.attackCooldown;
      nearest.hp -= b.damage;
      nearest.hitFlash = 1;
      this.particles.push({
        x: nearest.x,
        y: nearest.y,
        vx: 0,
        vy: 0,
        radius: 18,
        color: b.id === 'dragon' ? '#fb923c' : '#c084fc',
        age: 0,
        duration: 0.25,
        ring: true,
      });
    }
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.alive) {
        this.projectiles.splice(i, 1);
        continue;
      }

      const liveTarget = this.resolveTargetPosition(p.targetKind, p.targetId);
      if (liveTarget) {
        p.tx = liveTarget.x;
        p.ty = liveTarget.y;
      }

      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const dist = Math.hypot(dx, dy);
      const step = p.speed * dt;

      if (dist <= step + 8) {
        this.applyDamage(p.targetKind, p.targetId, p.damage, p.team, p.ownerKey);
        if (p.splashRadius > 0) {
          for (const other of this.units) {
            if (other.team === p.team || other.hp <= 0) continue;
            if (p.targetKind === 'unit' && other.id === p.targetId) continue;
            if (Math.hypot(other.x - p.tx, other.y - p.ty) <= p.splashRadius) {
              this.applyDamage('unit', other.id, p.damage * 0.5, p.team, p.ownerKey);
            }
          }
          this.particles.push({
            x: p.tx,
            y: p.ty,
            vx: 0,
            vy: 0,
            radius: p.splashRadius,
            color: p.kind === 'dragonBreath' ? '#f59e0b' : '#a855f7',
            age: 0,
            duration: 0.28,
            ring: true,
          });
        }
        this.projectiles.splice(i, 1);
      } else {
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
      }
    }
  }

  private resolveTargetPosition(kind: 'unit' | 'structure' | 'boss', id: string | number): Point | null {
    if (kind === 'unit') {
      const u = this.units.find((x) => x.id === id && x.hp > 0);
      return u ? { x: u.x, y: u.y } : null;
    }
    if (kind === 'structure') {
      const s = this.structures.find((x) => x.id === id && x.alive);
      return s ? { x: s.x, y: s.y } : null;
    }
    const b = this.bosses[id as 'dragon' | 'baron'];
    return b && b.alive ? { x: b.x, y: b.y } : null;
  }

  private applyDamage(
    kind: 'unit' | 'structure' | 'boss',
    id: string | number,
    damage: number,
    attackerTeam: Team,
    ownerKey: string | null,
  ): void {
    const owner = ownerKey ? this.players.get(ownerKey) : undefined;

    if (kind === 'unit') {
      const u = this.units.find((x) => x.id === id);
      if (!u || u.hp <= 0) return;
      u.hp -= damage;
      u.hitFlash = 1;
      if (owner) owner.score += Math.round(damage * 0.15 + (u.hp <= 0 ? 18 : 0));
      return;
    }

    if (kind === 'structure') {
      const s = this.structures.find((x) => x.id === id);
      if (!s || !s.alive) return;
      s.hp = Math.max(0, s.hp - damage);
      s.hitFlash = 1;
      if (owner) owner.score += Math.round(damage * 0.28);
      if (s.hp <= 0) {
        s.alive = false;
        if (owner) owner.score += 180;
        this.screenShake = Math.max(this.screenShake, 10);
        this.spawnExplosion(s.x, s.y, s.team === 'red' ? '#f87171' : '#60a5fa', 28);
        if (s.kind !== 'nexus') {
          this.pushFeed(
            attackerTeam,
            '💥',
            `Đội ${attackerTeam === 'red' ? 'Đỏ' : 'Xanh'} phá hủy ${STRUCTURE_CONFIG[s.kind].name}!`,
            true,
          );
        }
      }
      return;
    }

    const b = this.bosses[id as 'dragon' | 'baron'];
    if (!b || !b.alive) return;
    b.hp = Math.max(0, b.hp - damage);
    b.hitFlash = 1;
    if (owner) owner.score += Math.round(damage * 0.25);

    if (b.hp <= 0) {
      b.alive = false;
      b.respawnTimer = b.respawnSec;
      const spec = BOSS_CONFIG[b.id];
      if (b.id === 'dragon') {
        this.buffs[attackerTeam].dragonUntil = this.elapsed + spec.buffDurationSec;
      } else {
        this.buffs[attackerTeam].baronUntil = this.elapsed + spec.buffDurationSec;
      }
      if (owner) owner.score += spec.killScore;

      const teamName = attackerTeam === 'red' ? 'Đội Đỏ' : 'Đội Xanh';
      this.spawnExplosion(b.x, b.y, b.id === 'dragon' ? '#fb923c' : '#c084fc', 36);
      this.floatTexts.push({
        x: b.x,
        y: b.y - 24,
        vy: -24,
        text: `${teamName} ĂN ${b.code}! +ATK`,
        color: '#fde047',
        size: 20,
        age: 0,
        duration: 2.3,
      });
      this.pushFeed(attackerTeam, b.id === 'dragon' ? '🐉' : '👑', `${teamName} hạ gục ${b.name}! Toàn quân tăng sát thương!`, true);
      mcVoice.speak(`${teamName} vừa hạ gục ${b.id === 'dragon' ? 'Rồng Cổ Đại' : 'Baron'}! Toàn quân nhận bùa lợi tăng sát thương!`, true);
    }
  }

  private triggerVictory(winningTeam: Team, fallenNexus: StructureEntity): void {
    this.winner = winningTeam;
    this.victoryTimer = MATCH_CONFIG.victoryResetDelaySec;
    this.screenShake = 26;
    this.nexusFlash = 1;
    this.spawnExplosion(fallenNexus.x, fallenNexus.y, '#fbbf24', 75);
    gameSfx.playExplosion();

    const teamLabel = winningTeam === 'red' ? 'Đội Đỏ' : 'Đội Xanh';
    this.pushFeed(winningTeam, '🏆', `CHIẾN THẮNG! ${teamLabel} đã phá hủy Nhà Chính!`, true);
    mcVoice.speak(`Chúc mừng ${teamLabel} đã phá hủy Nhà Chính và giành chiến thắng chung cuộc!`, true);
    this.emitSnapshot();
  }

  private spawnExplosion(x: number, y: number, color: string, count: number): void {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      radius: 95,
      color,
      age: 0,
      duration: 0.65,
      ring: true,
    });
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 210;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: 2.5 + Math.random() * 5,
        color: i % 3 === 0 ? '#fef08a' : color,
        age: 0,
        duration: 0.45 + Math.random() * 0.55,
      });
    }
  }

  private spawnDeathParticles(x: number, y: number, team: Team, size: number): void {
    const count = size > 20 ? 18 : 6;
    const color = team === 'red' ? '#f87171' : '#60a5fa';
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 25 + Math.random() * 75;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        radius: 2 + Math.random() * 2.5,
        color,
        age: 0,
        duration: 0.35 + Math.random() * 0.25,
      });
    }
  }

  private updateEffects(dt: number): void {
    for (let i = this.portals.length - 1; i >= 0; i--) {
      this.portals[i].age += dt;
      if (this.portals[i].age >= this.portals[i].duration) {
        this.portals.splice(i, 1);
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      if (p.age >= p.duration) {
        this.particles.splice(i, 1);
      }
    }
    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const f = this.floatTexts[i];
      f.age += dt;
      f.y += f.vy * dt;
      if (f.age >= f.duration) {
        this.floatTexts.splice(i, 1);
      }
    }
  }

  private pushFeed(team: Team | 'neutral', icon: string, text: string, showBanner = false): void {
    const entry: FeedEntry = { id: this.feedSeq++, team, icon, text };
    this.feed = [entry, ...this.feed].slice(0, 6);
    if (showBanner) {
      this.latestBanner = entry;
      this.bannerClearAt = this.elapsed + 3.4;
    }
  }

  private teamCounts(): { red: number; blue: number } {
    let red = 0;
    let blue = 0;
    for (const p of this.players.values()) {
      if (p.team === 'red') red++;
      else blue++;
    }
    return { red, blue };
  }

  private topContributors(team: Team): TopContributor[] {
    return [...this.players.values()]
      .filter((p) => p.team === team)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((p) => ({
        key: p.key,
        name: p.name,
        avatar: p.avatar,
        score: p.score,
      }));
  }

  private emitSnapshot(): void {
    if (!this.onSnapshot) return;
    const redNexus = this.structures.find((s) => s.id === 'red-nexus');
    const blueNexus = this.structures.find((s) => s.id === 'blue-nexus');
    const counts = this.teamCounts();

    this.onSnapshot({
      redNexusPct: redNexus ? (redNexus.hp / redNexus.maxHp) * 100 : 0,
      blueNexusPct: blueNexus ? (blueNexus.hp / blueNexus.maxHp) * 100 : 0,
      redTurretsAlive: this.structures.filter((s) => s.team === 'red' && s.kind !== 'nexus' && s.alive).length,
      blueTurretsAlive: this.structures.filter((s) => s.team === 'blue' && s.kind !== 'nexus' && s.alive).length,
      redPlayerCount: counts.red,
      bluePlayerCount: counts.blue,
      redTop3: this.topContributors('red'),
      blueTop3: this.topContributors('blue'),
      redBuffs: {
        dragonRemainSec: Math.max(0, Math.ceil(this.buffs.red.dragonUntil - this.elapsed)),
        baronRemainSec: Math.max(0, Math.ceil(this.buffs.red.baronUntil - this.elapsed)),
      },
      blueBuffs: {
        dragonRemainSec: Math.max(0, Math.ceil(this.buffs.blue.dragonUntil - this.elapsed)),
        baronRemainSec: Math.max(0, Math.ceil(this.buffs.blue.baronUntil - this.elapsed)),
      },
      dragonBoss: {
        alive: this.bosses.dragon.alive,
        hpPct: (this.bosses.dragon.hp / this.bosses.dragon.maxHp) * 100,
        respawnSec: Math.max(0, Math.ceil(this.bosses.dragon.respawnTimer)),
      },
      baronBoss: {
        alive: this.bosses.baron.alive,
        hpPct: (this.bosses.baron.hp / this.bosses.baron.maxHp) * 100,
        respawnSec: Math.max(0, Math.ceil(this.bosses.baron.respawnTimer)),
      },
      matchTimeSec: Math.floor(this.elapsed),
      winner: this.winner,
      victoryCountdownSec: Math.max(0, Math.ceil(this.victoryTimer)),
      latestBanner: this.latestBanner,
      feed: this.feed,
    });
  }

  private preloadAvatar(url: string): void {
    if (!url || this.avatarCache.has(url)) return;
    this.avatarCache.set(url, 'loading');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => this.avatarCache.set(url, img);
    img.onerror = () => this.avatarCache.set(url, 'failed');
    img.src = url;
  }

  // ---------- RENDER CANVAS ----------
  private buildTerrainCache(): HTMLCanvasElement {
    const off = document.createElement('canvas');
    off.width = MAP_SIZE;
    off.height = MAP_SIZE;
    const ctx = off.getContext('2d');
    if (!ctx) return off;

    // Nền rừng chiến thuật tối sang
    const bgGrad = ctx.createLinearGradient(0, MAP_SIZE, MAP_SIZE, 0);
    bgGrad.addColorStop(0, '#170f15');
    bgGrad.addColorStop(0.5, '#0c1c1a');
    bgGrad.addColorStop(1, '#0e1726');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

    // Lưới chiến thuật tinh tế
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let g = 100; g < MAP_SIZE; g += 100) {
      ctx.beginPath();
      ctx.moveTo(g, 0);
      ctx.lineTo(g, MAP_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, g);
      ctx.lineTo(MAP_SIZE, g);
      ctx.stroke();
    }

    // Các cụm rừng tối + tán lá
    const jungleSpots: [number, number, number][] = [
      [255, 255, 58],
      [265, 540, 56],
      [495, 745, 58],
      [745, 745, 58],
      [735, 460, 56],
      [505, 255, 58],
      [355, 465, 40],
      [645, 535, 40],
    ];
    for (const [jx, jy, jr] of jungleSpots) {
      const grad = ctx.createRadialGradient(jx, jy, 6, jx, jy, jr);
      grad.addColorStop(0, '#1a382c');
      grad.addColorStop(1, 'rgba(13, 30, 24, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(jx, jy, jr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sông chéo ở giữa (từ trên-trái 0,0 tới dưới-phải 1000,1000)
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#092d3b';
    ctx.lineWidth = 96;
    ctx.beginPath();
    ctx.moveTo(-20, -20);
    ctx.lineTo(MAP_SIZE + 20, MAP_SIZE + 20);
    ctx.stroke();

    ctx.strokeStyle = '#0e4e63';
    ctx.lineWidth = 74;
    ctx.beginPath();
    ctx.moveTo(-20, -20);
    ctx.lineTo(MAP_SIZE + 20, MAP_SIZE + 20);
    ctx.stroke();
    ctx.restore();

    // Hốc Hang Rồng (nửa trên sông) & Hang Baron (nửa dưới sông)
    const drawPit = (pt: Point, rimColor: string, fillColor: string) => {
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 64, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = rimColor;
      ctx.lineWidth = 4;
      ctx.stroke();
    };
    drawPit(BOSS_POSITIONS.dragon, 'rgba(251, 146, 60, 0.72)', 'rgba(67, 20, 7, 0.78)');
    drawPit(BOSS_POSITIONS.baron, 'rgba(192, 132, 252, 0.72)', 'rgba(46, 16, 101, 0.8)');

    // 3 làn đường đá lát (TOP, MID, BOT)
    const lanes: LaneRoute[] = ['top', 'mid', 'bot'];
    for (const lane of lanes) {
      const pts = getDisplayLanePoints(lane);
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // Viền đá tối ngoài đường
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 66;
      ctx.beginPath();
      pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();

      // Mặt đường đá sáng
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 52;
      ctx.beginPath();
      pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();

      // Vạch kẻ trung tâm tinh tế
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.14)';
      ctx.lineWidth = 2;
      ctx.setLineDash([14, 16]);
      ctx.beginPath();
      pts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      ctx.restore();
    }

    // Nhãn 3 đường
    ctx.font = '800 18px "Be Vietnam Pro", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(253, 224, 71, 0.45)';
    ctx.fillText('TOP', 110, 295);
    ctx.fillText('MID', 500, 500);
    ctx.fillText('BOT / ADC', 715, 880);

    // Nền căn cứ Đỏ (dưới-trái) & Xanh (trên-phải)
    const drawCitadel = (pt: Point, color1: string, color2: string) => {
      const grad = ctx.createRadialGradient(pt.x, pt.y, 12, pt.x, pt.y, 138);
      grad.addColorStop(0, color1);
      grad.addColorStop(0.65, color2);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 138, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = color1;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 92, 0, Math.PI * 2);
      ctx.stroke();
    };
    drawCitadel(BASE_POSITIONS.red, 'rgba(239, 68, 68, 0.45)', 'rgba(127, 29, 29, 0.25)');
    drawCitadel(BASE_POSITIONS.blue, 'rgba(59, 130, 246, 0.45)', 'rgba(30, 58, 138, 0.25)');

    return off;
  }

  private render(): void {
    const canvas = this.canvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth || 816;
    const cssH = canvas.clientHeight || 816;
    const targetW = Math.round(cssW * dpr);
    const targetH = Math.round(cssH * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    const scale = targetW / MAP_SIZE;
    ctx.scale(scale, scale);

    if (this.screenShake > 0.2) {
      ctx.translate(
        (Math.random() - 0.5) * this.screenShake,
        (Math.random() - 0.5) * this.screenShake,
      );
    }

    if (this.terrainCache) {
      ctx.drawImage(this.terrainCache, 0, 0);
    }

    this.drawRiverAnimation(ctx);
    this.drawBosses(ctx);
    this.drawStructures(ctx);
    this.drawPortals(ctx);

    // Sắp xếp unit mặt đất trước, rồng bay sau để đổ bóng đúng tầng
    const groundUnits = this.units.filter((u) => !u.isFlying);
    const flyingUnits = this.units.filter((u) => u.isFlying);
    for (const u of groundUnits) this.drawUnit(ctx, u);
    for (const u of flyingUnits) this.drawUnit(ctx, u);

    this.drawProjectiles(ctx);
    this.drawParticles(ctx);
    this.drawFloatingTexts(ctx);

    if (this.nexusFlash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.nexusFlash * 0.42})`;
      ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
    }

    if (this.winner) {
      this.drawVictoryBanner(ctx);
    }

    ctx.restore();
  }

  private drawRiverAnimation(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.24)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    const offset = (this.elapsed * 38) % 60;
    for (let d = -60 + offset; d < MAP_SIZE + 60; d += 60) {
      ctx.beginPath();
      ctx.moveTo(d - 16, d + 16);
      ctx.lineTo(d + 10, d - 10);
      ctx.stroke();
    }

    // Nhãn Hang Rồng (DRAG) nửa trên sông & Hang Baron (BARON) nửa dưới sông
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 18px "Cinzel", serif';
    ctx.fillStyle = '#fdba74';
    ctx.fillText('DRAG', BOSS_POSITIONS.dragon.x, BOSS_POSITIONS.dragon.y + 48);

    ctx.fillStyle = '#d8b4fe';
    ctx.fillText('BARON', BOSS_POSITIONS.baron.x, BOSS_POSITIONS.baron.y + 52);
    ctx.restore();
  }

  private drawBosses(ctx: CanvasRenderingContext2D): void {
    for (const b of [this.bosses.dragon, this.bosses.baron]) {
      ctx.save();
      ctx.translate(b.x, b.y);

      if (!b.alive) {
        ctx.strokeStyle = b.id === 'dragon' ? 'rgba(251, 146, 60, 0.45)' : 'rgba(192, 132, 252, 0.45)';
        ctx.lineWidth = 3;
        const pct = 1 - b.respawnTimer / b.respawnSec;
        ctx.beginPath();
        ctx.arc(0, 0, 26, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '700 14px "Be Vietnam Pro", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.ceil(b.respawnTimer)}s`, 0, 0);
        ctx.restore();
        continue;
      }

      const hover = Math.sin(b.phase) * 3;
      const wingFlap = Math.sin(b.phase * 2.1);

      // Bóng dưới boss
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.beginPath();
      ctx.ellipse(0, 14, 24, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(0, hover);
      if (b.id === 'dragon') {
        // Cánh Rồng Lửa DRAG
        ctx.fillStyle = b.hitFlash > 0 ? '#ffffff' : '#ea580c';
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(0, -4);
          ctx.quadraticCurveTo(side * 24, -22 + wingFlap * 11, side * 34, -2 + wingFlap * 14);
          ctx.quadraticCurveTo(side * 16, 10, 0, 6);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = b.hitFlash > 0 ? '#fef08a' : '#fb923c';
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(-5, -4, 3, 0, Math.PI * 2);
        ctx.arc(5, -4, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Baron Tối Thượng
        ctx.fillStyle = b.hitFlash > 0 ? '#ffffff' : '#7e22ce';
        for (let t = -1; t <= 1; t++) {
          ctx.beginPath();
          ctx.moveTo(t * 9, 4);
          ctx.quadraticCurveTo(t * 22, -16 + wingFlap * 8, t * 28, -24 + wingFlap * 10);
          ctx.lineTo(t * 14, 8);
          ctx.fill();
        }
        ctx.fillStyle = b.hitFlash > 0 ? '#f3e8ff' : '#a855f7';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(-6, -3, 3, 0, Math.PI * 2);
        ctx.arc(6, -3, 3, 0, Math.PI * 2);
        ctx.arc(0, -8, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Thanh máu Boss
      this.drawHpBar(ctx, 0, -28, 62, 7, b.hp / b.maxHp, b.id === 'dragon' ? '#fb923c' : '#c084fc');
      ctx.restore();
    }
  }

  private drawStructures(ctx: CanvasRenderingContext2D): void {
    for (const s of this.structures) {
      ctx.save();
      ctx.translate(s.x, s.y);

      if (!s.alive) {
        // Bệ trụ vỡ
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.beginPath();
        ctx.arc(0, 0, s.size * 0.72, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        continue;
      }

      const mainColor = s.team === 'red' ? '#ef4444' : '#3b82f6';
      const glowColor = s.team === 'red' ? '#fca5a5' : '#93c5fd';

      if (s.targetPos) {
        ctx.strokeStyle = s.team === 'red' ? 'rgba(239,68,68,0.16)' : 'rgba(59,130,246,0.16)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, s.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (s.kind === 'nexus') {
        // Vòng sáng Nhà Chính
        const pulse = 1 + Math.sin(this.elapsed * 3.5) * 0.06;
        ctx.fillStyle = s.team === 'red' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(59, 130, 246, 0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, s.size * 1.15 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Đế lục giác
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3.5;
        this.polygonPath(ctx, 6, s.size * 0.92);
        ctx.fill();
        ctx.stroke();

        // Tinh thể Nhà Chính
        ctx.fillStyle = s.hitFlash > 0 ? '#ffffff' : mainColor;
        this.polygonPath(ctx, 4, s.size * 0.62, this.elapsed * 0.8);
        ctx.fill();

        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.arc(0, 0, s.size * 0.25, 0, Math.PI * 2);
        ctx.fill();

        // Thanh máu Nhà Chính có số % chính xác (vd 100.00%)
        const pct = (s.hp / s.maxHp) * 100;
        const barY = s.team === 'red' ? -56 : 56;
        this.drawHpBar(ctx, 0, barY, 106, 12, s.hp / s.maxHp, mainColor);
        ctx.font = '800 12px "Be Vietnam Pro", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${pct.toFixed(2)}%`, 0, barY);
      } else {
        // Trụ bảo vệ
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = 3;
        this.polygonPath(ctx, 6, s.size);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = s.hitFlash > 0 ? '#ffffff' : glowColor;
        ctx.beginPath();
        ctx.arc(0, 0, s.size * 0.44, 0, Math.PI * 2);
        ctx.fill();

        this.drawHpBar(ctx, 0, -s.size - 10, 44, 5.5, s.hp / s.maxHp, mainColor);
      }

      if (s.beamTimer > 0 && s.targetPos) {
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(s.targetPos.x - s.x, s.targetPos.y - s.y);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private drawPortals(ctx: CanvasRenderingContext2D): void {
    for (const p of this.portals) {
      const t = p.age / p.duration;
      const alpha = t < 0.2 ? t / 0.2 : Math.max(0, 1 - (t - 0.5) / 0.5);
      const radius = 28 + Math.sin(Math.min(1, t * 2) * Math.PI) * 18;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.globalAlpha = alpha;

      // Vòng xoay cổng không gian
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius, this.elapsed * 4, this.elapsed * 4 + Math.PI * 1.5);
      ctx.stroke();

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.72, -this.elapsed * 5, -this.elapsed * 5 + Math.PI * 1.4);
      ctx.stroke();

      // Avatar người gọi ở giữa cổng
      this.drawAvatarCircle(ctx, 0, -20 - t * 18, 17, p.avatar, p.name, p.team);

      ctx.font = '800 13px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fde047';
      ctx.fillText(`${p.name} · ${p.unitLabel}`, 0, -46 - t * 18);

      ctx.restore();
    }
  }

  private drawUnit(ctx: CanvasRenderingContext2D, u: UnitEntity): void {
    ctx.save();
    ctx.translate(u.x, u.y);

    const teamMain = u.team === 'red' ? '#ef4444' : '#38bdf8';
    const teamDark = u.team === 'red' ? '#991b1b' : '#1d4ed8';
    const hasBuff =
      this.elapsed < this.buffs[u.team].dragonUntil ||
      this.elapsed < this.buffs[u.team].baronUntil;

    // Đổ bóng (đơn vị bay có bóng tách rời xuống dưới)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.beginPath();
    ctx.ellipse(0, u.isFlying ? 20 : 6, u.size * 0.85, u.size * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    if (hasBuff) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.72)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, u.size + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    const liftY = u.isFlying ? Math.sin(u.wingPhase) * 4 - 8 : 0;
    ctx.translate(0, liftY);

    if (u.tier === 'boneDragon' || u.tier === 'eagleDragonLord') {
      this.drawFlyingDragon(ctx, u, teamMain);
    } else if (u.tier === 'dragonKnight') {
      ctx.save();
      ctx.rotate(u.angle);
      // Kỵ sĩ rồng
      ctx.fillStyle = u.hitFlash > 0 ? '#ffffff' : '#f59e0b';
      ctx.beginPath();
      ctx.ellipse(0, 0, u.size, u.size * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = teamMain;
      ctx.beginPath();
      ctx.arc(2, 0, u.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      // Mũi thương tiến công
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(4, 3);
      ctx.lineTo(u.size + 12 + u.attackFlash * 6, 3);
      ctx.stroke();
      ctx.restore();
    } else if (u.tier === 'archer') {
      ctx.save();
      ctx.rotate(u.angle);
      ctx.fillStyle = u.hitFlash > 0 ? '#ffffff' : teamMain;
      ctx.beginPath();
      ctx.arc(0, 0, u.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(4, 0, u.size * 0.85, -0.9, 0.9);
      ctx.stroke();
      ctx.restore();
    } else {
      // Binh Lính
      ctx.save();
      ctx.rotate(u.angle);
      ctx.fillStyle = u.hitFlash > 0 ? '#ffffff' : teamMain;
      ctx.strokeStyle = teamDark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, u.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Khiên & kiếm nhỏ
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(u.size * 0.5, -3);
      ctx.lineTo(u.size + 6 + u.attackFlash * 5, 0);
      ctx.stroke();
      ctx.restore();
    }

    // Thanh máu cho lính bị thương hoặc đơn vị cấp cao
    if (u.hp < u.maxHp || u.tier !== 'soldier') {
      this.drawHpBar(ctx, 0, -u.size - 9, Math.max(24, u.size * 1.9), 4.5, u.hp / u.maxHp, teamMain);
    }

    // Avatar + tên chủ nhân bay theo bên trên rồng và kỵ sĩ rồng
    if (u.ownerName && UNIT_CONFIG[u.tier].announceTier) {
      this.drawAvatarCircle(ctx, 0, -u.size - 28, 12, u.ownerAvatar, u.ownerName, u.team);
      ctx.font = '700 11px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fef9c3';
      ctx.fillText(u.ownerName, 0, -u.size - 45);
    }

    ctx.restore();
  }

  /**
   * Vẽ Rồng Xương & Bá Chủ Rồng Ưng với hiệu ứng đôi cánh vỗ nhịp nhàng.
   */
  private drawFlyingDragon(ctx: CanvasRenderingContext2D, u: UnitEntity, teamMain: string): void {
    const isLord = u.tier === 'eagleDragonLord';
    const flap = Math.sin(u.wingPhase); // -1 .. +1
    const wingSpan = u.size * (isLord ? 1.85 : 1.55);

    ctx.save();
    ctx.rotate(u.angle + Math.PI / 2);

    // Đôi cánh vỗ nhịp nhàng hai bên thân
    for (const side of [-1, 1]) {
      ctx.fillStyle =
        u.hitFlash > 0
          ? '#ffffff'
          : isLord
            ? u.team === 'red'
              ? '#f59e0b'
              : '#38bdf8'
            : '#cbd5e1';
      ctx.strokeStyle = isLord ? '#fef08a' : '#475569';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.quadraticCurveTo(
        side * wingSpan * 0.65,
        -12 - flap * 16,
        side * wingSpan,
        6 - flap * 20,
      );
      ctx.quadraticCurveTo(side * wingSpan * 0.55, 14 - flap * 6, 0, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Thân và đuôi rồng
    ctx.fillStyle = u.hitFlash > 0 ? '#ffffff' : isLord ? teamMain : '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(0, 2, u.size * 0.42, u.size * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();

    // Đầu rồng / ưng + vương miện phát sáng
    ctx.fillStyle = isLord ? '#fde047' : '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(0, -u.size * 0.92);
    ctx.lineTo(-u.size * 0.28, -u.size * 0.35);
    ctx.lineTo(u.size * 0.28, -u.size * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.projectiles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.kind === 'arrow') {
        const a = Math.atan2(p.ty - p.y, p.tx - p.x);
        ctx.rotate(a);
        ctx.strokeStyle = p.team === 'red' ? '#fda4af' : '#bae6fd';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.lineTo(7, 0);
        ctx.stroke();
      } else {
        const color =
          p.kind === 'dragonBreath'
            ? '#fbbf24'
            : p.kind === 'boneFire'
              ? '#c084fc'
              : p.team === 'red'
                ? '#f87171'
                : '#60a5fa';
        const r = p.kind === 'dragonBreath' ? 7 : p.kind === 'boneFire' ? 5.5 : 4.5;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const t = p.age / p.duration;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      if (p.ring) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * (1 - t) + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (0.25 + t * 0.85), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (1 - t * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D): void {
    for (const f of this.floatTexts) {
      const t = f.age / f.duration;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.font = `900 ${f.size}px "Be Vietnam Pro", sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth = 4;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
  }

  private drawVictoryBanner(ctx: CanvasRenderingContext2D): void {
    if (!this.winner) return;
    ctx.save();
    ctx.fillStyle = 'rgba(5, 7, 14, 0.72)';
    ctx.fillRect(140, 390, 720, 220);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.strokeRect(140, 390, 720, 220);

    ctx.textAlign = 'center';
    ctx.fillStyle = this.winner === 'red' ? '#f87171' : '#60a5fa';
    ctx.font = '900 44px "Cinzel", serif';
    ctx.fillText(
      `CHIẾN THẮNG! ĐỘI ${this.winner === 'red' ? 'ĐỎ' : 'XANH'}`,
      MAP_SIZE / 2,
      472,
    );

    ctx.fillStyle = '#fde68a';
    ctx.font = '700 22px "Be Vietnam Pro", sans-serif';
    ctx.fillText(
      `Trận mới tự động bắt đầu sau ${Math.max(1, Math.ceil(this.victoryTimer))} giây...`,
      MAP_SIZE / 2,
      540,
    );
    ctx.restore();
  }

  private drawHpBar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    ratio: number,
    color: string,
  ): void {
    const clamped = Math.max(0, Math.min(1, ratio));
    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(cx - w / 2 + 1, cy - h / 2 + 1, Math.max(0, (w - 2) * clamped), h - 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
  }

  private drawAvatarCircle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    url: string,
    name: string,
    team: Team,
  ): void {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.save();
    ctx.clip();

    const cached = url ? this.avatarCache.get(url) : undefined;
    if (cached && cached !== 'loading' && cached !== 'failed') {
      ctx.drawImage(cached, x - r, y - r, r * 2, r * 2);
    } else {
      ctx.fillStyle = team === 'red' ? '#dc2626' : '#2563eb';
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${Math.round(r * 0.9)}px "Be Vietnam Pro", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((name || 'T').slice(0, 1).toUpperCase(), x, y + 1);
    }
    ctx.restore();

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private polygonPath(
    ctx: CanvasRenderingContext2D,
    sides: number,
    radius: number,
    rotation = 0,
  ): void {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rotation + (i * Math.PI * 2) / sides;
      const px = Math.cos(a) * radius;
      const py = Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
}

export { GIFT_CATALOG };
