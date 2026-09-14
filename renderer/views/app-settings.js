// App preferences: theme, automation, startup and the League install path.

import { escapeHtml } from '../lib/html.js';
import { KEYS, readFlag, readText, writeFlag, writeText } from '../lib/storage.js';
import { errorMessage, toast, withBusyButtons } from '../lib/ui.js';

const THEMES = [
  ['default', 'Void Blue (Default)'],
  ['hextech', 'Hextech (Piltover)'],
  ['chemtech', 'Chemtech (Zaun)'],
  ['void', 'Void Purple'],
  ['shadowisles', 'Shadow Isles'],
  ['noxus', 'Noxus Crimson'],
  ['demacia', 'Demacia Gold'],
  ['shurima', 'Shurima Desert'],
  ['ionia', 'Ionia Spirit'],
  ['freljord', 'Freljord Ice'],
  ['bilgewater', 'Bilgewater Serpent'],
];

function toggleRow(id, title, description) {
  return `
    <div class="setting-row">
      <div class="setting-label">
        <label class="setting-title" for="${id}">${title}</label>
        <p class="setting-desc">${description}</p>
      </div>
      <input type="checkbox" id="${id}" class="toggle-switch" />
    </div>`;
}

export function render() {
  return `
    <div class="page-container animate-fade-in">
      <div class="page-header mb-6">
        <h1 class="page-title text-cyan">App Settings</h1>
        <p class="page-subtitle">Themes, automation and the League of Legends install location</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section class="card">
          <div class="card-header"><h3 class="card-title text-violet">Theme</h3></div>
          <div class="card-body">
            <p class="text-sm text-muted mb-4">Color themes inspired by the regions of Runeterra.</p>
            <div id="theme-buttons" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              ${THEMES.map(([id, label], i) => `
                <button class="btn btn--secondary btn--sm theme-btn" data-theme="${id}" aria-pressed="false" style="padding: 8px; font-size: 11px;${i === THEMES.length - 1 ? ' grid-column: span 2;' : ''}">${escapeHtml(label)}</button>`).join('')}
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-header"><h3 class="card-title text-violet">Automation & Controls</h3></div>
          <div class="card-body" style="padding: 0;">
            ${toggleRow('cfg-auto-switcher', 'Auto Profile Switcher', 'Apply the linked profile when an account logs into the client.')}
            ${toggleRow('cfg-global-hotkeys', 'Global Hotkeys (Ctrl+Alt+1 / 2)', 'Apply Quick Slot 1 or 2 from anywhere in Windows.')}
            ${toggleRow('cfg-run-startup', 'Launch on Startup', 'Start Hextech Riot Settings when you sign in to Windows.')}
          </div>
        </section>
      </div>

      <div class="card" style="margin-top: 24px;">
        <div class="card-header"><h3 class="card-title text-cyan">League of Legends Installation</h3></div>
        <div class="card-body">
          <p class="text-sm text-muted mb-4">Detected automatically in the usual folders. If the game is installed elsewhere, enter its folder (or the "Riot Games" folder that contains it).</p>
          <form id="install-path-form" class="flex gap-4 items-center" style="flex-wrap: wrap;">
            <input type="text" id="cfg-install-path" class="input-control flex-1" aria-label="Installation folder" placeholder="C:\\Riot Games\\League of Legends" style="min-width: 260px;" />
            <button type="submit" class="btn btn--primary">Save Path</button>
            <button type="button" id="btn-reset-path" class="btn btn--secondary">Use Auto-Detect</button>
          </form>
          <p class="text-xs text-muted" id="detected-path" style="margin: 12px 0 0; font-family: monospace;"></p>
        </div>
      </div>
    </div>`;
}

export function mount() {
  const api = window.api;

  // Theme
  const applyTheme = (theme) => {
    [...document.body.classList].filter((c) => c.startsWith('theme-')).forEach((c) => document.body.classList.remove(c));
    if (theme !== 'default') document.body.classList.add(`theme-${theme}`);
    writeText(KEYS.theme, theme);
    document.querySelectorAll('.theme-btn').forEach((button) => {
      const active = button.dataset.theme === theme;
      button.classList.toggle('theme-btn--active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };
  const savedTheme = readText(KEYS.theme, 'default');
  applyTheme(THEMES.some(([id]) => id === savedTheme) ? savedTheme : 'default');
  document.getElementById('theme-buttons').addEventListener('click', (event) => {
    const button = event.target.closest('.theme-btn');
    if (button) applyTheme(button.dataset.theme);
  });

  // Automation toggles
  const autoSwitcher = document.getElementById('cfg-auto-switcher');
  autoSwitcher.checked = readFlag(KEYS.autoSwitcher, true);
  autoSwitcher.addEventListener('change', () => {
    writeFlag(KEYS.autoSwitcher, autoSwitcher.checked);
    toast(`Auto Profile Switcher ${autoSwitcher.checked ? 'enabled' : 'disabled'}`, 'success');
  });

  const hotkeys = document.getElementById('cfg-global-hotkeys');
  hotkeys.checked = readFlag(KEYS.globalHotkeys, true);
  hotkeys.addEventListener('change', async () => {
    try {
      await api.system.setGlobalHotkeys(hotkeys.checked);
      writeFlag(KEYS.globalHotkeys, hotkeys.checked);
      toast(`Global hotkeys ${hotkeys.checked ? 'enabled' : 'disabled'}`, 'success');
    } catch (err) {
      hotkeys.checked = !hotkeys.checked;
      toast(`Could not change hotkeys: ${errorMessage(err)}`, 'error');
    }
  });

  const startup = document.getElementById('cfg-run-startup');
  startup.disabled = true;
  api.system
    .isAutostartEnabled()
    .then((enabled) => { startup.checked = enabled; })
    .catch((err) => console.warn('Could not read startup setting:', err))
    .finally(() => { startup.disabled = false; });
  startup.addEventListener('change', async () => {
    try {
      await api.system.setAutostart(startup.checked);
      toast(`Launch on startup ${startup.checked ? 'enabled' : 'disabled'}`, 'success');
    } catch (err) {
      startup.checked = !startup.checked;
      toast(`Could not change startup setting: ${errorMessage(err)}`, 'error');
    }
  });

  // Install path
  const pathForm = document.getElementById('install-path-form');
  const pathInput = document.getElementById('cfg-install-path');
  const detected = document.getElementById('detected-path');
  pathInput.value = readText(KEYS.installPath, '');

  const showDetected = () =>
    api.paths
      .resolve()
      .then((paths) => { detected.textContent = `Using: ${paths.installRoot}`; })
      .catch((err) => { detected.textContent = errorMessage(err); });
  showDetected();

  const savePath = (value, button) =>
    withBusyButtons([button], 'Checking…', async () => {
      try {
        const paths = await api.paths.setInstallPath(value);
        pathInput.value = readText(KEYS.installPath, '');
        detected.textContent = `Using: ${paths.installRoot}`;
        toast(value ? 'Installation path saved' : 'Using automatic detection', 'success');
        window.refreshStatus();
      } catch (err) {
        toast(errorMessage(err), 'error');
        showDetected();
      }
    });

  pathForm.addEventListener('submit', (event) => {
    event.preventDefault();
    savePath(pathInput.value.trim(), pathForm.querySelector('button[type="submit"]'));
  });
  document.getElementById('btn-reset-path').addEventListener('click', (event) => savePath('', event.currentTarget));
}
