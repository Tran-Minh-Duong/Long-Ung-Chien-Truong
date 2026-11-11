import type { Team } from './unitConfig';

export interface Point {
  x: number;
  y: number;
}

export type LaneRoute = 'top' | 'mid' | 'bot';
export type TacticalRoute = LaneRoute | 'bac' | 'upatk' | 'downatk';

/** Hệ tọa độ chuẩn của Canvas bản đồ vuông (1000 x 1000). */
export const MAP_SIZE = 1000;

export const BASE_POSITIONS: Record<Team, Point> = {
  red: { x: 128, y: 862 },
  blue: { x: 875, y: 130 },
};

export const PORTAL_POSITIONS: Record<Team, Point> = {
  red: { x: 165, y: 825 },
  blue: { x: 838, y: 168 },
};

export const BOSS_POSITIONS = {
  dragon: { x: 338, y: 292 } as Point, // Hang Rồng (DRAG) - nửa trên sông
  baron: { x: 665, y: 705 } as Point,  // Hang Baron (BARON) - nửa dưới sông
};

export interface TurretSpot {
  id: string;
  team: Team;
  lane: LaneRoute;
  kind: 'outerTurret' | 'innerTurret';
  x: number;
  y: number;
}

export const TURRET_SPOTS: TurretSpot[] = [
  // Trụ Đội Đỏ (góc dưới-trái hướng ra 3 đường)
  { id: 'red-top-inner', team: 'red', lane: 'top', kind: 'innerTurret', x: 74, y: 595 },
  { id: 'red-top-outer', team: 'red', lane: 'top', kind: 'outerTurret', x: 72, y: 315 },
  { id: 'red-mid-inner', team: 'red', lane: 'mid', kind: 'innerTurret', x: 248, y: 752 },
  { id: 'red-mid-outer', team: 'red', lane: 'mid', kind: 'outerTurret', x: 365, y: 635 },
  { id: 'red-bot-inner', team: 'red', lane: 'bot', kind: 'innerTurret', x: 395, y: 924 },
  { id: 'red-bot-outer', team: 'red', lane: 'bot', kind: 'outerTurret', x: 685, y: 922 },

  // Trụ Đội Xanh (góc trên-phải hướng ra 3 đường)
  { id: 'blue-top-inner', team: 'blue', lane: 'top', kind: 'innerTurret', x: 605, y: 74 },
  { id: 'blue-top-outer', team: 'blue', lane: 'top', kind: 'outerTurret', x: 315, y: 76 },
  { id: 'blue-mid-inner', team: 'blue', lane: 'mid', kind: 'innerTurret', x: 752, y: 248 },
  { id: 'blue-mid-outer', team: 'blue', lane: 'mid', kind: 'outerTurret', x: 635, y: 365 },
  { id: 'blue-bot-inner', team: 'blue', lane: 'bot', kind: 'innerTurret', x: 920, y: 395 },
  { id: 'blue-bot-outer', team: 'blue', lane: 'bot', kind: 'outerTurret', x: 920, y: 685 },
];

/** Mốc tọa độ các làn đường từ góc dưới-trái (Đỏ) -> góc trên-phải (Xanh). */
const RED_LANES: Record<LaneRoute, Point[]> = {
  top: [
    { x: 128, y: 862 },
    { x: 74, y: 710 },
    { x: 70, y: 440 },
    { x: 82, y: 165 },
    { x: 165, y: 82 },
    { x: 460, y: 72 },
    { x: 715, y: 76 },
    { x: 875, y: 130 },
  ],
  mid: [
    { x: 128, y: 862 },
    { x: 270, y: 725 },
    { x: 415, y: 585 },
    { x: 500, y: 500 },
    { x: 585, y: 415 },
    { x: 730, y: 275 },
    { x: 875, y: 130 },
  ],
  bot: [
    { x: 128, y: 862 },
    { x: 285, y: 922 },
    { x: 555, y: 926 },
    { x: 830, y: 912 },
    { x: 915, y: 830 },
    { x: 922, y: 540 },
    { x: 918, y: 290 },
    { x: 875, y: 130 },
  ],
};

/** Lộ trình đặc biệt: kéo quân về thủ nhà (bac), ăn Rồng (upatk), ăn Baron (downatk). */
const TACTICAL_PATHS: Record<Team, Record<'bac' | 'upatk' | 'downatk', Point[]>> = {
  red: {
    bac: [
      { x: 500, y: 500 },
      { x: 270, y: 725 },
      { x: 160, y: 830 },
      { x: 128, y: 862 },
    ],
    upatk: [
      { x: 160, y: 830 },
      { x: 270, y: 725 },
      { x: 415, y: 585 },
      { x: 380, y: 410 },
      { x: 338, y: 292 },
    ],
    downatk: [
      { x: 160, y: 830 },
      { x: 270, y: 725 },
      { x: 415, y: 585 },
      { x: 565, y: 620 },
      { x: 665, y: 705 },
    ],
  },
  blue: {
    bac: [
      { x: 500, y: 500 },
      { x: 730, y: 275 },
      { x: 840, y: 165 },
      { x: 875, y: 130 },
    ],
    upatk: [
      { x: 840, y: 165 },
      { x: 730, y: 275 },
      { x: 585, y: 415 },
      { x: 410, y: 385 },
      { x: 338, y: 292 },
    ],
    downatk: [
      { x: 840, y: 165 },
      { x: 730, y: 275 },
      { x: 585, y: 415 },
      { x: 625, y: 575 },
      { x: 665, y: 705 },
    ],
  },
};

export function getRouteWaypoints(team: Team, route: TacticalRoute): Point[] {
  if (route === 'top' || route === 'mid' || route === 'bot') {
    const basePath = RED_LANES[route];
    return team === 'red' ? basePath.map((p) => ({ ...p })) : [...basePath].reverse().map((p) => ({ ...p }));
  }
  return TACTICAL_PATHS[team][route].map((p) => ({ ...p }));
}

export function getDisplayLanePoints(lane: LaneRoute): Point[] {
  return RED_LANES[lane];
}

/**
 * Tìm điểm mốc tiếp theo gần nhất khi một đơn vị đang trên bản đồ được chuyển hướng đột ngột.
 */
export function findNearestWaypointIndex(pos: Point, waypoints: Point[]): number {
  if (waypoints.length <= 1) return 0;
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < waypoints.length; i++) {
    const dx = waypoints[i].x - pos.x;
    const dy = waypoints[i].y - pos.y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return Math.min(bestIdx + 1, waypoints.length - 1);
}
