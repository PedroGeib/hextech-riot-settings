// Quick smoke-test: tries to import dashboard.js and tauri-bridge.js with
// mocked window.__TAURI__ + window.api, just to catch missing symbols
// and broken references. Run with: node validate-modules.cjs

const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const root = __dirname;
const rendererDir = path.join(root, 'renderer');

// Minimal DOM stub so any document.* calls during load don't crash.
global.document = {
  getElementById: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  querySelector: () => null,
};
global.window = global;

// Mock Tauri so tauri-bridge.js can register its bridge on import.
global.window.__TAURI__ = {
  core: { invoke: async () => null },
  event: { listen: () => () => {} },
  window: { getCurrentWindow: () => ({ minimize: () => {}, maximize: () => {}, unmaximize: () => {}, close: () => {}, isMaximized: async () => false }) },
};

async function importFresh(file) {
  const full = path.join(rendererDir, file);
  const url = pathToFileURL(full).href;
  // Use cache-busting query to force a fresh load.
  return import(`${url}?t=${Date.now()}`);
}

(async () => {
  let ok = true;
  try {
    const dash = await importFresh('views/dashboard.js');
    if (typeof dash.render !== 'function') throw new Error('dashboard.render is not a function');
    if (typeof dash.mount !== 'function') throw new Error('dashboard.mount is not a function (BUG! app.js calls it)');
    const html = dash.render();
    if (!html.includes('dashboard-profiles-grid')) {
      throw new Error('render() missing #dashboard-profiles-grid');
    }
    if (!html.includes('dashboard-status-strip')) {
      throw new Error('render() missing .dashboard-status-strip');
    }
    console.log('OK dashboard.js: render() + mount() exported, markup sane');
  } catch (e) {
    ok = false;
    console.error('FAIL dashboard.js:', e.message);
  }

  try {
    await importFresh('tauri-bridge.js');
    if (!global.window.api) throw new Error('window.api not exposed');
    if (!global.window.api.profiles) throw new Error('window.api.profiles missing');
    if (typeof global.window.api.profiles.quickSave !== 'function') {
      throw new Error('window.api.profiles.quickSave not a function');
    }
    console.log('OK tauri-bridge.js: window.api.profiles registered');
  } catch (e) {
    ok = false;
    console.error('FAIL tauri-bridge.js:', e.message);
  }

  process.exit(ok ? 0 : 1);
})();
