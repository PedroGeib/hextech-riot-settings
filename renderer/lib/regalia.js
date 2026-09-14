// Images the League client shows for a profile: icon, crest border and banner.
// They come from CommunityDragon, which mirrors the client's own assets, so
// new icons work as soon as the client has them.

const CDRAGON = 'https://raw.communitydragon.org/latest/plugins';
const GAME_DATA = `${CDRAGON}/rcp-be-lol-game-data/global/default`;
const STATIC_IMAGES = `${CDRAGON}/rcp-fe-lol-static-assets/global/default/images`;

export const FALLBACK_ICON_URL = 'assets/lol-profile/profile_unranked.png';

const DEFAULT_BANNER_PATH = '/lol-game-data/assets/ASSETS/Regalia/BannerSkins/default.png';
const DEFAULT_BANNER_ID = '1';
// Banner whose variants (idSecondary) follow last season's highest rank.
const PAST_RANK_BANNER_ID = '2';
const MAX_LEVEL_THEME = 21;
const RANKED_TIERS = new Set([
  'IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER',
]);

/** '/lol-game-data/assets/ASSETS/X.png' → CommunityDragon URL (paths are lowercased there). */
export function gameDataAssetUrl(assetPath) {
  const match = /^\/lol-game-data\/assets\/(.+)$/i.exec(String(assetPath ?? ''));
  return match ? `${GAME_DATA}/${match[1].toLowerCase()}` : null;
}

export function profileIconUrl(iconId) {
  const id = Number(iconId);
  if (iconId === null || iconId === undefined || iconId === '' || !Number.isInteger(id) || id < 0) return FALLBACK_ICON_URL;
  return `${GAME_DATA}/v1/profile-icons/${id}.jpg`;
}

/** Same thresholds as the client's themed level ring (lol-uikit-themed-level-ring-v2). */
export function levelTheme(level) {
  if (level < 30) return 1;
  if (level < 50) return 2;
  return Math.min(Math.floor(level / 25) + 1, MAX_LEVEL_THEME);
}

/**
 * Border drawn around the icon: ranked wings when the player shows their rank,
 * otherwise the level ring. Returns { type: 'prestige' | 'ranked' | 'none', url }.
 */
export function crestBorder({ crestType, rankedTier } = {}, level) {
  const tier = String(rankedTier ?? '').toUpperCase();
  if (crestType === 'ranked' && RANKED_TIERS.has(tier)) {
    return { type: 'ranked', url: `${STATIC_IMAGES}/ranked-emblem/wings/wings_${tier.toLowerCase()}.png` };
  }

  const numericLevel = Number(level);
  if (crestType === 'none' || level === null || level === undefined || !Number.isFinite(numericLevel) || numericLevel < 1) {
    return { type: 'none', url: null };
  }
  return { type: 'prestige', url: `${STATIC_IMAGES}/uikit/themed-borders/theme-${levelTheme(numericLevel)}-border.png` };
}

/** Resolves the equipped banner skin to an asset path using the client's regalia catalog. */
export function bannerSkinPath(catalog, { bannerItemId, bannerType, lastSeasonHighestRank } = {}) {
  const banners = (Array.isArray(catalog) ? catalog : []).filter((entry) => entry.regaliaType === 'kBanner');
  const id =
    bannerItemId !== null && bannerItemId !== undefined
      ? String(bannerItemId)
      : bannerType === 'lastSeasonHighestRank'
        ? PAST_RANK_BANNER_ID
        : DEFAULT_BANNER_ID;

  const tier = String(lastSeasonHighestRank ?? '').toUpperCase();
  const variant = RANKED_TIERS.has(tier) ? tier : 'UNRANKED';
  const candidates = banners.filter((entry) => entry.id === id);
  const match =
    candidates.find((entry) => entry.idSecondary === variant) ??
    candidates.find((entry) => !entry.idSecondary) ??
    candidates[0];
  return match?.assetPath ?? DEFAULT_BANNER_PATH;
}

export function bannerImageUrl(regalia) {
  return gameDataAssetUrl(regalia?.bannerAssetPath) ?? gameDataAssetUrl(DEFAULT_BANNER_PATH);
}

let catalogPromise = null;

export function loadRegaliaCatalog() {
  catalogPromise ??= fetch(`${GAME_DATA}/v1/regalia.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .catch((err) => {
      catalogPromise = null;
      console.warn('Could not load the banner catalog:', err);
      return [];
    });
  return catalogPromise;
}

/** Swaps broken icons (offline, unknown id) for the local placeholder. */
export function attachImageFallbacks(root) {
  root.querySelectorAll('img[data-fallback]').forEach((img) => {
    img.addEventListener('error', () => { img.src = img.dataset.fallback; }, { once: true });
  });
}
