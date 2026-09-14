// App preferences kept in the webview's localStorage. Reads never throw, so a
// corrupted value falls back to its default instead of breaking a view.
// Key names are unchanged from earlier versions to keep users' settings.

export const KEYS = {
  installPath: 'custom-install-path',
  theme: 'app-theme',
  autoSwitcher: 'app-settings-auto-switcher',
  globalHotkeys: 'app-settings-global-hotkeys',
  closeToTray: 'app-settings-close-to-tray',
  accountMappings: 'account-profile-mappings',
  lastAutoApplied: 'last-auto-applied-combination',
  lastAccount: 'last-active-account',
  history: 'config-history',
  autoSavedAccount: (name) => `autosaved-summoner-${name}`,
};

export function readText(key, fallback = null) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeText(key, value) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, String(value));
    return true;
  } catch {
    return false;
  }
}

export function readJson(key, fallback) {
  const raw = readText(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  return writeText(key, JSON.stringify(value));
}

export function readFlag(key, fallback) {
  const raw = readText(key);
  return raw === null ? fallback : raw === 'true';
}

export function writeFlag(key, value) {
  return writeText(key, value ? 'true' : 'false');
}
