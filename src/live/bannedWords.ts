const BANNED_TOKENS = new Set([
  'lồn', 'lìn', 'cặc', 'buồi', 'đéo', 'địt', 'đụ', 'đĩ', 'cứt', 'đm', 'đmm', 'đcm', 'đkm',
  'dm', 'dmm', 'dcm', 'dkm', 'vcl', 'vkl', 'vcc', 'clgt', 'loz', 'dit', 'ditme', 'dume', 'cmm',
  'fuck', 'fck', 'fuk', 'shit', 'bitch', 'dick', 'pussy', 'sex', 'sexy', 'porn', 'nude', 'xxx', 'cave',
  'giết', 'chém', 'casino', 'scam',
]);

const BANNED_PHRASES = [
  'địt mẹ', 'đụ má', 'đù má', 'đéo mẹ', 'con đĩ', 'dit me', 'du ma', 'ditme',
  'ma túy', 'ma tuý', 'thuốc lắc', 'cần sa', 'cá độ', 'lô đề', 'cờ bạc', 'chuyển khoản', 'lừa đảo',
];

const normalize = (text: string) => text.normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
const tokensOf = (text: string) => normalize(text).split(/[^\p{L}\p{M}\p{N}]+/u).filter(Boolean);

export function containsBanned(text: string): boolean {
  if (!text) return false;
  const tokens = tokensOf(text);
  if (tokens.some((t) => BANNED_TOKENS.has(t))) return true;
  // Bắt kiểu lách dấu chấm / gạch giữa ký tự như "d.i.t" hoặc "đ.ị.t"
  const compact = text.normalize('NFC').toLowerCase().replace(/[.\-_*]+/g, '');
  const compactTokens = tokensOf(compact);
  if (compactTokens.some((t) => BANNED_TOKENS.has(t))) return true;
  const joined = ` ${tokens.join(' ')} `;
  return BANNED_PHRASES.some((p) => joined.includes(` ${p} `));
}

export function maskBanned(text: string): string {
  if (!containsBanned(text)) return text;
  let out = text.replace(/[\p{L}\p{M}\p{N}]+/gu, (w) =>
    BANNED_TOKENS.has(w.normalize('NFC').toLowerCase()) ? '***' : w,
  );
  for (const p of BANNED_PHRASES) {
    out = out.replace(new RegExp(p.replace(/ /g, '\\s+'), 'giu'), '***');
  }
  return out === text ? '***' : out;
}

