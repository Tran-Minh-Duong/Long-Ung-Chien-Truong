import { useEffect, useState, type ReactNode } from 'react';

/** Khung 1080×1920 tự co vừa cửa sổ trình duyệt / TikTok LIVE Studio. */
export function StageFrame({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      setScale(Math.min(window.innerWidth / 1080, window.innerHeight / 1920));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-black">
      <div
        className="relative shrink-0 overflow-hidden bg-slate-950"
        style={{
          width: 1080,
          height: 1920,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  );
}

