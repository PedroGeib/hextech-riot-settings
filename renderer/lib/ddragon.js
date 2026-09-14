// Profile icons come from Riot's public Data Dragon CDN.

const FALLBACK_VERSION = '14.10.1';
export const FALLBACK_ICON_URL = 'assets/lol-profile/profile_unranked.png';

let versionPromise = null;

export function latestVersion() {
  versionPromise ??= fetch('https://ddragon.leagueoflegends.com/api/versions.json')
    .then((res) => (res.ok ? res.json() : []))
    .then((versions) => (Array.isArray(versions) && versions[0]) || FALLBACK_VERSION)
    .catch(() => FALLBACK_VERSION);
  return versionPromise;
}

export function profileIconUrl(version, iconId) {
  const id = Number(iconId);
  if (!Number.isInteger(id) || id <= 0) return FALLBACK_ICON_URL;
  return `https://ddragon.leagueoflegends.com/cdn/${encodeURIComponent(version)}/img/profileicon/${id}.png`;
}

/** Swaps broken icons (offline, unknown id) for the local placeholder. */
export function attachImageFallbacks(root) {
  root.querySelectorAll('img[data-fallback]').forEach((img) => {
    img.addEventListener('error', () => { img.src = img.dataset.fallback; }, { once: true });
  });
}
