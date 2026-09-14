// tauri-bridge.js
// Maps Electron's window.api to Tauri custom commands and client-side parsers.

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const { getCurrentWindow } = window.__TAURI__.window;

const appWindow = getCurrentWindow();

if (!window.ini) {
  window.ini = {
    parse: (str) => {
      const result = {};
      let currentSection = 'General';
      result[currentSection] = {};
      (str || '').split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) return;
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          currentSection = trimmed.slice(1, -1);
          result[currentSection] = result[currentSection] || {};
        } else {
          const eq = trimmed.indexOf('=');
          if (eq > 0) {
            const k = trimmed.slice(0, eq).trim();
            const v = trimmed.slice(eq + 1).trim();
            result[currentSection][k] = v;
          }
        }
      });
      return result;
    },
    stringify: (obj) => {
      let out = '';
      for (const [sec, vals] of Object.entries(obj || {})) {
        out += `[${sec}]\n`;
        for (const [k, v] of Object.entries(vals || {})) {
          out += `${k}=${v}\n`;
        }
        out += '\n';
      }
      return out;
    }
  };
}

// Helper: path combiner for Windows/OS
const pathJoin = (...parts) => {
  return parts.map(p => p.trim().replace(/[\/\\]+$/, '')).join('\\');
};

const pathResolve = (pathStr) => {
  return pathStr; // Simple pass-through for client-side
};

// ── Paths ──
let resolvedPaths = null;

const resolveInstallPath = async (options = {}) => {
  if (options && options.installPath) {
    const custom = options.installPath;
    const exists = await invoke('file_exists', { path: pathJoin(custom, 'Config') });
    if (exists) return custom;
  }

  const saved = localStorage.getItem('lol-install-path');
  if (saved) {
    const exists = await invoke('file_exists', { path: pathJoin(saved, 'Config') });
    if (exists) return saved;
  }

  const homedir = await invoke('get_home_dir');
  const defaults = [
    'C:\\Riot Games\\League of Legends',
    'D:\\Riot Games\\League of Legends',
    'E:\\Riot Games\\League of Legends',
    pathJoin(homedir, 'Riot Games', 'League of Legends'),
    'C:\\Program Files\\Riot Games\\League of Legends',
    'C:\\Program Files (x86)\\Riot Games\\League of Legends'
  ];

  for (const root of defaults) {
    const exists = (await invoke('file_exists', { path: pathJoin(root, 'Config') })) ||
                   (await invoke('file_exists', { path: pathJoin(root, 'LeagueClient.exe') }));
    if (exists) return root;
  }

  return 'C:\\Riot Games\\League of Legends';
};

const resolveConfigPaths = async (options = {}) => {
  const installRoot = await resolveInstallPath(options);
  const configDir = pathJoin(installRoot, 'Config');
  return {
    configDir,
    gameCfg: pathJoin(configDir, 'game.cfg'),
    persistedSettings: pathJoin(configDir, 'PersistedSettings.json'),
    clientSettings: pathJoin(configDir, 'LeagueClientSettings.yaml')
  };
};

// Expose window.api
window.api = {
  paths: {
    resolve: async (options) => {
      if (!resolvedPaths) {
        resolvedPaths = await resolveConfigPaths(options);
      }
      return resolvedPaths;
    },
    resolveInstall: resolveInstallPath,
    readRaw: async (filePath) => {
      return await invoke('read_file', { path: filePath });
    },
    writeRaw: async (filePath, content) => {
      await invoke('write_file', { path: filePath, content });
    }
  },

  lol: {
    readGameCfg: async (options) => {
      const paths = await window.api.paths.resolve(options);
      const raw = await window.api.paths.readRaw(paths.gameCfg);
      const data = window.ini.parse(raw);
      return { raw, data };
    },
    updateSettings: async (params, options) => {
      const paths = await window.api.paths.resolve(options);
      const { data } = await window.api.lol.readGameCfg(options);
      
      // Merge patch
      for (const [section, values] of Object.entries(params)) {
        if (!data[section]) data[section] = {};
        for (const [k, v] of Object.entries(values)) {
          data[section][k] = String(v);
        }
      }

      const output = window.ini.stringify(data, { whitespace: false });
      
      const isLocked = await window.api.lock.isReadOnly(paths.gameCfg);
      if (isLocked) await window.api.lock.removeReadOnly(paths.gameCfg);
      
      await window.api.paths.writeRaw(paths.gameCfg, output);
      
      if (isLocked) await window.api.lock.setReadOnly(paths.gameCfg);
      
      return { merged: data };
    },
    readKeybindings: async (options) => {
      const paths = await window.api.paths.resolve(options);
      const raw = await window.api.paths.readRaw(paths.persistedSettings);
      const data = JSON.parse(raw);
      return { raw, data };
    },
    updateKeybindings: async (params, options) => {
      const paths = await window.api.paths.resolve(options);
      const output = JSON.stringify(params, null, 2);
      
      const isLocked = await window.api.lock.isReadOnly(paths.persistedSettings);
      if (isLocked) await window.api.lock.removeReadOnly(paths.persistedSettings);
      
      await window.api.paths.writeRaw(paths.persistedSettings, output);
      
      if (isLocked) await window.api.lock.setReadOnly(paths.persistedSettings);
      
      return { merged: params };
    }
  },

  tft: {
    readGameCfg: async (options) => {
      const paths = await window.api.paths.resolve(options);
      const raw = await window.api.paths.readRaw(paths.gameCfg);
      const data = window.ini.parse(raw);
      return { raw, data };
    },
    updateSettings: async (params, options) => {
      const paths = await window.api.paths.resolve(options);
      const { data } = await window.api.tft.readGameCfg(options);
 
      for (const [section, values] of Object.entries(params)) {
        if (!data[section]) data[section] = {};
        for (const [k, v] of Object.entries(values)) {
          data[section][k] = String(v);
        }
      }
 
      const output = window.ini.stringify(data, { whitespace: false });
      
      const isLocked = await window.api.lock.isReadOnly(paths.gameCfg);
      if (isLocked) await window.api.lock.removeReadOnly(paths.gameCfg);
      
      await window.api.paths.writeRaw(paths.gameCfg, output);
      
      if (isLocked) await window.api.lock.setReadOnly(paths.gameCfg);
      
      return { merged: data };
    }
  },
 
  client: {
    read: async (options) => {
      const paths = await window.api.paths.resolve(options);
      const raw = await window.api.paths.readRaw(paths.clientSettings);
      const data = (window.jsyaml && typeof window.jsyaml.load === 'function') ? window.jsyaml.load(raw) : {};
      return { raw, data };
    },
    update: async (params, options) => {
      const paths = await window.api.paths.resolve(options);
      const { data } = await window.api.client.read(options);
      
      const deepMerge = (target, source) => {
        for (const key of Object.keys(source)) {
          if (source[key] instanceof Object && target[key]) {
            deepMerge(target[key], source[key]);
          } else {
            target[key] = source[key];
          }
        }
        return target;
      };
 
      const merged = deepMerge(data || {}, params);
      const output = window.jsyaml.dump(merged);
      
      const isLocked = await window.api.lock.isReadOnly(paths.clientSettings);
      if (isLocked) await window.api.lock.removeReadOnly(paths.clientSettings);
      
      await window.api.paths.writeRaw(paths.clientSettings, output);
      
      if (isLocked) await window.api.lock.setReadOnly(paths.clientSettings);
      
      return { merged };
    },
    setLocale: async (locale, options) => {
      return await window.api.client.update({ install: { globals: { locale } } }, options);
    },
    setRegion: async (region, options) => {
      return await window.api.client.update({ install: { globals: { region } } }, options);
    },
    getCurrentSummonerProfile: async (options = {}) => {
      try {
        const installRoot = await resolveInstallPath(options);
        return await invoke('get_summoner_profile', { installRoot });
      } catch (err) {
        console.warn('getCurrentSummonerProfile failed:', err);
        return null;
      }
    },
    getCurrentSummonerName: async (options = {}) => {
      try {
        const profile = await window.api.client.getCurrentSummonerProfile(options);
        return profile ? profile.name : null;
      } catch (err) {
        console.warn('getCurrentSummonerName failed:', err);
        return null;
      }
    }
  },

  profiles: {
    list: async () => {
      const homedir = await invoke('get_home_dir');
      const profilesDir = pathJoin(homedir, '.riot-orchestrator', 'profiles');
      const list = await invoke('list_profiles', { profilesDir });
      
      const profiles = [];
      for (const name of list) {
        try {
          const profilePath = pathJoin(profilesDir, `${name}.json`);
          const raw = await invoke('read_file', { path: profilePath });
          const parsed = JSON.parse(raw);
          profiles.push({
            name: parsed.name || name,
            filePath: profilePath,
            createdAt: parsed.createdAt || new Date().toISOString(),
            meta: parsed.meta || null
          });
        } catch {}
      }
      return profiles;
    },
    load: async (nameOrPath) => {
      let filePath = nameOrPath;
      if (!nameOrPath.includes('\\') && !nameOrPath.includes('/')) {
        const homedir = await invoke('get_home_dir');
        filePath = pathJoin(homedir, '.riot-orchestrator', 'profiles', `${nameOrPath}.json`);
      }
      const raw = await invoke('read_file', { path: filePath });
      return JSON.parse(raw);
    },
    save: async (profile) => {
      const homedir = await invoke('get_home_dir');
      const profilesDir = pathJoin(homedir, '.riot-orchestrator', 'profiles');
      const filePath = pathJoin(profilesDir, `${profile.name}.json`);
      await invoke('write_file', { path: filePath, content: JSON.stringify(profile, null, 2) });
      return filePath;
    },
    quickSave: async (name, options) => {
      const paths = await window.api.paths.resolve(options);
      
      let gameCfg = null;
      let persistedSettings = null;
      let clientSettings = null;

      try {
        const { data } = await window.api.lol.readGameCfg(options);
        gameCfg = data;
      } catch {}
      try {
        const { data } = await window.api.lol.readKeybindings(options);
        persistedSettings = data;
      } catch {}
      try {
        const { data } = await window.api.client.read(options);
        clientSettings = data;
      } catch {}

      // Get metadata (active player real profile) including regalia (moldura/capa/emblema).
      // LoL does not store these as files on disk — they're cosmetic unlocks served by Riot's
      // CDN, so we snapshot them by reading the LCU endpoints at the moment of save.
      let summonerName = "Unknown";
      let profileIconId = 29;
      let summonerLevel = 1;
      let regalia = null;  // { bannerId, crestType, bannerUrl, crestUrl }

      try {
        const lockFilePath = pathJoin(paths.configDir, '..', 'lockfile');
        const lockContent = await invoke('read_file', { path: lockFilePath });
        const parts = lockContent.split(':');
        const port = parts[2];
        const token = btoa('riot:' + parts[3]);
        const auth = `Basic ${token}`;
        const base = `https://127.0.0.1:${port}`;
        const headers = { Authorization: auth };

        // /lol-summoner/v1/current-summoner — name, icon, level, regalia (banner + crest)
        const sRes = await fetch(`${base}/lol-summoner/v1/current-summoner`, { headers });
        if (sRes.ok) {
          const summoner = await sRes.json();
          summonerName = summoner.displayName || summoner.internalName || summonerName;
          profileIconId = summoner.profileIconId || profileIconId;
          summonerLevel = summoner.summonerLevel || summonerLevel;

          // regalia is a Riot-internal object with the player's equipped banner and crest.
          // We persist the IDs and URLs so the card renders correctly when the player isn't
          // logged in anymore (e.g. showing a snapshot of "what they had equipped then").
          const r = summoner.regalia || {};
          const bannerId = r.bannerId || null;
          const crestType = r.crestType || null;
          const bannerUrl = r.bannerImage || r.banner || null;
          const crestUrl = r.crestImage || r.crest || null;
          if (bannerId || crestType || bannerUrl || crestUrl) {
            regalia = { bannerId, crestType, bannerUrl, crestUrl };
          }
        }
      } catch {}

      const profile = {
        name,
        version: 1,
        createdAt: new Date().toISOString(),
        meta: {
          summonerName,
          profileIconId,
          summonerLevel,
          regalia
        },
        targets: {
          gameCfg,
          persistedSettings,
          clientSettings
        },
        originalTargets: {
          gameCfg: gameCfg ? JSON.parse(JSON.stringify(gameCfg)) : null,
          persistedSettings: persistedSettings ? JSON.parse(JSON.stringify(persistedSettings)) : null,
          clientSettings: clientSettings ? JSON.parse(JSON.stringify(clientSettings)) : null
        }
      };

      const path = await window.api.profiles.save(profile);
      return { profile, filePath: path };
    },
    restoreOriginal: async (name) => {
      const profile = await window.api.profiles.load(name);
      if (profile.originalTargets) {
        profile.targets = JSON.parse(JSON.stringify(profile.originalTargets));
        await window.api.profiles.save(profile);
        return profile;
      } else {
        throw new Error("This profile does not have an original backup snapshot.");
      }
    },
    applyAll: async (profileObj, options) => {
      try {
        const name = profileObj.name || 'Custom Profile';
        // Avoid recursive snapshot saving if this is a rollback operation
        if (!options || !options.skipSnapshot) {
          await window.api.history.saveSnapshot(`Before applying profile: ${name}`);
        }
      } catch {}
      const paths = await window.api.paths.resolve(options);
      const applied = [];

      if (profileObj.targets.gameCfg) {
        await window.api.lol.updateSettings(profileObj.targets.gameCfg, options);
        applied.push('gameCfg');
      }
      if (profileObj.targets.persistedSettings) {
        await window.api.lol.updateKeybindings(profileObj.targets.persistedSettings, options);
        applied.push('persistedSettings');
      }
      if (profileObj.targets.clientSettings) {
        await window.api.client.update(profileObj.targets.clientSettings, options);
        applied.push('clientSettings');
      }

      return { applied };
    },
    delete: async (name) => {
      const homedir = await invoke('get_home_dir');
      const profilePath = pathJoin(homedir, '.riot-orchestrator', 'profiles', `${name}.json`);
      await invoke('delete_file', { path: profilePath });
    },
    onAutoSave: (callback) => {
      listen('profile:auto-saved', (event) => callback(null, event.payload));
    },
    onGlobalHotkey: (callback) => {
      listen('global-hotkey-triggered', (event) => callback(event.payload));
    }
  },

  status: {
    isClientRunning: async () => {
      return await invoke('is_process_running', { name: 'RiotClientServices.exe' });
    },
    isGameRunning: async () => {
      return await invoke('is_process_running', { name: 'League of Legends.exe' });
    },
    getRunningProcesses: async () => {
      const targets = ['RiotClientServices.exe', 'League of Legends.exe', 'LeagueClient.exe'];
      return await invoke('get_running_processes', { targetNames: targets });
    },
    assertClosed: async (options = {}) => {
      const running = await window.api.status.getRunningProcesses();
      if (running.length > 0) {
        throw new Error(`The following Riot processes are running: ${running.join(', ')}. Please close them first.`);
      }
    }
  },

  lock: {
    isReadOnly: async (filePath) => {
      return await invoke('is_read_only', { path: filePath });
    },
    setReadOnly: async (filePath) => {
      await invoke('set_read_only', { path: filePath, readOnly: true });
    },
    removeReadOnly: async (filePath) => {
      await invoke('set_read_only', { path: filePath, readOnly: false });
    }
  },

  history: {
    saveSnapshot: async (description) => {
      try {
        let gameCfg = null;
        let persistedSettings = null;
        let clientSettings = null;
        try {
          const res = await window.api.lol.readGameCfg();
          gameCfg = res?.data || null;
        } catch {}
        try {
          const res = await window.api.lol.readKeybindings();
          persistedSettings = res?.data || null;
        } catch {}
        try {
          const res = await window.api.client.read();
          clientSettings = res?.data || null;
        } catch {}

        const snapshot = {
          timestamp: new Date().toISOString(),
          description,
          targets: { gameCfg, persistedSettings, clientSettings }
        };

        const historyRaw = localStorage.getItem('config-history') || '[]';
        const history = JSON.parse(historyRaw);
        history.unshift(snapshot);
        if (history.length > 5) {
          history.pop();
        }
        localStorage.setItem('config-history', JSON.stringify(history));
      } catch (err) {
        console.warn('Failed to save history snapshot:', err);
      }
    },
    list: () => {
      try {
        const historyRaw = localStorage.getItem('config-history') || '[]';
        return JSON.parse(historyRaw);
      } catch {
        return [];
      }
    },
    rollback: async (timestamp) => {
      const historyRaw = localStorage.getItem('config-history') || '[]';
      const history = JSON.parse(historyRaw);
      const snapshot = history.find(h => h.timestamp === timestamp);
      if (!snapshot) throw new Error('Snapshot not found');

      // Save a rollback snapshot of current settings before overwriting
      await window.api.history.saveSnapshot(`Before Rollback to ${new Date(timestamp).toLocaleTimeString()}`);
      await window.api.profiles.applyAll(snapshot, { skipSnapshot: true });
    }
  },

  window: {
    minimize: () => invoke('minimize_window'),
    maximize: () => invoke('toggle_maximize_window'),
    close: () => invoke('close_window')
  },

  system: {
    setAutostart: (enabled) => invoke('set_autostart', { enabled }),
    isAutostartEnabled: () => invoke('is_autostart_enabled')
  },

  // ── Identity (Bandeiras / Molduras) ─────────────────────────────────
  // Lê o inventário do próprio client do LoL via LCU API. Nada é baixado
  // ou hardcoded por nós — os itens e URLs vêm do client do usuário.
  identity: {
    /**
     * Lê o lockfile do client e devolve { port, token, baseUrl, auth }.
     * Lança erro se o client não estiver aberto.
     */
    readLcuConnection: async () => {
      const paths = await window.api.paths.resolve();
      const lockFilePath = pathJoin(paths.configDir, '..', 'lockfile');
      const lockContent = await invoke('read_file', { path: lockFilePath });
      const parts = lockContent.split(':');
      if (parts.length < 4) throw new Error('lockfile inválido');
      const port = parts[2];
      const token = parts[3];
      const auth = 'Basic ' + btoa('riot:' + token);
      return { port, token, auth, baseUrl: `https://127.0.0.1:${port}` };
    },

    /**
     * Busca o inventário de bandeiras e molduras do player no client.
     * Retorna { bandeiras: [...], molduras: [...] } no formato pronto
     * pra popular o manifest.
     */
    fetchFromClient: async () => {
      const conn = await window.api.identity.readLcuConnection();
      const headers = { Authorization: conn.auth, Accept: 'application/json' };

      // Player-loot é o endpoint oficial com URLs que o próprio client usa
      const res = await fetch(conn.baseUrl + '/lol-loot/v2/player-loot', { headers });
      if (!res.ok) {
        throw new Error(`LCU respondeu ${res.status} em /lol-loot/v2/player-loot`);
      }
      const data = await res.json();

      const bandeiras = [];
      const molduras = [];
      const seen = new Set();

      for (const item of (data || [])) {
        // LCU retorna lootName ("BANNER_X", "BORDER_X") e itemDesc
        const lootName = String(item.lootName || item.lootId || '').toUpperCase();
        const display = String(item.displayCategories || '').toUpperCase();
        const type = String(item.type || '').toUpperCase();

        const isBanner = lootName.includes('BANNER') || display.includes('BANNER') || type === 'BANNER';
        const isBorder = lootName.includes('BORDER') || display.includes('BORDER') || type === 'BORDER'
                       || lootName.includes('FRAME')  || display.includes('FRAME');

        if (!isBanner && !isBorder) continue;
        if (seen.has(item.lootId)) continue;
        seen.add(item.lootId);

        // Pega a melhor URL disponível — a LCU retorna várias, priorizamos a "tile"
        const url = item.tileIcon || item.icon || item.tileLargeImage || '';
        const fullUrl = url && url.startsWith('http')
          ? url
          : (url ? conn.baseUrl + url : '');

        const entry = {
          id: String(item.lootId || lootName),
          name: String(item.itemDesc || item.localizedName || lootName),
          subtitle: [item.rarity, item.localizedSubtitle].filter(Boolean).join(' · '),
          url: fullUrl,
          unlocked: (item.count || 0) > 0
        };

        if (isBanner) bandeiras.push(entry);
        else molduras.push(entry);
      }

      return { bandeiras, molduras };
    }
  }
};

// Bind frameless titlebar controls
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-minimize')?.addEventListener('click', () => window.api.window.minimize());
  document.getElementById('btn-maximize')?.addEventListener('click', () => window.api.window.maximize());
  document.getElementById('btn-close')?.addEventListener('click', () => window.api.window.close());

  // Bind titlebar lock toggle click handler
  document.getElementById('titlebar-lock-badge')?.addEventListener('click', async () => {
    try {
      const paths = await window.api.paths.resolve();
      if (!paths || !paths.persistedSettings) return;
      const isLocked = await window.api.lock.isReadOnly(paths.persistedSettings);
      if (isLocked) {
        await window.api.lock.removeReadOnly(paths.persistedSettings);
        if (window.showToast) window.showToast('PersistedSettings desbloqueado (Cloud Sync ativo)', 'success');
      } else {
        await window.api.lock.setReadOnly(paths.persistedSettings);
        if (window.showToast) window.showToast('PersistedSettings bloqueado (Cloud Sync pausado)', 'success');
      }
      // Trigger status update if dashboard or main lifecycle has updateTitlebarAndSidebarStatus
      if (window.updateTitlebarAndSidebarStatus) {
        window.updateTitlebarAndSidebarStatus();
      }
    } catch (err) {
      if (window.showToast) window.showToast('Erro ao alternar trava: ' + (err.message || err), 'error');
    }
  });
});
