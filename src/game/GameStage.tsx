import { IS_STAGE } from '../live/page';
import { frame } from './frame';

export function GameStage({ onReady }: { onReady?: () => void }) {
  const src = `/game.html?embed=1${IS_STAGE ? '' : '&mute=1'}`;
  return (
    <iframe
      ref={(el) => {
        frame.el = el;
      }}
      src={src}
      title="Long Ưng Chiến Trường"
      allow="autoplay"
      onLoad={() => onReady?.()}
      className="h-full w-full border-0 bg-black"
    />
  );
}

