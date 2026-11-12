import { useEffect, useRef, useState } from 'react';
import { sendControl } from '../live/page';
import { GAME } from './config';

const SAMPLE_TEXT = 'Cổng không gian vừa mở! Triệu hồi Bá Chủ Rồng Ưng xuất kích trợ chiến!';
const EDGE_VOICES = ['Nam Minh', 'Hoài My'];
type VoicePrefs = { mcVoice: string; mcSpeed: string; mcExpr: string };

export function McSettings({ prefs, voiceWho }: { prefs: Record<string, string>; voiceWho?: 'M' | 'F' }) {
  const [draft, setDraft] = useState<Partial<VoicePrefs> | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [saveError, setSaveError] = useState('');
  const [sample, setSample] = useState<{ url: string; rate: number; voice: string } | null>(null);
  const request = useRef<AbortController | null>(null);
  const preferredVoice = prefs.mcVoice || (voiceWho === 'F' ? 'Hoài My' : GAME.mc.mcVoice);
  const saved = {
    mcVoice: EDGE_VOICES.includes(preferredVoice) ? preferredVoice : GAME.mc.mcVoice,
    mcSpeed: prefs.mcSpeed || GAME.mc.mcSpeed,
    mcExpr: prefs.mcExpr || GAME.mc.mcExpr,
  };
  const { mcVoice: voice, mcSpeed: speed, mcExpr: expression } = { ...saved, ...draft };
  const edge = EDGE_VOICES.includes(voice);
  const changed = voice !== saved.mcVoice || speed !== saved.mcSpeed || expression !== saved.mcExpr;

  useEffect(() => {
    if (!changed && draft) setDraft(null);
  }, [changed, draft]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (sample) return () => URL.revokeObjectURL(sample.url);
  }, [sample]);

  async function save(patch: Record<string, string>) {
    setSaving(true);
    setSaveError('');
    try {
      const result = await sendControl('setPrefs', JSON.stringify(patch));
      if (!result.success) throw new Error(result.error);
    } catch {
      setSaveError('Chưa lưu được cài đặt cho sân khấu. Hãy thử lại.');
    } finally {
      setSaving(false);
    }
  }

  function clearSample() {
    request.current?.abort();
    setSample(null);
    setLoading(false);
    setStatus('');
  }

  function updateVoice(patch: Partial<VoicePrefs>) {
    clearSample();
    setDraft((current) => ({ ...current, ...patch }));
  }

  async function listen() {
    clearSample();
    const controller = new AbortController();
    const timeout = AbortSignal.timeout(35_000);
    const signal = AbortSignal.any([controller.signal, timeout]);
    request.current = controller;
    setLoading(true);
    setStatus(`Đang tạo mẫu giọng ${voice}…`);
    const query = new URLSearchParams({ preview: '1', text: SAMPLE_TEXT });
    if (edge) {
      query.set('v', voice === 'Hoài My' ? 'f' : 'm');
      query.set('rate', speed);
    } else {
      query.set('eng', 'vn');
      query.set('voice', voice);
      query.set('temp', expression);
    }

    try {
      const response = await fetch('/api/tts?' + query, { signal });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.error || 'Chưa tạo được mẫu giọng. Hãy thử lại.');
      }
      const audio = await response.blob();
      signal.throwIfAborted();
      if (!audio.size || !audio.type.startsWith('audio/')) throw new Error('Mẫu giọng bị lỗi. Hãy thử lại.');
      setSample({ url: URL.createObjectURL(audio), rate: edge ? 1 : Number(speed) || 1.15, voice });
      setStatus(`Mẫu giọng ${voice} đã sẵn sàng. Bấm nút phát nếu chưa nghe thấy.`);
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus(timeout.aborted
        ? 'Tạo mẫu giọng quá lâu. Hãy thử lại.'
        : error instanceof TypeError
          ? 'Không kết nối được để tạo mẫu giọng. Hãy thử lại.'
          : (error as Error).message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-48 flex-col gap-1 text-slate-300">
          Chọn giọng MC
          <select value={voice} onChange={(e) => updateVoice({ mcVoice: e.target.value })} className="rounded-lg bg-slate-800 px-3 py-2 text-slate-100">
            {EDGE_VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <button type="button" onClick={loading ? clearSample : listen} className="rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-400">
          {loading ? 'Hủy nghe thử' : 'Nghe thử giọng MC'}
        </button>
        <button
          type="button"
          disabled={!changed || saving}
          onClick={() => void save({ mcVoice: voice, mcSpeed: speed, mcExpr: expression })}
          className="rounded-lg bg-slate-800 px-4 py-2 font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          Áp dụng lên sân khấu
        </button>
      </div>
      {sample && (
        <audio
          key={sample.url}
          src={sample.url}
          controls
          autoPlay
          aria-label="Mẫu giọng MC"
          className="h-10 w-full max-w-sm"
          onLoadedMetadata={(e) => { e.currentTarget.playbackRate = sample.rate; }}
          onPlaying={() => setStatus(`Đang phát mẫu giọng ${sample.voice} trên bảng điều khiển.`)}
          onPause={() => setStatus(`Mẫu giọng ${sample.voice} đã tạm dừng.`)}
          onEnded={() => setStatus(`Đã phát xong mẫu giọng ${sample.voice}.`)}
          onError={() => setStatus('Không phát được mẫu giọng. Hãy bấm nghe thử lại.')}
        />
      )}
      <p role="status" className="text-slate-300">{status || 'Mẫu giọng phát trên bảng điều khiển.'}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={prefs.mcOn !== '0'} disabled={saving} onChange={(e) => void save({ mcOn: e.target.checked ? '1' : '0' })} />
          Bật MC trên sân khấu ({saved.mcVoice})
        </label>
        <label className="flex items-center gap-2">
          Tốc độ
          <input type="range" min="0.85" max="1.5" step="0.05" value={speed} onChange={(e) => updateVoice({ mcSpeed: e.target.value })} />
          <span className="tabular-nums">{Number(speed).toFixed(2)}×</span>
        </label>
        {!edge && (
          <label className="flex items-center gap-2">
            Biểu cảm
            <input type="range" min="0.6" max="1.3" step="0.05" value={expression} onChange={(e) => updateVoice({ mcExpr: e.target.value })} />
            <span className="tabular-nums">{Number(expression).toFixed(2)}</span>
          </label>
        )}
      </div>
      {saveError && <p role="alert" className="text-amber-300">{saveError}</p>}
    </div>
  );
}
