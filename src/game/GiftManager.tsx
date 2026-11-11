import { useEffect, useMemo, useState } from 'react';
import type { GiftRule, TikTokCatalogGift, UnitTierId } from '../live/types';
import { UNIT_TIERS, UNIT_TIER_MAP } from './gifts';

interface GiftManagerProps {
  rules: GiftRule[];
  side: '1' | '2';
  onSideChange: (side: '1' | '2') => void;
  onSaveRules: (next: GiftRule[]) => Promise<void>;
  onResetDefaults: () => Promise<void>;
  onTestGift: (rule: GiftRule) => void;
}

type CoinFilter = 'all' | '1' | 'low' | 'mid' | 'high';

const COIN_FILTERS: { id: CoinFilter; label: string; match: (c: number) => boolean }[] = [
  { id: 'all', label: 'Tất cả', match: () => true },
  { id: '1', label: '1 xu', match: (c) => c <= 1 },
  { id: 'low', label: '2–50 xu', match: (c) => c >= 2 && c <= 50 },
  { id: 'mid', label: '51–500 xu', match: (c) => c >= 51 && c <= 500 },
  { id: 'high', label: '> 500 xu', match: (c) => c > 500 },
];

function GiftThumb({ src, tier, alt, className = 'h-12 w-12' }: { src?: string; tier: UnitTierId; alt: string; className?: string }) {
  const fallback = UNIT_TIER_MAP[tier]?.fallbackIcon || '/img/game/gift_rose.webp';
  return (
    <img
      src={src || fallback}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={(e) => {
        if (e.currentTarget.src.endsWith(fallback)) return;
        e.currentTarget.src = fallback;
      }}
      className={`${className} shrink-0 rounded-lg bg-slate-900/80 object-contain p-1`}
    />
  );
}

export function GiftManager({
  rules,
  side,
  onSideChange,
  onSaveRules,
  onResetDefaults,
  onTestGift,
}: GiftManagerProps) {
  const [catalog, setCatalog] = useState<TikTokCatalogGift[]>([]);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal state
  const [pickerRuleId, setPickerRuleId] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<GiftRule | null>(null);
  const [isNewRule, setIsNewRule] = useState(false);
  const [pickingForEditor, setPickingForEditor] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Load cached catalog & rules on mount
  useEffect(() => {
    fetch('/api/gifts')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.catalog)) setCatalog(d.catalog);
        if (typeof d?.syncedAt === 'number') setSyncedAt(d.syncedAt);
      })
      .catch(() => {});
  }, []);

  const syncTikTok = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const r = await fetch('/api/gifts/sync', { method: 'POST' });
      const d = await r.json();
      if (!r.ok || !d?.success) {
        setSyncMsg(d?.error || 'Không đồng bộ được danh mục TikTok');
      } else {
        setCatalog(Array.isArray(d.catalog) ? d.catalog : []);
        setSyncedAt(typeof d.syncedAt === 'number' ? d.syncedAt : Date.now());
        setSyncMsg(`Đã đồng bộ ${d.count ?? d.catalog?.length ?? 0} quà từ TikTok LIVE.`);
      }
    } catch (e) {
      setSyncMsg(`Lỗi đồng bộ: ${String(e)}`);
    } finally {
      setSyncing(false);
    }
  };

  const commitRules = async (next: GiftRule[]) => {
    setSaving(true);
    try {
      await onSaveRules(next);
    } finally {
      setSaving(false);
    }
  };

  const openPickerForRule = (ruleId: string) => {
    setPickerRuleId(ruleId);
    setPickingForEditor(false);
    if (catalog.length === 0 && !syncing) void syncTikTok();
  };

  const openAddModal = () => {
    setIsNewRule(true);
    setEditingRule({
      id: `gift_${Date.now().toString(36)}`,
      title: 'Triệu hồi quân tiếp viện',
      description: 'Mở cổng triệu hồi đơn vị chiến đấu theo quà tặng.',
      tier: 'dragonKnight',
      count: 1,
      enabled: true,
      giftId: null,
      giftName: '',
      aliases: [],
      diamondCount: 30,
      iconUrl: UNIT_TIER_MAP.dragonKnight.fallbackIcon,
    });
  };

  const openEditModal = (rule: GiftRule) => {
    setIsNewRule(false);
    setEditingRule({ ...rule, aliases: [...(rule.aliases || [])] });
  };

  const toggleEnabled = (id: string) => {
    void commitRules(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const unassignGift = (id: string) => {
    void commitRules(
      rules.map((r) =>
        r.id === id
          ? { ...r, giftId: null, giftName: '', diamondCount: 0, aliases: [], iconUrl: '' }
          : r,
      ),
    );
  };

  const deleteRule = (id: string) => {
    setConfirmDeleteId(null);
    void commitRules(rules.filter((r) => r.id !== id));
  };

  const assignCatalogGift = (picked: TikTokCatalogGift) => {
    if (pickingForEditor && editingRule) {
      setEditingRule({
        ...editingRule,
        giftId: picked.id,
        giftName: picked.name,
        diamondCount: picked.diamondCount,
        iconUrl: picked.iconUrl || editingRule.iconUrl,
      });
      setPickingForEditor(false);
      setPickerRuleId(null);
      return;
    }
    if (!pickerRuleId) return;
    const next = rules.map((r) =>
      r.id === pickerRuleId
        ? {
            ...r,
            giftId: picked.id,
            giftName: picked.name,
            diamondCount: picked.diamondCount,
            iconUrl: picked.iconUrl || UNIT_TIER_MAP[r.tier].fallbackIcon,
            enabled: true,
          }
        : r,
    );
    setPickerRuleId(null);
    void commitRules(next);
  };

  const saveEditorModal = (draft: GiftRule) => {
    const cleaned: GiftRule = {
      ...draft,
      title: draft.title.trim() || UNIT_TIER_MAP[draft.tier].label,
      description: draft.description.trim(),
      giftName: draft.giftName.trim(),
      count: Math.max(1, Math.min(20, Number(draft.count) || 1)),
      diamondCount: Math.max(0, Number(draft.diamondCount) || 0),
    };
    const next = isNewRule
      ? [...rules, cleaned]
      : rules.map((r) => (r.id === cleaned.id ? cleaned : r));
    setEditingRule(null);
    void commitRules(next);
  };

  const enabledCount = rules.filter((r) => r.enabled).length;
  const disabledCount = rules.length - enabledCount;
  const assignedIds = useMemo(() => new Set(rules.map((r) => r.giftId).filter((x): x is number => !!x)), [rules]);
  const unassignedCount = catalog.length > 0 ? Math.max(0, catalog.length - assignedIds.size) : 0;

  const pickerTitle = pickingForEditor
    ? editingRule?.title || 'Quà mới'
    : rules.find((r) => r.id === pickerRuleId)?.title || '';
  const currentPickerGiftId = pickingForEditor
    ? editingRule?.giftId ?? null
    : rules.find((r) => r.id === pickerRuleId)?.giftId ?? null;

  return (
    <div className="space-y-3 rounded-xl bg-slate-950/60 p-3.5 ring-1 ring-slate-800">
      {/* Header matching uploaded reference layout */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-100">Quà triệu hồi trong trận</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Mỗi quà bật có một cấp quân triệu hồi và hiệu ứng riêng. Chọn bất kỳ quà trong danh mục TikTok để thay, thêm mới, sửa hoặc xóa.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAddModal}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400"
          >
            + Thêm quà
          </button>
          <button
            type="button"
            onClick={syncTikTok}
            disabled={syncing}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 ring-1 ring-slate-600 hover:bg-slate-700 disabled:opacity-50"
          >
            {syncing ? '↻ Đang đồng bộ...' : '↻ Đồng bộ TikTok'}
          </button>
        </div>
      </div>

      {/* Status pills & team selector bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 font-medium text-emerald-300 ring-1 ring-emerald-500/30">
            {enabledCount} đang bật
          </span>
          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-300 ring-1 ring-slate-700">
            {catalog.length > 0 ? `${unassignedCount} chưa gán` : 'Chưa đồng bộ danh mục'}
          </span>
          <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-400 ring-1 ring-slate-700">
            {disabledCount} đang tắt
          </span>
          {syncedAt && (
            <span className="text-slate-500">
              Cập nhật {new Date(syncedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400">Phe test:</span>
          <button
            type="button"
            onClick={() => onSideChange('1')}
            className={`rounded-md px-2 py-1 font-medium ${side === '1' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            Phe Đỏ (1)
          </button>
          <button
            type="button"
            onClick={() => onSideChange('2')}
            className={`rounded-md px-2 py-1 font-medium ${side === '2' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            Phe Xanh (2)
          </button>
          <button
            type="button"
            onClick={() => void onResetDefaults()}
            disabled={saving}
            className="ml-1 rounded-md bg-slate-800/80 px-2 py-1 text-slate-300 hover:bg-slate-700"
            title="Khôi phục đúng 5 quà gốc ban đầu"
          >
            ↺ 5 quà mặc định
          </button>
        </div>
      </div>

      {syncMsg && <div className="text-xs text-amber-300">{syncMsg}</div>}

      {/* 2-Column Gift Cards Grid matching Image 1 */}
      {rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
          Chưa có quà triệu hồi nào. Bấm <b>+ Thêm quà</b> hoặc <b>↺ 5 quà mặc định</b> để tạo lại danh sách.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rules.map((rule) => {
            const tierMeta = UNIT_TIER_MAP[rule.tier];
            const isAssigned = !!(rule.giftId || rule.giftName);
            const isConfirming = confirmDeleteId === rule.id;
            return (
              <div
                key={rule.id}
                className={`flex flex-col justify-between rounded-xl border p-3.5 transition ${
                  rule.enabled
                    ? 'border-slate-700/90 bg-slate-900/90'
                    : 'border-slate-800/70 bg-slate-900/40 opacity-70'
                }`}
              >
                {/* Title & description */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-slate-100">{rule.title}</h4>
                        <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/30">
                          {tierMeta.label} ×{rule.count}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {rule.description || `Triệu hồi ${rule.count} ${tierMeta.label} khi nhận quà.`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onTestGift(rule)}
                      disabled={!rule.enabled || !isAssigned}
                      className="shrink-0 rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-amber-300 ring-1 ring-slate-700 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Thả thử quà này lên sân đấu"
                    >
                      ▶ Thử
                    </button>
                  </div>

                  {/* Assigned Gift Showcase Row */}
                  <div className="mt-3 flex items-center gap-3 rounded-lg bg-slate-950/70 p-2 ring-1 ring-slate-800/90">
                    {isAssigned ? (
                      <GiftThumb src={rule.iconUrl} tier={rule.tier} alt={rule.giftName || rule.title} />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-700 text-lg text-slate-500">
                        🎁
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-100">
                        {isAssigned ? rule.giftName || `Quà #${rule.giftId}` : 'Chưa gán quà TikTok'}
                      </div>
                      <div className="text-xs text-slate-400">
                        {isAssigned
                          ? `Đã gán · ${rule.diamondCount.toLocaleString('vi-VN')} xu`
                          : 'Bấm "Thay quà" để chọn quà từ danh mục TikTok'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Action Bar */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openPickerForRule(rule.id)}
                      className="rounded-lg bg-slate-800 px-2.5 py-1.5 font-medium text-slate-100 ring-1 ring-slate-600 hover:bg-slate-700"
                    >
                      Thay quà
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(rule)}
                      className="rounded-lg bg-slate-800 px-2.5 py-1.5 font-medium text-slate-200 hover:bg-slate-700"
                    >
                      Sửa
                    </button>
                    {isConfirming ? (
                      <>
                        <button
                          type="button"
                          onClick={() => deleteRule(rule.id)}
                          className="rounded-lg bg-red-600 px-2.5 py-1.5 font-semibold text-white hover:bg-red-500"
                        >
                          Xóa luôn
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg bg-slate-800 px-2 py-1.5 text-slate-300 hover:bg-slate-700"
                        >
                          Hủy
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(rule.id)}
                        className="rounded-lg bg-slate-800 px-2.5 py-1.5 font-medium text-red-300 hover:bg-red-950/60"
                      >
                        Xóa
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {isAssigned && (
                      <button
                        type="button"
                        onClick={() => unassignGift(rule.id)}
                        className="font-medium text-slate-400 hover:text-slate-200"
                      >
                        Bỏ gán
                      </button>
                    )}
                    <label className="flex cursor-pointer items-center gap-1.5 font-semibold text-slate-200">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => toggleEnabled(rule.id)}
                        className="h-4 w-4 rounded accent-emerald-500"
                      />
                      <span>{rule.enabled ? 'Bật' : 'Tắt'}</span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TikTok Gift Catalog Picker Modal */}
      {(pickerRuleId !== null || pickingForEditor) && (
        <GiftCatalogModal
          title={pickerTitle}
          catalog={catalog}
          syncing={syncing}
          selectedGiftId={currentPickerGiftId}
          onSync={syncTikTok}
          onPick={assignCatalogGift}
          onClose={() => {
            setPickerRuleId(null);
            setPickingForEditor(false);
          }}
        />
      )}

      {/* Add / Edit Rule Modal */}
      {editingRule && !pickingForEditor && (
        <GiftEditModal
          draft={editingRule}
          isNew={isNewRule}
          onPickFromCatalog={() => {
            setPickingForEditor(true);
            if (catalog.length === 0 && !syncing) void syncTikTok();
          }}
          onSave={saveEditorModal}
          onClose={() => setEditingRule(null)}
        />
      )}
    </div>
  );
}

function GiftCatalogModal({
  title,
  catalog,
  syncing,
  selectedGiftId,
  onSync,
  onPick,
  onClose,
}: {
  title: string;
  catalog: TikTokCatalogGift[];
  syncing: boolean;
  selectedGiftId: number | null;
  onSync: () => void;
  onPick: (gift: TikTokCatalogGift) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [coinFilter, setCoinFilter] = useState<CoinFilter>('all');
  const [limit, setLimit] = useState(96);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const fn = COIN_FILTERS.find((f) => f.id === coinFilter)?.match || (() => true);
    return catalog.filter((g) => fn(g.diamondCount) && (!q || g.name.toLowerCase().includes(q) || String(g.id).includes(q)));
  }, [catalog, query, coinFilter]);

  const visible = filtered.slice(0, limit);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-amber-300">Chọn quà TikTok cho "{title}"</h3>
            <p className="text-xs text-slate-400">
              Danh mục gồm {catalog.length} quà đồng bộ trực tiếp từ TikTok LIVE.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSync}
              disabled={syncing}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              {syncing ? '↻ Đang tải...' : '↻ Đồng bộ lại'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
            >
              Đóng ✕
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(96);
            }}
            placeholder="Tìm tên quà hoặc ID TikTok (vd: Rose, Corgi, Galaxy, Donut...)"
            className="min-w-0 flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-amber-500"
            autoFocus
          />
          <div className="flex flex-wrap gap-1">
            {COIN_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setCoinFilter(f.id);
                  setLimit(96);
                }}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                  coinFilter === f.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto pr-1">
          {catalog.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              {syncing ? 'Đang tải danh sách quà từ TikTok...' : 'Chưa có danh mục quà. Hãy bấm "Đồng bộ lại" để tải từ TikTok.'}
            </div>
          ) : visible.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">Không tìm thấy quà nào khớp bộ lọc.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {visible.map((g) => {
                const active = selectedGiftId === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onPick(g)}
                    className={`flex flex-col items-center rounded-xl border p-2.5 text-center transition ${
                      active
                        ? 'border-amber-400 bg-amber-500/15'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-600 hover:bg-slate-800/80'
                    }`}
                  >
                    <img
                      src={g.iconUrl || '/img/game/gift_rose.webp'}
                      alt={g.name}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="h-12 w-12 object-contain"
                    />
                    <div className="mt-1.5 line-clamp-1 w-full text-xs font-semibold text-slate-100">{g.name}</div>
                    <div className="mt-0.5 text-[11px] font-medium text-amber-300">🪙 {g.diamondCount.toLocaleString('vi-VN')} xu</div>
                  </button>
                );
              })}
            </div>
          )}

          {filtered.length > limit && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setLimit((n) => n + 96)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
              >
                Xem thêm ({filtered.length - limit} quà nữa)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GiftEditModal({
  draft,
  isNew,
  onPickFromCatalog,
  onSave,
  onClose,
}: {
  draft: GiftRule;
  isNew: boolean;
  onPickFromCatalog: () => void;
  onSave: (next: GiftRule) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<GiftRule>(draft);
  const [aliasText, setAliasText] = useState((draft.aliases || []).join(', '));

  useEffect(() => {
    setForm(draft);
    setAliasText((draft.aliases || []).join(', '));
  }, [draft]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const aliases = aliasText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    onSave({ ...form, aliases });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-3 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h3 className="text-base font-bold text-amber-300">{isNew ? 'Thêm quà triệu hồi mới' : `Sửa quà · ${draft.title}`}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700"
          >
            Đóng ✕
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-300 sm:col-span-2">
            Tên hiển thị trên màn hình
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-amber-500"
              placeholder="Ví dụ: Triệu hồi kỵ sĩ rồng"
            />
          </label>

          <label className="text-xs text-slate-300 sm:col-span-2">
            Mô tả ngắn
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 ring-1 ring-slate-700"
              placeholder="Hiệu ứng và vai trò của đơn vị triệu hồi"
            />
          </label>

          <label className="text-xs text-slate-300">
            Cấp quân triệu hồi
            <select
              value={form.tier}
              onChange={(e) => {
                const nextTier = e.target.value as UnitTierId;
                setForm({
                  ...form,
                  tier: nextTier,
                  count: UNIT_TIER_MAP[nextTier].defaultCount,
                  iconUrl: form.giftId ? form.iconUrl : UNIT_TIER_MAP[nextTier].fallbackIcon,
                });
              }}
              className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 ring-1 ring-slate-700"
            >
              {UNIT_TIERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-300">
            Số quân triệu hồi / 1 quà
            <input
              type="number"
              min={1}
              max={20}
              value={form.count}
              onChange={(e) => setForm({ ...form, count: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
              className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 ring-1 ring-slate-700"
            />
          </label>
        </div>

        {/* Assigned TikTok Gift block */}
        <div className="space-y-2 rounded-xl bg-slate-950/70 p-3 ring-1 ring-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <GiftThumb src={form.iconUrl} tier={form.tier} alt={form.giftName || form.title} className="h-11 w-11" />
              <div className="text-xs">
                <div className="font-semibold text-slate-100">{form.giftName || 'Chưa chọn quà TikTok'}</div>
                <div className="text-slate-400">
                  {form.giftId ? `ID #${form.giftId} · ${form.diamondCount} xu` : 'Nhập tay hoặc chọn từ TikTok'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onPickFromCatalog}
              className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/40 hover:bg-amber-500/30"
            >
              Chọn quà TikTok
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <label className="text-[11px] text-slate-400">
              Tên quà khớp TikTok
              <input
                value={form.giftName}
                onChange={(e) => setForm({ ...form, giftName: e.target.value })}
                placeholder="Rose, Rosa, Doughnut, Corgi..."
                className="mt-0.5 w-full rounded-md bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100 ring-1 ring-slate-700"
              />
            </label>
            <label className="text-[11px] text-slate-400">
              Giá xu
              <input
                type="number"
                min={0}
                value={form.diamondCount}
                onChange={(e) => setForm({ ...form, diamondCount: Math.max(0, Number(e.target.value) || 0) })}
                className="mt-0.5 w-full rounded-md bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100 ring-1 ring-slate-700"
              />
            </label>
          </div>

          <label className="block text-[11px] text-slate-400">
            Tên gọi phụ (cách nhau bằng dấu phẩy)
            <input
              value={aliasText}
              onChange={(e) => setAliasText(e.target.value)}
              placeholder="Ví dụ: Hoa hồng, Donut, Mũ"
              className="mt-0.5 w-full rounded-md bg-slate-800 px-2.5 py-1.5 text-xs text-slate-100 ring-1 ring-slate-700"
            />
          </label>
        </div>

        <div className="flex items-center justify-between pt-2">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-200">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="h-4 w-4 accent-emerald-500"
            />
            Bật quà triệu hồi này ngay
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400"
            >
              {isNew ? 'Thêm quà' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

