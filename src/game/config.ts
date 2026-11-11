import type { WishTopic } from '../live/chatter';

export const GAME = {
  title: 'Long Ưng Chiến Trường',
  subtitle: 'Đại Chiến 3 Đường',
  defaultChannelName: 'kênh mình',

  mc: {
    mcOn: '1',
    mcVoice: 'Nam Minh',
    mcSpeed: '1.15',
    mcExpr: '0.95',
    musicVol: '0.5',
    sfxVol: '1',
    mcVol: '1',
  } as Record<string, string>,

  voices: ['Nam Minh', 'Hoài My', 'Adam bựa', 'Thiện Minh', 'Hải Đăng', 'Trúc Ly', 'Mai Anh'],

  wishPerUserMs: 10 * 60_000,
  wishGlobalMs: 30_000,
  wishReplies: {
    exam: [(name: string) => `Chúc ${name} thi đâu đậu đó nha!`],
    health: [(name: string) => `Chúc ${name} với người nhà thật nhiều sức khỏe nha.`],
    love: [(name: string) => `Chúc ${name} sớm gặp được chân ái nha.`],
    family: [(name: string) => `Chúc gia đình ${name} lúc nào cũng sum vầy vui vẻ.`],
    work: [(name: string) => `Chúc ${name} công việc hanh thông, thăng tiến nha.`],
    wealth: [(name: string) => `Chúc ${name} buôn may bán đắt, tài lộc dồi dào.`],
    peace: [(name: string) => `Chúc ${name} vạn sự bình an trên chiến trường lẫn ngoài đời.`],
  } as Record<WishTopic, ((name: string) => string)[]>,
};

