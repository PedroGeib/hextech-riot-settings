// Profile names are free text (usually the account name); the file name on
// disk must be a valid Windows file name that cannot escape the profiles folder.

export const SLOT_NAMES = ['Slot_1', 'Slot_2'];

const FORBIDDEN_CHARS = '<>:"/\\|?*';
const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

const isForbidden = (ch) => ch.charCodeAt(0) < 32 || FORBIDDEN_CHARS.includes(ch);

export function profileFileName(name) {
  let base = Array.from(String(name ?? ''), (ch) => (isForbidden(ch) ? '_' : ch))
    .join('')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 100);
  if (!base) base = 'profile';
  if (RESERVED.test(base)) base = `_${base}`;
  return `${base}.json`;
}

export function isSlotProfile(name) {
  return SLOT_NAMES.includes(name);
}
