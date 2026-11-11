import { useEffect, useRef, useState } from 'react';
import { cloneDefaultGifts } from '../game/gifts';
import { IS_STAGE, STAGE_ID } from './page';
import type { ChatEvent, ControlEvent, GiftEvent, GiftRule, LikeEvent, LiveStatus, ViewerEvent } from './types';

export interface LiveEventHandlers {
  onChat?: (ev: ChatEvent) => void;
  onGift?: (ev: GiftEvent) => void;
  onMember?: (ev: ViewerEvent) => void;
  onFollow?: (ev: ViewerEvent) => void;
  onShare?: (ev: ViewerEvent) => void;
  onLike?: (ev: LikeEvent) => void;
  onControl?: (ev: ControlEvent) => void;
  onGiftsChange?: (rules: GiftRule[]) => void;
  onSpeakerChange?: (isSpeaker: boolean) => void;
}

export function useLiveEvents(handlers: LiveEventHandlers) {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [channelName, setChannelName] = useState('kênh mình');
  const [voiceWho, setVoiceWho] = useState<'M' | 'F'>('M');
  const [theme, setTheme] = useState('default');
  const [prefs, setPrefs] = useState<Record<string, string>>({});
  const [giftRules, setGiftRules] = useState<GiftRule[]>(() => cloneDefaultGifts());

  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const url = IS_STAGE ? `/api/tiktok/events?stage=${encodeURIComponent(STAGE_ID)}` : '/api/tiktok/events';
    const es = new EventSource(url);

    const safeJson = <T,>(raw: string): T | null => {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    };

    es.addEventListener('status', (e) => {
      const data = safeJson<LiveStatus>(e.data);
      if (data) setStatus(data);
    });

    es.addEventListener('speaker', (e) => {
      const info = safeJson<{ id: string | null; count: number }>(e.data);
      const active = IS_STAGE && !!info && info.id === STAGE_ID;
      setIsSpeaker(active);
      ref.current.onSpeakerChange?.(active);
    });

    es.addEventListener('roomUser', (e) => {
      const data = safeJson<{ viewerCount?: number }>(e.data);
      if (typeof data?.viewerCount === 'number') {
        setStatus((prev) => (prev ? { ...prev, viewerCount: data.viewerCount! } : prev));
      }
    });

    es.addEventListener('chat', (e) => {
      const data = safeJson<ChatEvent>(e.data);
      if (data) ref.current.onChat?.(data);
    });

    es.addEventListener('gift', (e) => {
      const data = safeJson<GiftEvent>(e.data);
      if (data) ref.current.onGift?.(data);
    });

    es.addEventListener('member', (e) => {
      const data = safeJson<ViewerEvent>(e.data);
      if (data) ref.current.onMember?.(data);
    });

    es.addEventListener('follow', (e) => {
      const data = safeJson<ViewerEvent>(e.data);
      if (data) ref.current.onFollow?.(data);
    });

    es.addEventListener('share', (e) => {
      const data = safeJson<ViewerEvent>(e.data);
      if (data) ref.current.onShare?.(data);
    });

    es.addEventListener('like', (e) => {
      const data = safeJson<LikeEvent>(e.data);
      if (data) ref.current.onLike?.(data);
    });

    es.addEventListener('control', (e) => {
      const data = safeJson<ControlEvent>(e.data);
      if (!data) return;
      if (data.action === 'setName' && data.text) setChannelName(data.text);
      if (data.action === 'setVoice' && (data.text === 'M' || data.text === 'F')) setVoiceWho(data.text);
      if (data.action === 'setTheme' && data.text) setTheme(data.text);
      if (data.action === 'setPrefs' && data.text) {
        const parsed = safeJson<Record<string, string>>(data.text);
        if (parsed) setPrefs(parsed);
      }
      ref.current.onControl?.(data);
    });

    es.addEventListener('gifts', (e) => {
      const data = safeJson<{ rules?: GiftRule[] }>(e.data);
      if (Array.isArray(data?.rules)) {
        setGiftRules(data.rules);
        ref.current.onGiftsChange?.(data.rules);
      }
    });

    return () => {
      es.close();
    };
  }, []);

  return { status, isSpeaker, channelName, voiceWho, theme, prefs, giftRules };
}

