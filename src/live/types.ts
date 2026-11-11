export interface LiveStatus {
  isConnected: boolean;
  isConnecting: boolean;
  username: string;
  roomId: string;
  viewerCount: number;
  totalLikes: number;
  error?: string;
  stages: number;
}

export interface ChatEvent {
  username: string;
  nickname: string;
  comment: string;
  avatar: string;
  timestamp: number;
}

export interface GiftEvent {
  username: string;
  nickname: string;
  giftName: string;
  giftId: number;
  diamondCount: number;
  repeatCount: number;
  avatar: string;
  timestamp: number;
}

export interface ViewerEvent {
  username: string;
  nickname: string;
  avatar: string;
  timestamp: number;
}

export interface LikeEvent {
  username: string;
  nickname: string;
  likeCount: number;
  totalLikes: number;
}

export interface ControlEvent {
  action: 'speak' | 'setRate' | 'reset' | 'setName' | 'setVoice' | 'setTheme' | 'setPrefs' | 'custom';
  text?: string;
}

export type UnitTierId = 'soldier' | 'archer' | 'dragonKnight' | 'boneDragon' | 'eagleDragonLord';

export interface GiftRule {
  id: string;
  title: string;
  description: string;
  tier: UnitTierId;
  count: number;
  enabled: boolean;
  giftId: number | null;
  giftName: string;
  aliases?: string[];
  diamondCount: number;
  iconUrl: string;
}

export interface TikTokCatalogGift {
  id: number;
  name: string;
  diamondCount: number;
  iconUrl: string;
  describe?: string;
}

