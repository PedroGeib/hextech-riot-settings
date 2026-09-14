// Keeps rewritten files looking like the originals Riot wrote (line endings,
// indentation), so a save shows up as a minimal diff.

export function detectEol(text) {
  return /\r\n/.test(String(text ?? '')) ? '\r\n' : '\n';
}

export function detectIndent(text, fallback = 4) {
  const match = /\n([ \t]+)\S/.exec(String(text ?? ''));
  if (!match) return fallback;
  return match[1].includes('\t') ? '\t' : match[1].length;
}

export function withEol(text, eol) {
  return String(text).replace(/\r?\n/g, eol);
}
