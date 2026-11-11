import { containsBanned } from './bannedWords';

const DIGITS: Record<string, string> = {
  '0': 'không',
  '1': 'một',
  '2': 'hai',
  '3': 'ba',
  '4': 'bốn',
  '5': 'năm',
  '6': 'sáu',
  '7': 'bảy',
  '8': 'tám',
  '9': 'chín',
};

const NAME_STARTS = [
  'hoang', 'tuyet', 'thanh', 'trung', 'quang', 'minh', 'ngoc', 'phuc', 'xuan', 'quoc',
  'viet', 'tien', 'tuan', 'hong', 'duy', 'van', 'kim', 'hai', 'nam',
];

const MAX_WORDS = 5;

export function speakableName(nickname: string): string {
  if (!nickname) return 'bạn';

  let clean = nickname
    .normalize('NFKC')
    .replace(/[\u{FE00}-\u{FE0F}‍⃣]/gu, '')
    .replace(/[^\p{L}\p{M}\p{N}\s._-]/gu, ' ')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean || containsBanned(clean)) return 'bạn';

  clean = clean
    .replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')
    .replace(/(\p{L})(\d)/gu, '$1 $2')
    .replace(/(\d)(\p{L})/gu, '$1 $2')
    .replace(/[._-]+/g, ' ');

  const out: string[] = [];
  for (const w of clean.split(/\s+/).filter(Boolean)) {
    if (/^\d+$/.test(w)) {
      if (w.length <= 4) out.push(w.split('').map((d) => DIGITS[d]).join(' '));
      continue;
    }
    const start = /^[a-z]+$/.test(w)
      ? NAME_STARTS.find((p) => w.startsWith(p) && w.length - p.length >= 2)
      : undefined;
    if (start) out.push(start, w.slice(start.length));
    else out.push(w);
  }

  const spoken = out.slice(0, MAX_WORDS).join(' ').trim();
  return spoken || 'bạn';
}

