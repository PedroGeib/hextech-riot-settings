// Escaping for values interpolated into HTML templates. Config values, profile
// names and account names all come from files or the Riot client, so none of
// them may reach innerHTML unescaped.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}
