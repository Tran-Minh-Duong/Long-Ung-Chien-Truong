import type { Team } from './unitConfig';
import type { TacticalRoute } from './waypoints';

export type ParsedCommand =
  | { kind: 'join'; team: Team }
  | { kind: 'route'; route: TacticalRoute }
  | { kind: 'joinAndRoute'; team: Team; route: TacticalRoute };

const PROFANE_TOKENS = [
  'dit',
  'dm',
  'dcm',
  'dkm',
  'dmm',
  'vcl',
  'vl',
  'vkl',
  'vcc',
  'cc',
  'cl',
  'clm',
  'lon',
  'l0n',
  'buoi',
  'cac',
  'cu',
  'du',
  'duma',
  'dume',
  'me',
  'chich',
  'xoac',
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'dick',
  'cock',
  'pussy',
  'whore',
  'slut',
  'nigger',
  'nigga',
  'cunt',
];

// Chỉ chặn các token ngắn nhạy cảm khi tách từ độc lập để tránh chặn nhầm tên bình thường như "Cường", "Minh", "Mẹ"...
const EXACT_PROFANE_WORDS = new Set([
  'dm',
  'dcm',
  'dkm',
  'dmm',
  'vcl',
  'vl',
  'vkl',
  'vcc',
  'cc',
  'cl',
  'clm',
  'lon',
  'l0n',
  'cac',
  'du',
  'dit',
  'djt',
  'buoi',
  'fuck',
  'shit',
  'bitch',
  'dick',
  'cock',
  'pussy',
  'cunt',
  'slut',
  'whore',
  'asshole',
  'nigger',
  'nigga',
]);

const SUBSTRING_PROFANE_WORDS = [
  'duma',
  'dume',
  'ditme',
  'ditconme',
  'djtme',
  'concho',
  'matday',
  'occho',
  'caiconcac',
  'cailon',
  'fuck',
  'bitch',
  'asshole',
  'nigger',
];

function stripDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function normalizeProfanityText(input: string): string {
  return stripDiacritics(input)
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's');
}

/**
 * Kiểm tra chuỗi có chứa từ ngữ nhạy cảm / tục tĩu hay không.
 */
export function containsProfanity(text: string): boolean {
  if (!text) return false;
  const normalized = normalizeProfanityText(text);
  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  for (const token of tokens) {
    if (EXACT_PROFANE_WORDS.has(token)) return true;
  }

  // Bắt biến thể chèn ký tự phân tách bên trong từ như d.i.t, v-c-l, l_0_n
  const collapsedPunct = normalized.replace(/[._\-*]+/g, '').split(/\s+/).filter(Boolean);
  for (const token of collapsedPunct) {
    if (EXACT_PROFANE_WORDS.has(token)) return true;
  }

  const compact = normalized.replace(/[^a-z0-9]/g, '');
  if (EXACT_PROFANE_WORDS.has(compact)) return true;
  for (const bad of SUBSTRING_PROFANE_WORDS) {
    if (compact.includes(bad)) return true;
  }
  return false;
}

/**
 * Lọc tên hiển thị người chơi cho Canvas và MC đọc TTS.
 * Nếu nickname nhạy cảm sẽ thay bằng username (nếu sạch) hoặc "Tướng Quân".
 */
export function sanitizePlayerName(nickname: string, username?: string): string {
  const cleanNick = (nickname || '').replace(/[\r\n\t]+/g, ' ').trim();
  const cleanUser = (username || '').replace(/^@/, '').replace(/[\r\n\t]+/g, ' ').trim();

  if (cleanNick && !containsProfanity(cleanNick)) {
    return cleanNick.slice(0, 22);
  }
  if (cleanUser && !containsProfanity(cleanUser)) {
    return cleanUser.slice(0, 22);
  }
  return 'Tướng Quân';
}

/**
 * Kiểm tra từ khóa ẩn dùng để tham khảo nhanh khi cần che ký tự.
 */
export function maskProfanity(text: string): string {
  let out = text;
  for (const word of PROFANE_TOKENS) {
    if (word.length < 3) continue;
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    out = out.replace(regex, '***');
  }
  return out;
}

function tokenToRoute(token: string): TacticalRoute | null {
  switch (token) {
    case 'top':
      return 'top';
    case 'mid':
      return 'mid';
    case 'adc':
    case 'bot':
      return 'bot';
    case 'bac':
      return 'bac';
    case 'upatk':
      return 'upatk';
    case 'downatk':
      return 'downatk';
    default:
      return null;
  }
}

/**
 * Phân tích comment từ người xem:
 * Chấp nhận viết thường, viết hoa, khoảng trắng thừa và dấu câu nhẹ ở đầu/cuối.
 * Lệnh hợp lệ: 1, 2, top, mid, adc, bac, upatk, downatk (và cặp "1 top", "2 upatk").
 */
export function parseCommand(rawComment: string): ParsedCommand | null {
  if (!rawComment) return null;
  const cleaned = stripDiacritics(rawComment)
    .toLowerCase()
    .replace(/[!.,?;:~`"']+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return null;

  const parts = cleaned.split(' ');
  if (parts.length === 1) {
    const token = parts[0];
    if (token === '1') return { kind: 'join', team: 'red' };
    if (token === '2') return { kind: 'join', team: 'blue' };
    const route = tokenToRoute(token);
    if (route) return { kind: 'route', route };
    return null;
  }

  // Hỗ trợ người xem gõ gộp 1 lần kiểu "1 top" hoặc "2 upatk"
  if (parts.length === 2) {
    const team: Team | null = parts[0] === '1' ? 'red' : parts[0] === '2' ? 'blue' : null;
    const route = tokenToRoute(parts[1]);
    if (team && route) {
      return { kind: 'joinAndRoute', team, route };
    }
  }

  return null;
}
