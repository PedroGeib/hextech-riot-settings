// Profile icon with the same border the League client draws around it:
// the level ("prestige") ring, the ranked wings, or none.

import { escapeHtml } from '../../lib/html.js';
import { FALLBACK_ICON_URL, crestBorder, profileIconUrl } from '../../lib/regalia.js';

/** @param {{ iconId?: number, level?: number, regalia?: object, size?: number }} options  size = icon diameter in px */
export function crestHtml({ iconId, level, regalia, size = 84 }) {
  const border = crestBorder(regalia ?? {}, level);
  return `
    <div class="regalia-crest regalia-crest--${border.type}" style="--crest-size: ${Number(size)}px;">
      <div class="regalia-crest__icon">
        <img src="${escapeHtml(profileIconUrl(iconId))}" data-fallback="${FALLBACK_ICON_URL}" alt="" />
      </div>
      ${border.url ? `<img class="regalia-crest__border" src="${escapeHtml(border.url)}" alt="" aria-hidden="true" />` : ''}
    </div>`;
}
