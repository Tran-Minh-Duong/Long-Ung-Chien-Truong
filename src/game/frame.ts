export interface GameStats {
  units: number;
  redUnits?: number;
  blueUnits?: number;
  dragons: number;
  fx: number;
  hp: number[];
  kills: number[];
  cmt: number[];
  players: number;
  heart: number[];
  broken: number[];
  round: number;
  phase: 'fight' | 'result';
  time: number;
  fps: number;
  frameP95?: number;
  pendingGiftUnits?: number;
  dragPct?: number;
  baronPct?: number;
  overtime?: boolean;
  overtimeLeft?: number;
  dragContested?: boolean;
  baronContested?: boolean;
}

export interface GameApi {
  event(ev: Record<string, unknown>): { side?: number | null; joined?: boolean };
  sayText(text: string, prio?: number): void;
  stopVoice(): void;
  setSpeaker(on: boolean): void;
  setMc(prefs: Record<string, string>): void;
  setGifts?(rules: unknown[]): void;
  setLength(sec: number): void;
  jump(j: number): void;
  newMatch(): void;
  startSiegeVote?(): void;
  spawnSiegeTank?(side: number, lane: string): void;
  startOvertime?(): void;
  testBossContest?(key: 'drag' | 'baron'): void;
  testMoment?(kind: 'turret' | 'boss' | 'lord'): void;
  phase(): 'fight' | 'result';
  stats(): GameStats;
}

export const frame: { el: HTMLIFrameElement | null } = { el: null };

export const gameApi = (): GameApi | null =>
  ((frame.el?.contentWindow as unknown as { GAME_API?: GameApi } | null)?.GAME_API) ?? null;
