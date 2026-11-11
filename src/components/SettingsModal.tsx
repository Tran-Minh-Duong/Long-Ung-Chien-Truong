import { useState } from 'react';
import { AlertTriangle, Plug, PlugZap, Volume2, VolumeX, X } from 'lucide-react';
import { DISCLAIMER_ITEMS } from '../game/unitConfig';
import type { ConnectionState } from '../services/liveConnector';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  wsUrl: string;
  wsState: ConnectionState;
  wsMessage: string;
  onConnectWs: (url: string) => void;
  onDisconnectWs: () => void;
  voiceEnabled: boolean;
  onToggleVoice: (enabled: boolean) => void;
  sfxEnabled: boolean;
  onToggleSfx: (enabled: boolean) => void;
  voiceRate: number;
  onChangeVoiceRate: (rate: number) => void;
  onTestVoice: () => void;
}

export function SettingsModal({
  open,
  onClose,
  wsUrl,
  wsState,
  wsMessage,
  onConnectWs,
  onDisconnectWs,
  voiceEnabled,
  onToggleVoice,
  sfxEnabled,
  onToggleSfx,
  voiceRate,
  onChangeVoiceRate,
  onTestVoice,
}: SettingsModalProps) {
  const [tab, setTab] = useState<'ws' | 'terms'>('ws');
  const [draftUrl, setDraftUrl] = useState(wsUrl);

  if (!open) return null;

  const statusBadge =
    wsState === 'connected'
      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
      : wsState === 'connecting'
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        : wsState === 'error'
          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
          : 'bg-slate-800 text-slate-300 border-slate-700';

  const statusLabel =
    wsState === 'connected'
      ? 'Đã kết nối'
      : wsState === 'connecting'
        ? 'Đang kết nối...'
        : wsState === 'error'
          ? 'Lỗi kết nối'
          : 'Chưa kết nối';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm">
      <div className="flex max-h-[88%] w-full max-w-[740px] flex-col overflow-hidden rounded-2xl border border-amber-500/50 bg-slate-900 shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 px-5 py-3.5">
          <h2 className="font-display text-lg font-extrabold text-amber-400">
            Thiết lập & Lưu ý Trách Nhiệm
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 p-1.5 text-slate-300 transition hover:bg-slate-700 hover:text-white"
            aria-label="Đóng thiết lập"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-800 bg-slate-950/40 px-5 py-2.5">
          <button
            type="button"
            onClick={() => setTab('ws')}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-bold transition ${
              tab === 'ws'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            WebSocket TikTok Live & MC
          </button>
          <button
            type="button"
            onClick={() => setTab('terms')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-bold transition ${
              tab === 'terms'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            7 Điều Lưu Ý & Trách Nhiệm
          </button>
        </div>

        {/* Nội dung Modal */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'ws' ? (
            <div className="space-y-5">
              {/* Cấu hình WebSocket */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-100">
                    Cổng WebSocket Backend TikTok LIVE
                  </span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusBadge}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={draftUrl}
                    onChange={(e) => setDraftUrl(e.target.value)}
                    placeholder="ws://localhost:8081"
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                  {wsState === 'connected' || wsState === 'connecting' ? (
                    <button
                      type="button"
                      onClick={onDisconnectWs}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-500"
                    >
                      <Plug className="h-4 w-4" />
                      Ngắt kết nối
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onConnectWs(draftUrl)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-400"
                    >
                      <PlugZap className="h-4 w-4" />
                      Kết nối
                    </button>
                  )}
                </div>

                <div className="mt-2.5 flex flex-wrap gap-2">
                  {['ws://localhost:8081', 'ws://localhost:21213', 'ws://localhost:62024'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDraftUrl(preset)}
                      className="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 hover:border-amber-400 hover:text-amber-300"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {wsMessage && (
                  <p className="mt-2 text-xs text-slate-400">{wsMessage}</p>
                )}

                <div className="mt-3 rounded-lg bg-slate-900/90 p-3 text-xs leading-relaxed text-slate-400">
                  Hỗ trợ gói JSON chuẩn từ TikTok Live Connector / TikFinity qua WebSocket:{' '}
                  <code className="text-amber-300">
                    {'{ "event": "chat" | "gift" | "like", "data": { "uniqueId", "nickname", "comment", "giftName", "diamondCount" } }'}
                  </code>
                </div>
              </div>

              {/* Giọng đọc MC & Âm thanh */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-100">
                  Giọng MC (Web Speech API tiếng Việt) & Âm thanh
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleVoice(!voiceEnabled)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold transition ${
                      voiceEnabled
                        ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/50'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    MC đọc tên rồng: {voiceEnabled ? 'BẬT' : 'TẮT'}
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleSfx(!sfxEnabled)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold transition ${
                      sfxEnabled
                        ? 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/50'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Hiệu ứng âm thanh: {sfxEnabled ? 'BẬT' : 'TẮT'}
                  </button>

                  <button
                    type="button"
                    onClick={onTestVoice}
                    className="rounded-lg bg-slate-800 px-3.5 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
                  >
                    🔊 Nghe thử MC
                  </button>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <span className="text-xs font-semibold text-slate-300">
                    Tốc độ MC ({voiceRate.toFixed(2)}x)
                  </span>
                  <input
                    type="range"
                    min="0.8"
                    max="1.4"
                    step="0.05"
                    value={voiceRate}
                    onChange={(e) => onChangeVoiceRate(Number(e.target.value))}
                    className="w-48 accent-amber-400"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-sm text-amber-200">
                Game chia sẻ miễn phí, ai cũng lấy về dùng được. Trước khi dùng cho buổi live của mình, đọc kỹ mấy điều sau:
              </div>
              {DISCLAIMER_ITEMS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-sm leading-relaxed text-slate-300"
                >
                  <span className="font-bold text-amber-300">{item.title}</span> {item.body}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

