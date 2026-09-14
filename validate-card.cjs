// Render a profile card with meta.regalia and verify the HTML uses the URLs.

const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs');

const root = __dirname;
const rendererDir = path.join(root, 'renderer');

let renderCalled = null;
let captured = [];

// Capture innerHTML assignments so we can inspect what was put on the card.
function makeEl() {
  const el = {
    innerHTML: '',
    textContent: '',
    style: new Proxy({}, { set: (t, k, v) => { t[k] = v; return true; } }),
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    children: [],
    appendChild: (c) => el.children.push(c),
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    dataset: {},
  };
  return new Proxy(el, {
    set(target, key, value) {
      if (key === 'innerHTML' && typeof value === 'string' && value.includes('lol-profile-card')) {
        captured.push(value);
      }
      target[key] = value;
      return true;
    }
  });
}

const elMap = {};
global.document = {
  getElementById: (id) => (elMap[id] = elMap[id] || makeEl()),
  querySelectorAll: () => [],
  addEventListener: () => {},
  querySelector: () => null,
  createElement: () => makeEl(),
};
global.window = global;
global.localStorage = { _data: {}, getItem(k){return this._data[k]||null;}, setItem(k,v){this._data[k]=String(v);}, removeItem(k){delete this._data[k];} };
global.fetch = async () => ({ ok: true, json: async () => ['14.10.1'] });

global.window.__TAURI__ = {
  core: {
    invoke: async (cmd, args) => {
      if (cmd === 'get_home_dir') return process.env.USERPROFILE || 'C:\\Users\\test';
      if (cmd === 'list_profiles') {
        // Return a list with one profile that has regalia in meta.
        return ['GaloDCalcA80kmph'];
      }
      if (cmd === 'read_file') {
        if (args.path.endsWith('.json')) {
          return JSON.stringify({
            name: 'GaloDCalcA80kmph',
            createdAt: '2026-07-20T13:45:11.000Z',
            meta: {
              summonerName: 'GaloDCalcA80kmph',
              profileIconId: 6923,
              summonerLevel: 682,
              regalia: {
                bannerId: 'LMS_2024_AUTOGRAPHED',
                crestType: 'crest_ranked_platinum',
                bannerUrl: 'https://cdn.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-banners/6923.png',
                crestUrl: 'https://cdn.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-crests/platinum.png',
              },
            },
          });
        }
        return '';
      }
      if (cmd === 'is_process_running') return false;
      return null;
    },
  },
  event: { listen: () => () => {} },
  window: { getCurrentWindow: () => ({ minimize: () => {}, maximize: () => {}, unmaximize: () => {}, close: () => {}, isMaximized: async () => false }) },
};

// Pre-populate the elements the dashboard expects.
const elementsNeeded = [
  'strip-avatar','strip-account-name','strip-account-level',
  'strip-client-status','strip-client-badge','strip-client-detail',
  'strip-lock','strip-lock-badge','strip-config-files',
  'active-settings-summary-grid','dashboard-profiles-grid',
  'change-history-timeline','summary-resolution','summary-windowmode',
  'summary-volume','summary-language','summary-files-status',
  'slot-1-status','slot-2-status','btn-apply-slot-1','btn-apply-slot-2',
];
for (const id of elementsNeeded) elMap[id] = makeEl();

(async () => {
  try {
    // Load tauri-bridge first so window.api is registered, then dashboard.
    const bridgeUrl = pathToFileURL(path.join(rendererDir, 'tauri-bridge.js')).href + `?b=${Date.now()}`;
    await import(bridgeUrl);
    const url = pathToFileURL(path.join(rendererDir, 'views/dashboard.js')).href + `?t=${Date.now()}`;
    const dash = await import(url);
    // Wait for mount to settle.
    await dash.mount();
    await new Promise(r => setTimeout(r, 200));

    // Now find the captured card innerHTML.
    const cardHtml = captured.find(s => s.includes('lol-profile-card'));
    if (!cardHtml) {
      console.error('FAIL: no card was rendered with class lol-profile-card');
      console.error('captured pieces:', captured.length);
      process.exit(1);
    }
    if (!cardHtml.includes('cdn.communitydragon.org')) {
      console.error('FAIL: card HTML does not include the regalia bannerUrl');
      console.error('--- card HTML ---');
      console.error(cardHtml.substring(0, 2000));
      process.exit(1);
    }
    if (!cardHtml.includes('6923')) {
      console.error('FAIL: card HTML does not include the profile iconId 6923');
      process.exit(1);
    }
    if (!cardHtml.includes('LVL 682') && !cardHtml.includes('>682<')) {
      console.error('FAIL: card HTML does not include level 682');
      process.exit(1);
    }
    console.log('OK card rendered with regalia bannerUrl, iconId, and level.');
    console.log('--- relevant card HTML (snippet) ---');
    console.log(cardHtml.substring(0, 1200));
  } catch (e) {
    console.error('FAIL:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
