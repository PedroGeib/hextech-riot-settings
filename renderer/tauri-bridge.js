// tauri-bridge.js
//
// Defines `window.api`, the only way views touch the system. Parsing, merging
// and serializing config files happens here with the pure helpers in lib/;
// the Rust side only does scoped file access, process checks and read-only
// calls to the League client.

import { detectEol, detectIndent, withEol } from './lib/format.js';
import { mergeIni, parseIni, stringifyIni } from './lib/ini.js';
import { deepMerge } from './lib/merge.js';
import { mergePersisted } from './lib/persisted.js';
import { profileFileName } from './lib/profile-name.js';
import { bannerSkinPath, loadRegaliaCatalog } from './lib/regalia.js';
import { syncPersistedWithIni } from './lib/settings-model.js';
import { KEYS, readJson, readText, writeJson, writeText } from './lib/storage.js';

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

const GAME_PROCESS = 'League of Legends.exe';
const CLIENT_PROCESSES = ['RiotClientServices.exe', 'LeagueClient.exe', 'LeagueClientUx.exe'];
const HISTORY_LIMIT = 5;
const ACCOUNT_CACHE_MS = 2000;

const DEFAULT_INSTALL_ROOTS = [
  'C:\\Riot Games\\League of Legends',
  'D:\\Riot Games\\League of Legends',
  'E:\\Riot Games\\League of Legends',
  'C:\\Program Files\\Riot Games\\League of Legends',
  'C:\\Program Files (x86)\\Riot Games\\League of Legends',
];

const joinPath = (...parts) =>
  parts
    .map((part, i) => (i === 0 ? String(part).replace(/[\\/]+$/, '') : String(part).replace(/^[\\/]+|[\\/]+$/g, '')))
    .join('\\');

// ─── Installation paths ─────────────────────────────────────────────────────

async function looksLikeInstall(root) {
  return (
    (await invoke('path_exists', { path: joinPath(root, 'Config') })) ||
    (await invoke('path_exists', { path: joinPath(root, 'LeagueClient.exe') }))
  );
}

/** Accepts the League folder itself or its parent (e.g. "C:\Riot Games"). */
async function findInstallIn(folder) {
  for (const candidate of [folder, joinPath(folder, 'League of Legends')]) {
    if (await looksLikeInstall(candidate)) return candidate;
  }
  return null;
}

async function findInstallRoot() {
  const custom = readText(KEYS.installPath)?.trim();
  if (custom) {
    const found = await findInstallIn(custom);
    if (found) return found;
    throw new Error(`"${custom}" não é uma instalação do League of Legends. Corrija o caminho em Configurações.`);
  }

  const home = await invoke('get_home_dir');
  for (const root of [...DEFAULT_INSTALL_ROOTS, joinPath(home, 'Riot Games', 'League of Legends')]) {
    if (await looksLikeInstall(root)) return root;
  }
  throw new Error('Instalação do League of Legends não encontrada. Informe o caminho em Configurações.');
}

let pathsPromise = null;

function resolvePaths() {
  if (!pathsPromise) {
    pathsPromise = findInstallRoot().then((installRoot) => {
      const configDir = joinPath(installRoot, 'Config');
      return {
        installRoot,
        configDir,
        gameCfg: joinPath(configDir, 'game.cfg'),
        persistedSettings: joinPath(configDir, 'PersistedSettings.json'),
        clientSettings: joinPath(configDir, 'LeagueClientSettings.yaml'),
      };
    });
    // A failed lookup is retried on the next call instead of being cached.
    pathsPromise.catch(() => {
      pathsPromise = null;
    });
  }
  return pathsPromise;
}

// ─── Processes ──────────────────────────────────────────────────────────────

async function processSnapshot() {
  const processes = await invoke('get_riot_processes');
  return {
    processes,
    clientRunning: processes.some((p) => CLIENT_PROCESSES.includes(p)),
    gameRunning: processes.includes(GAME_PROCESS),
  };
}

async function assertGameClosed() {
  if ((await processSnapshot()).gameRunning) {
    throw new Error('Há uma partida de League of Legends em andamento. Feche o jogo primeiro, senão ele sobrescreve suas configurações ao sair.');
  }
}

// ─── Raw config file access ─────────────────────────────────────────────────

const lock = {
  isReadOnly: (path) => invoke('is_config_read_only', { path }),
  setReadOnly: (path) => invoke('set_config_read_only', { path, readOnly: true }),
  removeReadOnly: (path) => invoke('set_config_read_only', { path, readOnly: false }),
};

/** Writes a config file, keeping its read-only (cloud sync lock) state. */
async function writeConfigFile(path, content) {
  await assertGameClosed();
  const locked = await lock.isReadOnly(path);
  if (locked) await lock.removeReadOnly(path);
  try {
    await invoke('write_config_file', { path, content });
  } finally {
    if (locked) await lock.setReadOnly(path);
  }
}

function parseJson(raw, label) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`${label} não é um JSON válido: ${err.message}`);
  }
}

function yaml() {
  if (!window.jsyaml) throw new Error('Não foi possível carregar o suporte a YAML (vendor/js-yaml.min.js ausente).');
  return window.jsyaml;
}

/** Per-file parse/serialize rules; serialization mimics the original file's formatting. */
const FORMATS = {
  gameCfg: {
    label: 'game.cfg',
    parse: (raw) => parseIni(raw),
    serialize: (data, raw) => stringifyIni(data, detectEol(raw)),
  },
  persistedSettings: {
    label: 'PersistedSettings.json',
    parse: (raw) => parseJson(raw, 'PersistedSettings.json'),
    serialize: (data, raw) => {
      const eol = detectEol(raw);
      const trailing = /\r?\n$/.test(raw) ? eol : '';
      return withEol(JSON.stringify(data, null, detectIndent(raw, 4)), eol) + trailing;
    },
  },
  clientSettings: {
    label: 'LeagueClientSettings.yaml',
    parse: (raw) => yaml().load(raw) ?? {},
    serialize: (data, raw) => {
      const indent = detectIndent(raw, 4);
      const text = yaml().dump(data, {
        indent: typeof indent === 'number' ? indent : 4,
        lineWidth: -1,
        noArrayIndent: true,
        noRefs: true,
        quotingType: '"',
        forceQuotes: true,
      });
      return withEol(text, detectEol(raw));
    },
  },
};

function formatFor(kind) {
  const format = FORMATS[kind];
  if (!format) throw new Error(`Arquivo de configuração desconhecido: "${kind}"`);
  return format;
}

async function readConfig(kind) {
  const format = formatFor(kind);
  const path = (await resolvePaths())[kind];
  const raw = await invoke('read_config_file', { path });
  return { path, raw, data: format.parse(raw) };
}

async function replaceConfig(kind, data) {
  const { path, raw } = await readConfig(kind);
  await writeConfigFile(path, formatFor(kind).serialize(data, raw));
}

async function patchConfig(kind, merge, patch) {
  const { path, raw, data } = await readConfig(kind);
  const merged = merge(data, patch);
  await writeConfigFile(path, formatFor(kind).serialize(merged, raw));
  return { merged };
}

const patchGameCfg = (patch) => patchConfig('gameCfg', mergeIni, patch);
const patchPersisted = (patch) => patchConfig('persistedSettings', mergePersisted, patch);
const patchClient = (patch) => patchConfig('clientSettings', deepMerge, patch);

async function captureTargets() {
  const dataOrNull = (kind) => readConfig(kind).then((r) => r.data, () => null);
  const [gameCfg, persistedSettings, clientSettings] = await Promise.all([
    dataOrNull('gameCfg'),
    dataOrNull('persistedSettings'),
    dataOrNull('clientSettings'),
  ]);
  return { gameCfg, persistedSettings, clientSettings };
}

// ─── Account ────────────────────────────────────────────────────────────────

let accountCache = { at: 0, promise: null };

function getCurrentAccount() {
  if (accountCache.promise && Date.now() - accountCache.at < ACCOUNT_CACHE_MS) return accountCache.promise;
  const promise = resolvePaths()
    .then(({ installRoot }) => invoke('get_summoner_profile', { installRoot }))
    .catch((err) => {
      console.warn('Could not detect the active account:', err);
      return null;
    });
  accountCache = { at: Date.now(), promise };
  return promise;
}

const REGALIA_CACHE_MS = 60_000;
let regaliaCache = { key: null, at: 0, promise: null };

/**
 * What the client draws around the logged-in account: crest (level ring or
 * ranked wings) and banner skin. Stored in profiles so cards keep the look
 * the account had when the profile was saved.
 */
async function readAccountRegalia(account) {
  if (!account?.live) return null;
  const key = `${account.name}:${account.summonerLevel}:${account.profileIconId}`;
  if (regaliaCache.key === key && Date.now() - regaliaCache.at < REGALIA_CACHE_MS) return regaliaCache.promise;

  const promise = (async () => {
    const { installRoot } = await resolvePaths();
    const route = (path) => invoke('read_client_route', { installRoot, route: path }).catch(() => null);
    const [regalia, loadouts] = await Promise.all([
      route('/lol-regalia/v2/current-summoner/regalia'),
      route('/lol-loadouts/v4/loadouts/scope/account'),
    ]);
    if (!regalia) return null;

    const bannerSlot = (Array.isArray(loadouts) ? loadouts : []).map((l) => l?.loadout?.REGALIA_BANNER_SLOT).find(Boolean);
    const summary = {
      crestType: regalia.crestType ?? 'prestige',
      bannerType: regalia.bannerType ?? 'blank',
      rankedTier: regalia.highestRankedEntry?.tier ?? null,
      lastSeasonHighestRank: regalia.lastSeasonHighestRank ?? null,
      bannerItemId: bannerSlot?.itemId ?? null,
    };
    summary.bannerAssetPath = bannerSkinPath(await loadRegaliaCatalog(), summary);
    return summary;
  })().catch((err) => {
    console.warn('Could not read the account crest and banner:', err);
    return null;
  });

  regaliaCache = { key, at: Date.now(), promise };
  return promise;
}

// ─── History ────────────────────────────────────────────────────────────────

async function saveSnapshot(description) {
  const snapshot = { timestamp: new Date().toISOString(), description, targets: await captureTargets() };
  const history = [snapshot, ...readJson(KEYS.history, [])].slice(0, HISTORY_LIMIT);
  // Drop the oldest entries if localStorage runs out of space.
  while (history.length && !writeJson(KEYS.history, history)) history.pop();
  return snapshot;
}

// ─── Profiles ───────────────────────────────────────────────────────────────

const reportedBrokenProfiles = new Set();

async function readProfiles() {
  const files = await invoke('list_profiles');
  return files.flatMap(({ fileName, content }) => {
    try {
      const profile = JSON.parse(content);
      if (profile && typeof profile === 'object') {
        return [{ ...profile, name: String(profile.name || fileName.replace(/\.json$/i, '')), fileName }];
      }
    } catch {
      // Reported below.
    }
    if (!reportedBrokenProfiles.has(fileName)) {
      reportedBrokenProfiles.add(fileName);
      console.warn(`Skipping unreadable profile file "${fileName}"`);
    }
    return [];
  });
}

function findProfile(profiles, name) {
  const lower = String(name).toLowerCase();
  return profiles.find((p) => p.name === name) ?? profiles.find((p) => p.name.toLowerCase() === lower) ?? null;
}

async function loadProfile(name) {
  const profile = findProfile(await readProfiles(), name);
  if (!profile) throw new Error(`Perfil "${name}" não encontrado`);
  return profile;
}

async function saveProfile(profile) {
  const name = String(profile?.name ?? '').trim();
  if (!name) throw new Error('O nome do perfil não pode ficar vazio');

  const profiles = await readProfiles();
  let fileName = profile.fileName ?? findProfile(profiles, name)?.fileName;
  if (!fileName) {
    const taken = new Set(profiles.map((p) => p.fileName.toLowerCase()));
    const base = profileFileName(name).replace(/\.json$/, '');
    fileName = `${base}.json`;
    for (let i = 2; taken.has(fileName.toLowerCase()); i++) fileName = `${base} (${i}).json`;
  }

  const { fileName: _fileName, ...data } = { ...profile, name };
  await invoke('write_profile', { fileName, content: JSON.stringify(data, null, 2) });
  return { ...data, fileName };
}

async function quickSaveProfile(name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) throw new Error('O nome do perfil não pode ficar vazio');

  const targets = await captureTargets();
  if (!targets.gameCfg && !targets.persistedSettings && !targets.clientSettings) {
    throw new Error('Nenhum arquivo de configuração pôde ser lido, então nada foi salvo.');
  }

  const [account, existing] = await Promise.all([getCurrentAccount(), readProfiles().then((p) => findProfile(p, trimmed))]);
  const now = new Date().toISOString();
  return saveProfile({
    name: trimmed,
    version: 2,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    meta: {
      summonerName: account?.name ?? null,
      profileIconId: account?.profileIconId ?? null,
      summonerLevel: account?.summonerLevel ?? null,
      regalia: await readAccountRegalia(account),
    },
    targets,
    originalTargets: structuredClone(targets),
    fileName: existing?.fileName,
  });
}

async function applyProfile(profile, { skipSnapshot = false } = {}) {
  await assertGameClosed();
  const targets = profile?.targets ?? {};
  if (!skipSnapshot) await saveSnapshot(`Antes de aplicar "${profile?.name ?? 'perfil'}"`);

  const applied = [];
  if (targets.gameCfg) {
    await patchGameCfg(targets.gameCfg);
    applied.push('game.cfg');
  }
  // PersistedSettings also stores many game.cfg values and Riot restores it
  // from its servers on login, so the profile's game.cfg values go there too.
  const { persistedSettings: persistedPath } = await resolvePaths();
  if (targets.persistedSettings || (targets.gameCfg && (await invoke('path_exists', { path: persistedPath })))) {
    await patchConfig(
      'persistedSettings',
      (current, { persisted, ini }) => {
        const merged = mergePersisted(current, persisted);
        syncPersistedWithIni(merged, ini);
        return merged;
      },
      { persisted: targets.persistedSettings ?? {}, ini: targets.gameCfg ?? {} },
    );
    applied.push('PersistedSettings.json');
  }
  // Only language and region are restored: the rest of this file is patcher
  // and session state that belongs to the Riot Client.
  const globals = targets.clientSettings?.install?.globals ?? {};
  const clientPatch = Object.fromEntries(['locale', 'region'].filter((k) => globals[k]).map((k) => [k, globals[k]]));
  if (Object.keys(clientPatch).length) {
    await patchClient({ install: { globals: clientPatch } });
    applied.push('LeagueClientSettings.yaml');
  }
  return { applied };
}

// ─── window.api ─────────────────────────────────────────────────────────────

window.api = {
  paths: {
    resolve: resolvePaths,
    /** Validates and stores a custom install folder; an empty value restores auto-detection. */
    setInstallPath: async (folder) => {
      const trimmed = String(folder ?? '').trim();
      if (trimmed && !(await findInstallIn(trimmed))) {
        throw new Error(`"${trimmed}" não contém uma instalação do League of Legends`);
      }
      writeText(KEYS.installPath, trimmed || null);
      pathsPromise = null;
      accountCache = { at: 0, promise: null };
      return resolvePaths();
    },
    fileStatus: async () => {
      const paths = await resolvePaths();
      const kinds = ['gameCfg', 'persistedSettings', 'clientSettings'];
      const exists = await Promise.all(kinds.map((k) => invoke('path_exists', { path: paths[k] })));
      return Object.fromEntries(kinds.map((k, i) => [k, exists[i]]));
    },
  },

  configs: {
    read: readConfig,
    replace: replaceConfig,
    parse: (kind, text) => formatFor(kind).parse(text),
    serialize: (kind, data, originalRaw = '') => formatFor(kind).serialize(data, originalRaw),
    captureAll: captureTargets,
  },

  lol: {
    readGameCfg: () => readConfig('gameCfg'),
    updateSettings: patchGameCfg,
    readKeybindings: () => readConfig('persistedSettings'),
    updateKeybindings: patchPersisted,
  },

  tft: {
    readGameCfg: () => readConfig('gameCfg'),
    updateSettings: patchGameCfg,
  },

  client: {
    read: () => readConfig('clientSettings'),
    update: patchClient,
    setLocaleAndRegion: ({ locale, region }) => patchClient({ install: { globals: { locale, region } } }),
    getCurrentSummonerProfile: getCurrentAccount,
    getCurrentSummonerName: async () => (await getCurrentAccount())?.name ?? null,
    /** Crest and banner of the logged-in account, or null when the client is closed. */
    getRegalia: async () => readAccountRegalia(await getCurrentAccount()),
  },

  profiles: {
    list: async () =>
      (await readProfiles()).map(({ name, fileName, createdAt, updatedAt, meta }) => ({
        name,
        fileName,
        createdAt,
        updatedAt: updatedAt ?? null,
        meta: meta ?? null,
      })),
    load: loadProfile,
    save: saveProfile,
    quickSave: quickSaveProfile,
    applyAll: applyProfile,
    restoreOriginal: async (name) => {
      const profile = await loadProfile(name);
      if (!profile.originalTargets) throw new Error('Este perfil não tem uma cópia original para restaurar.');
      return saveProfile({ ...profile, targets: structuredClone(profile.originalTargets) });
    },
    delete: async (name) => {
      const profile = await loadProfile(name);
      await invoke('delete_profile', { fileName: profile.fileName });
    },
    onGlobalHotkey: (callback) => listen('global-hotkey-triggered', (event) => callback(event.payload)),
  },

  status: {
    snapshot: processSnapshot,
    assertGameClosed,
  },

  lock,

  history: {
    saveSnapshot,
    list: () => readJson(KEYS.history, []),
    rollback: async (timestamp) => {
      const snapshot = readJson(KEYS.history, []).find((h) => h.timestamp === timestamp);
      if (!snapshot) throw new Error('Esse backup não existe mais.');
      await assertGameClosed();
      await saveSnapshot(`Antes de restaurar o backup de ${new Date(timestamp).toLocaleString('pt-BR')}`);
      return applyProfile({ name: snapshot.description, targets: snapshot.targets }, { skipSnapshot: true });
    },
  },

  window: {
    minimize: () => invoke('minimize_window'),
    maximize: () => invoke('toggle_maximize_window'),
    close: () => invoke('close_window'),
  },

  system: {
    setAutostart: (enabled) => invoke('set_autostart', { enabled }),
    isAutostartEnabled: () => invoke('is_autostart_enabled'),
    setGlobalHotkeys: (enabled) => invoke('set_global_hotkeys', { enabled }),
    setCloseToTray: (enabled) => invoke('set_close_to_tray', { enabled }),
    quit: () => invoke('quit_app'),
  },
};
