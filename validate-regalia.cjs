// Simulate quickSave() with a fake LCU response that includes regalia,
// then verify the saved profile has meta.regalia populated correctly.

const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');
const os = require('os');

const root = __dirname;
const rendererDir = path.join(root, 'renderer');

// Stubs
global.document = {
  getElementById: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  querySelector: () => null,
};
global.window = global;
global.localStorage = {
  _data: {},
  getItem(k) { return this._data[k] || null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
};

// Fake Tauri invoke. Captures writes so we can read the saved profile.
let lastWrite = null;
const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'riot-val-'));
global.window.__TAURI__ = {
  core: {
    invoke: async (cmd, args) => {
      if (cmd === 'get_home_dir') return tmpHome;
      if (cmd === 'read_file') {
        if (args.path.endsWith('lockfile')) return 'LeagueClientUx:1234:9999:abc123def456';
        if (args.path.startsWith(tmpHome)) return fs.readFileSync(args.path, 'utf8');
        // Fake game.cfg / PersistedSettings / client yaml
        if (args.path.endsWith('game.cfg')) return '[General]\nWidth=1920\nHeight=1080\nFullscreen=0\nMasterVolume=0.5\n';
        if (args.path.endsWith('PersistedSettings.json')) return '{}';
        if (args.path.endsWith('LeagueClientSettings.yaml')) return 'install:\n  globals:\n    locale: pt_BR\n';
        return '';
      }
      if (cmd === 'write_file') {
        if (args.path.endsWith('.json') && args.path.includes('profiles')) {
          lastWrite = { path: args.path, content: args.content };
        }
        fs.mkdirSync(path.dirname(args.path), { recursive: true });
        fs.writeFileSync(args.path, args.content);
        return null;
      }
      if (cmd === 'file_exists') return true;
      if (cmd === 'list_profiles') return [];
      return null;
    },
  },
  event: { listen: () => () => {} },
  window: { getCurrentWindow: () => ({ minimize: () => {}, maximize: () => {}, unmaximize: () => {}, close: () => {}, isMaximized: async () => false }) },
};

// Override fetch to return a fake LCU current-summoner response with regalia.
const origFetch = global.fetch;
global.fetch = async (url, init) => {
  if (String(url).includes('/lol-summoner/v1/current-summoner')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        displayName: 'GaloDCalcA80kmph',
        profileIconId: 6923,
        summonerLevel: 682,
        regalia: {
          bannerId: 'LMS_2024_AUTOGRAPHED',
          crestType: 'crest_ranked_platinum',
          bannerImage: 'https://cdn.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-banners/6923.png',
          crestImage:  'https://cdn.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-crests/platinum.png',
        }
      }),
    };
  }
  return origFetch ? origFetch(url, init) : { ok: false, status: 503, json: async () => ({}) };
};

(async () => {
  try {
    const url = pathToFileURL(path.join(rendererDir, 'tauri-bridge.js')).href + `?t=${Date.now()}`;
    await import(url);
    const res = await global.window.api.profiles.quickSave('GaloDCalcA80kmph');
    if (!lastWrite) throw new Error('quickSave did not write a profile');
    const profile = JSON.parse(lastWrite.content);
    if (!profile.meta) throw new Error('profile.meta missing');
    if (profile.meta.summonerName !== 'GaloDCalcA80kmph') throw new Error(`summonerName=${profile.meta.summonerName}`);
    if (profile.meta.profileIconId !== 6923) throw new Error(`profileIconId=${profile.meta.profileIconId}`);
    if (profile.meta.summonerLevel !== 682) throw new Error(`summonerLevel=${profile.meta.summonerLevel}`);
    if (!profile.meta.regalia) throw new Error('profile.meta.regalia is null/undefined');
    if (profile.meta.regalia.bannerId !== 'LMS_2024_AUTOGRAPHED') throw new Error(`bannerId=${profile.meta.regalia.bannerId}`);
    if (profile.meta.regalia.crestType !== 'crest_ranked_platinum') throw new Error(`crestType=${profile.meta.regalia.crestType}`);
    if (!profile.meta.regalia.bannerUrl || !profile.meta.regalia.bannerUrl.includes('cdn.communitydragon.org')) {
      throw new Error(`bannerUrl not from CDN: ${profile.meta.regalia.bannerUrl}`);
    }
    console.log('OK quickSave: meta.regalia populated from LCU');
    console.log('   profile meta =', JSON.stringify(profile.meta, null, 2));
  } catch (e) {
    console.error('FAIL:', e.message);
    process.exit(1);
  } finally {
    try { fs.rmSync(tmpHome, { recursive: true, force: true }); } catch {}
  }
})();
