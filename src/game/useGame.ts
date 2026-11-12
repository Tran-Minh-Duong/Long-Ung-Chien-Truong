import { useCallback, useRef } from 'react';
import { containsBanned } from '../live/bannedWords';
import { detectWish, makePicker, WishLimiter } from '../live/chatter';
import { speakableName } from '../live/names';
import { useLiveEvents } from '../live/useLiveEvents';
import { GAME } from './config';
import { sanitizePlayerName } from './commandParser';
import { gameApi } from './frame';

export function useGame() {
  const wishLimiter = useRef(new WishLimiter(GAME.wishPerUserMs, GAME.wishGlobalMs));
  const pick = useRef(makePicker());

  const live = useLiveEvents({
    onSpeakerChange: (active) => {
      gameApi()?.setSpeaker(active);
    },

    onChat: (ev) => {
      const api = gameApi();
      const safeName = sanitizePlayerName(ev.nickname, ev.username);
      const spoken = speakableName(ev.nickname);
      api?.event({
        type: 'comment',
        user: ev.username,
        name: safeName,
        spokenName: spoken,
        text: ev.comment,
        avatar: ev.avatar,
      });

      if (!containsBanned(ev.comment)) {
        const topic = detectWish(ev.comment);
        if (topic && spoken !== 'bạn' && wishLimiter.current.allow(ev.username)) {
          const line = pick.current(GAME.wishReplies[topic])?.(spoken);
          if (line) api?.sayText(line, 1);
        }
      }
    },

    onGift: (ev) => {
      const safeName = sanitizePlayerName(ev.nickname, ev.username);
      const spoken = speakableName(ev.nickname);
      gameApi()?.event({
        type: 'gift',
        user: ev.username,
        name: safeName,
        spokenName: spoken,
        giftName: ev.giftName,
        giftId: ev.giftId,
        coins: ev.diamondCount,
        count: ev.repeatCount,
        avatar: ev.avatar,
      });
    },

    onLike: (ev) => {
      gameApi()?.event({
        type: 'like',
        user: ev.username,
        name: sanitizePlayerName(ev.nickname, ev.username),
        count: ev.likeCount,
        avatar: ev.avatar,
      });
    },

    onFollow: (ev) => {
      gameApi()?.event({
        type: 'follow',
        user: ev.username,
        name: sanitizePlayerName(ev.nickname, ev.username),
        spokenName: speakableName(ev.nickname),
        avatar: ev.avatar,
      });
    },

    onShare: (ev) => {
      gameApi()?.event({
        type: 'share',
        user: ev.username,
        name: sanitizePlayerName(ev.nickname, ev.username),
        spokenName: speakableName(ev.nickname),
        avatar: ev.avatar,
      });
    },

    onMember: (ev) => {
      gameApi()?.event({
        type: 'member',
        user: ev.username,
        name: sanitizePlayerName(ev.nickname, ev.username),
        spokenName: speakableName(ev.nickname),
        avatar: ev.avatar,
      });
    },

    onControl: (ev) => {
      const api = gameApi();
      if (!api) return;
      if (ev.action === 'speak' && ev.text) api.sayText(ev.text, 5);
      else if (ev.action === 'reset') api.newMatch();
      else if (ev.action === 'setRate' && ev.text) api.setMc({ mcSpeed: ev.text });
      else if (ev.action === 'setVoice' && (ev.text === 'M' || ev.text === 'F')) {
        api.setMc({ mcVoice: ev.text === 'F' ? 'Hoài My' : 'Nam Minh' });
      } else if (ev.action === 'setPrefs' && ev.text) {
        try {
          const parsed = JSON.parse(ev.text) as Record<string, string>;
          api.setMc(parsed);
        } catch {
          // Bỏ qua JSON sai định dạng
        }
      } else if (ev.action === 'custom' && ev.text) {
        if (ev.text === 'match') api.newMatch();
        else if (ev.text.startsWith('len:')) {
          const sec = Number(ev.text.slice(4));
          if (sec > 0) api.setLength(sec);
        } else if (ev.text.startsWith('jump:')) {
          const j = Number(ev.text.slice(5));
          if (!Number.isNaN(j)) api.jump(j);
        } else if (ev.text === 'siegeVote') {
          api.startSiegeVote?.();
        } else if (ev.text.startsWith('spawnSiege:')) {
          const [side, lane] = ev.text.slice('spawnSiege:'.length).split(':');
          if ((side === '0' || side === '1') && (lane === 'top' || lane === 'mid' || lane === 'bot')) {
            api.spawnSiegeTank?.(Number(side), lane);
          }
        } else if (ev.text === 'overtime') {
          api.startOvertime?.();
        } else if (ev.text.startsWith('contest:')) {
          api.testBossContest?.(ev.text.slice(8) as 'drag' | 'baron');
        } else if (ev.text.startsWith('moment:')) {
          api.testMoment?.(ev.text.slice(7) as 'turret' | 'boss' | 'lord');
        } else if (ev.text === 'toggleLeaderboard') {
          api.toggleLeaderboard?.();
        } else if (ev.text === 'showLeaderboard') {
          api.toggleLeaderboard?.(true);
        } else if (ev.text === 'hideLeaderboard') {
          api.toggleLeaderboard?.(false);
        }
      }
    },

    onGiftsChange: (rules) => {
      gameApi()?.setGifts?.(rules);
    },
  });

  const syncFrame = useCallback(() => {
    const api = gameApi();
    if (!api) return;
    api.setSpeaker(live.isSpeaker);
    api.setMc({ ...GAME.mc, mcVoice: live.voiceWho === 'F' ? 'Hoài My' : 'Nam Minh', ...live.prefs });
    api.setGifts?.(live.giftRules);
  }, [live.isSpeaker, live.voiceWho, live.prefs, live.giftRules]);

  return { ...live, syncFrame };
}
