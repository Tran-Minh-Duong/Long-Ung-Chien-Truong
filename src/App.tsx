import { useState } from 'react';
import { Dashboard } from './live/Dashboard';
import { IS_STAGE, OpenStage } from './live/page';
import { StageFrame } from './live/StageFrame';
import { GameControls, ViewSwitch, type ViewMode } from './game/GameControls';
import { GameStage } from './game/GameStage';
import { useGame } from './game/useGame';

function PreviewBox({ onReady }: { onReady: () => void }) {
  return (
    <div style={{ width: 324, height: 576 }} className="relative overflow-hidden bg-black">
      <div style={{ width: 1080, height: 1920, transform: 'scale(0.3)', transformOrigin: '0 0' }}>
        <GameStage onReady={onReady} />
      </div>
    </div>
  );
}

export function App() {
  const { status, channelName, voiceWho, prefs, giftRules, syncFrame } = useGame();
  const [view, setView] = useState<ViewMode>('both');

  if (IS_STAGE) {
    return (
      <StageFrame>
        <GameStage onReady={syncFrame} />
      </StageFrame>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-950/90 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-wide text-amber-400">🐉 Long Ưng Chiến Trường</span>
          <ViewSwitch mode={view} onChange={setView} />
        </div>
        <OpenStage />
      </div>

      {view === 'game' ? (
        <div className="h-[calc(100vh-54px)] w-full">
          <StageFrame>
            <GameStage onReady={syncFrame} />
          </StageFrame>
        </div>
      ) : view === 'panel' ? (
        <Dashboard
          status={status}
          channelName={channelName}
          voiceWho={voiceWho}
          prefs={prefs}
          top={<GameControls prefs={prefs} giftRules={giftRules} />}
          preview={<div className="p-6 text-xs text-slate-500">Đang ẩn xem trước</div>}
        />
      ) : (
        <Dashboard
          status={status}
          channelName={channelName}
          voiceWho={voiceWho}
          prefs={prefs}
          top={<GameControls prefs={prefs} giftRules={giftRules} />}
          preview={<PreviewBox onReady={syncFrame} />}
        />
      )}
    </div>
  );
}

export default App;
