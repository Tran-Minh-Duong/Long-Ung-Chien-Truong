import { useState } from 'react';
import { Bot, RotateCcw, Send, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { GIFT_CATALOG, type GiftOption, type Team } from '../game/unitConfig';

interface SimulatorPanelProps {
  autoDemo: boolean;
  onToggleAutoDemo: () => void;
  onResetMatch: () => void;
  onSimulateComment: (playerName: string, comment: string) => void;
  onSimulateGift: (playerName: string, gift: GiftOption, team?: Team) => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
}

const SAMPLE_NAMES = [
  'Minh Quân',
  'Lan Anh',
  'Hải Đăng',
  'Bảo Ngọc',
  'Tuấn Kiệt',
  'Gia Huy',
  'Thảo Vy',
  'Quốc Bảo',
];

const QUICK_COMMANDS = ['1', '2', 'top', 'mid', 'adc', 'bac', 'upatk', 'downatk'];

export function SimulatorPanel({
  autoDemo,
  onToggleAutoDemo,
  onResetMatch,
  onSimulateComment,
  onSimulateGift,
  voiceEnabled,
  onToggleVoice,
}: SimulatorPanelProps) {
  const [playerName, setPlayerName] = useState('Minh Quân');
  const [commentInput, setCommentInput] = useState('1');
  const [giftTeam, setGiftTeam] = useState<'auto' | Team>('auto');

  const submitComment = (cmdOverride?: string) => {
    const cmd = (cmdOverride ?? commentInput).trim();
    if (!cmd) return;
    onSimulateComment(playerName.trim() || 'Chiến Binh', cmd);
    if (!cmdOverride) setCommentInput('');
  };

  const randomName = () => {
    const next = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
    setPlayerName(next);
  };

  return (
    <div className="flex h-full flex-col justify-between gap-2.5">
      {/* Khung chữ nổi bật theo yêu cầu */}
      <div className="pulse-cta flex items-center justify-between rounded-xl border-2 bg-gradient-to-r from-rose-950/90 via-slate-900 to-sky-950/90 px-3 py-2 shadow-lg">
        <div className="text-sm font-black uppercase tracking-wide">
          <span className="text-rose-400">cmt 1 vào đỏ</span>
          <span className="mx-2 text-amber-400">/</span>
          <span className="text-sky-400">cmt 2 vào xanh</span>
        </div>
        <button
          type="button"
          onClick={onToggleVoice}
          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${
            voiceEnabled ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
          }`}
          title="Bật/Tắt giọng MC"
        >
          {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          MC
        </button>
      </div>

      {/* Bảng điều khiển giả lập */}
      <div className="flex flex-1 flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />
              Bảng điều khiển giả lập
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleAutoDemo}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition ${
                  autoDemo
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Bot className="h-3 w-3" />
                {autoDemo ? 'Auto: BẬT' : 'Auto Demo'}
              </button>
              <button
                type="button"
                onClick={onResetMatch}
                className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-300 hover:bg-slate-700"
                title="Chơi lại trận mới"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            </div>
          </div>

          {/* Tên người chơi + chọn phe quà */}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Tên người chơi..."
              className="w-36 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={randomName}
              className="rounded-lg bg-slate-800 px-2 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-slate-700"
            >
              Đổi tên
            </button>
            <div className="ml-auto flex overflow-hidden rounded-lg border border-slate-700 text-[11px] font-bold">
              {(['auto', 'red', 'blue'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setGiftTeam(opt)}
                  className={`px-2 py-1 ${
                    giftTeam === opt
                      ? opt === 'red'
                        ? 'bg-rose-600 text-white'
                        : opt === 'blue'
                          ? 'bg-sky-600 text-white'
                          : 'bg-amber-500 text-slate-950'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  {opt === 'auto' ? 'Auto' : opt === 'red' ? 'Đỏ' : 'Xanh'}
                </button>
              ))}
            </div>
          </div>

          {/* Nhập lệnh comment */}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              placeholder="Nhập lệnh: 1, 2, top, mid, adc, bac, upatk, downatk..."
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => submitComment()}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-extrabold text-slate-950 transition hover:bg-amber-400"
            >
              <Send className="h-3.5 w-3.5" />
              Gửi
            </button>
          </div>

          {/* Nút bấm nhanh 8 lệnh */}
          <div className="grid grid-cols-4 gap-1.5">
            {QUICK_COMMANDS.map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => submitComment(cmd)}
                className={`rounded-md py-1 text-xs font-extrabold uppercase transition ${
                  cmd === '1'
                    ? 'bg-rose-600/80 text-white hover:bg-rose-500'
                    : cmd === '2'
                      ? 'bg-sky-600/80 text-white hover:bg-sky-500'
                      : cmd === 'upatk' || cmd === 'downatk'
                        ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40 hover:bg-amber-500/30'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>

        {/* Nút bấm thả quà 5 cấp */}
        <div className="pt-2">
          <div className="mb-1 text-[11px] font-bold text-slate-400">
            Thả quà triệu hồi ngay ({giftTeam === 'auto' ? 'phe đang chọn' : giftTeam === 'red' ? 'Đội Đỏ' : 'Đội Xanh'}):
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {GIFT_CATALOG.map((gift) => (
              <button
                key={gift.tier}
                type="button"
                onClick={() =>
                  onSimulateGift(
                    playerName.trim() || 'Chiến Binh',
                    gift,
                    giftTeam === 'auto' ? undefined : giftTeam,
                  )
                }
                className="flex flex-col items-center rounded-lg border border-slate-700/80 bg-slate-950/90 px-1 py-1.5 text-center transition hover:border-amber-400 hover:bg-slate-800"
                title={`${gift.giftName}: ${gift.title}`}
              >
                <span className="text-base leading-none">{gift.icon}</span>
                <span className="mt-1 truncate text-[10px] font-bold text-slate-200">
                  {gift.giftName}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

