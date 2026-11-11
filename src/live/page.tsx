import { type ReactNode } from 'react';

const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
export const IS_STAGE = params.get('view') === 'stage';
export const STAGE_ID = IS_STAGE ? `st_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}` : '';

export async function emitTest(type: string, data: Record<string, unknown>) {
  const r = await fetch('/api/test/emit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, data }),
  });
  return r.json();
}

export async function sendControl(action: string, text?: string) {
  const r = await fetch('/api/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, text }),
  });
  return r.json();
}

export function OpenStage(): ReactNode {
  const url = `${window.location.origin}/?view=stage`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="rounded-xl bg-amber-500 px-3 py-1.5 text-sm font-semibold text-slate-950 shadow-lg hover:bg-amber-400"
    >
      📺 Mở Stage (1080×1920)
    </a>
  );
}

