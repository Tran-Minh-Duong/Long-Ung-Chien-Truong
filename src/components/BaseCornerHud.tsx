import { Crown, Flame, Shield } from 'lucide-react';
import type { TopContributor } from '../game/mobaEngine';
import type { Team } from '../game/unitConfig';

interface BaseCornerHudProps {
  team: Team;
  hpPct: number;
  turretsAlive: number;
  top3: TopContributor[];
  dragonSec: number;
  baronSec: number;
}

export function BaseCornerHud({
  team,
  hpPct,
  turretsAlive,
  top3,
  dragonSec,
  baronSec,
}: BaseCornerHudProps) {
  const isRed = team === 'red';
  const accentText = isRed ? 'text-rose-300' : 'text-sky-300';
  const borderColor = isRed ? 'border-rose-500/60' : 'border-sky-500/60';
  const fillBar = isRed
    ? 'bg-gradient-to-r from-red-600 to-rose-400'
    : 'bg-gradient-to-r from-blue-600 to-cyan-400';

  return (
    <div
      className={`pointer-events-none flex items-center gap-2 rounded-xl border ${borderColor} bg-slate-950/88 px-2 py-1 shadow-lg backdrop-blur-sm ${
        isRed ? 'flex-row' : 'flex-row-reverse'
      }`}
    >
      {/* Khối máu Nhà Chính */}
      <div className="min-w-[108px]">
        <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wide">
          <span className={accentText}>{isRed ? 'Đội Đỏ' : 'Đội Xanh'}</span>
          <span className="flex items-center gap-0.5 text-slate-300">
            <Shield className="h-2.5 w-2.5 text-amber-400" />
            {turretsAlive}
          </span>
        </div>
        <div className="relative mt-0.5 h-3.5 w-full overflow-hidden rounded bg-slate-900 ring-1 ring-white/15">
          <div
            className={`h-full transition-all duration-150 ${fillBar}`}
            style={{ width: `${Math.max(0, Math.min(100, hpPct))}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-white drop-shadow">
            {hpPct.toFixed(2)}%
          </span>
        </div>
        {(dragonSec > 0 || baronSec > 0) && (
          <div className="mt-0.5 flex items-center gap-1 text-[9px] font-bold">
            {dragonSec > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded bg-orange-500/25 px-1 text-orange-300">
                <Flame className="h-2.5 w-2.5" />
                DRAG {dragonSec}s
              </span>
            )}
            {baronSec > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded bg-purple-500/25 px-1 text-purple-300">
                BARON {baronSec}s
              </span>
            )}
          </div>
        )}
      </div>

      {/* Avatar Top 1-2-3 */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((idx) => {
          const player = top3[idx];
          const ringClass =
            idx === 0
              ? 'ring-2 ring-amber-400'
              : idx === 1
                ? 'ring-2 ring-slate-300'
                : 'ring-2 ring-amber-700';
          return (
            <div key={idx} className="relative flex flex-col items-center">
              {idx === 0 && (
                <Crown className="absolute -top-2 z-10 h-2.5 w-2.5 text-amber-400 drop-shadow" />
              )}
              <div
                className={`flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-[10px] font-extrabold text-white ${ringClass}`}
              >
                {player ? (
                  player.avatar ? (
                    <img
                      src={player.avatar}
                      alt={player.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className={isRed ? 'text-rose-200' : 'text-sky-200'}>
                      {player.name.slice(0, 1).toUpperCase()}
                    </span>
                  )
                ) : (
                  <span className="text-slate-500">{idx + 1}</span>
                )}
              </div>
              <span className="mt-0.5 max-w-[42px] truncate text-[9px] font-semibold leading-none text-slate-200">
                {player ? player.name : `Top ${idx + 1}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
