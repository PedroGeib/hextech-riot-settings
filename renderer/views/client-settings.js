// Riot Client language and region (LeagueClientSettings.yaml > install.globals).

import { escapeHtml } from '../lib/html.js';
import { errorMessage, toast, withBusyButtons } from '../lib/ui.js';

const REGIONS = [
  ['BR', 'Brasil (BR)'],
  ['NA', 'North America (NA)'],
  ['EUW', 'Europe West (EUW)'],
  ['EUNE', 'Europe Nordic & East (EUNE)'],
  ['LAN', 'Latin America North (LAN)'],
  ['LAS', 'Latin America South (LAS)'],
  ['OCE', 'Oceania (OCE)'],
  ['JP', 'Japan (JP)'],
  ['KR', 'Korea (KR)'],
  ['TR', 'Turkey (TR)'],
  ['RU', 'Russia (RU)'],
  ['PH', 'Philippines (PH)'],
  ['SG', 'Singapore (SG)'],
  ['TH', 'Thailand (TH)'],
  ['TW', 'Taiwan (TW)'],
  ['VN', 'Vietnam (VN)'],
];

const LOCALES = [
  ['pt_BR', 'Português (Brasil)'],
  ['en_US', 'English (United States)'],
  ['en_GB', 'English (United Kingdom)'],
  ['es_MX', 'Español (México)'],
  ['es_AR', 'Español (Argentina)'],
  ['es_ES', 'Español (España)'],
  ['ko_KR', '한국어'],
  ['ja_JP', '日本語'],
  ['zh_CN', '简体中文'],
  ['zh_TW', '繁體中文'],
  ['fr_FR', 'Français'],
  ['de_DE', 'Deutsch'],
  ['it_IT', 'Italiano'],
  ['pl_PL', 'Polski'],
  ['ro_RO', 'Română'],
  ['el_GR', 'Ελληνικά'],
  ['tr_TR', 'Türkçe'],
  ['ru_RU', 'Русский'],
  ['vi_VN', 'Tiếng Việt'],
  ['th_TH', 'ไทย'],
];

const SAVE_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`;

const options = (list) =>
  list.map(([value, label]) => `<option value="${value}">${escapeHtml(label)} (${value})</option>`).join('');

export function render() {
  return `
    <div id="client-settings-view" class="page-container animate-fade-in">
      <div class="page-header mb-6">
        <h1 class="page-title text-cyan">Client Settings</h1>
        <p class="page-subtitle">Region and display language of the Riot Client</p>
      </div>

      <div class="card mb-6">
        <div class="card-body" style="padding: 24px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 16px;">
            <div class="flex flex-col">
              <label for="client-region" class="text-xs text-muted mb-2 uppercase font-semibold tracking-wider">Server / Region</label>
              <select id="client-region" class="select-control" style="height: 42px; border-radius: var(--radius-md);">${options(REGIONS)}</select>
            </div>
            <div class="flex flex-col">
              <label for="client-locale" class="text-xs text-muted mb-2 uppercase font-semibold tracking-wider">Language</label>
              <select id="client-locale" class="select-control" style="height: 42px; border-radius: var(--radius-md);">${options(LOCALES)}</select>
            </div>
          </div>
          <p class="text-xs text-muted" style="margin: 0 0 16px;">Apply while the Riot Client is closed: it can rewrite this file when it starts or updates.</p>
          <div class="flex justify-end">
            <button id="client-btn-apply" class="btn btn--primary flex items-center" style="padding: 10px 24px; font-weight: 600;" disabled>${SAVE_ICON}Apply Client Changes</button>
          </div>
        </div>
      </div>

      <div class="card" style="border: 1px solid rgba(255, 255, 255, 0.05); background: rgba(0,0,0,0.15);">
        <div class="card-header flex justify-between items-center py-3">
          <h3 class="card-title text-muted" style="font-size: 13px; font-weight: 500;">Config File Inspector</h3>
          <button id="btn-toggle-raw" class="btn btn--secondary btn--sm" aria-expanded="false" aria-controls="client-raw-container" style="padding: 4px 12px; font-size: 11px; height: 28px;">View File</button>
        </div>
        <div class="card-body" id="client-raw-container" hidden style="padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05);">
          <p class="text-xs text-muted mb-3" style="font-size: 11px;">LeagueClientSettings.yaml as stored on your PC.</p>
          <div style="position: relative;">
            <button id="btn-copy-raw" class="btn btn--secondary btn--sm" style="position: absolute; right: 12px; top: 12px; font-size: 11px; z-index: 10; height: 28px;">Copy</button>
            <pre id="client-raw-preview" class="scrollbar-custom" style="background: rgba(5,7,12,0.6); border: 1px solid var(--glass-border); color: var(--text-secondary); padding: 16px; border-radius: var(--radius-md); overflow: auto; max-height: 300px; font-family: Consolas, 'Courier New', monospace; font-size: 11px; line-height: 1.5; white-space: pre; margin: 0;">Loading…</pre>
          </div>
        </div>
      </div>
    </div>`;
}

/** Keeps values the list doesn't know about instead of silently replacing them. */
function selectValue(select, value) {
  if (!value) return;
  if (![...select.options].some((o) => o.value === value)) {
    select.insertAdjacentHTML('afterbegin', `<option value="${escapeHtml(value)}">${escapeHtml(value)} (current)</option>`);
  }
  select.value = value;
}

export function mount() {
  const regionSelect = document.getElementById('client-region');
  const localeSelect = document.getElementById('client-locale');
  const applyButton = document.getElementById('client-btn-apply');
  const preview = document.getElementById('client-raw-preview');
  const rawContainer = document.getElementById('client-raw-container');
  const toggleRaw = document.getElementById('btn-toggle-raw');
  const copyButton = document.getElementById('btn-copy-raw');
  if (!regionSelect) return;
  const api = window.api;
  let raw = '';

  async function load() {
    try {
      const result = await api.client.read();
      raw = result.raw;
      const globals = result.data?.install?.globals ?? {};
      selectValue(regionSelect, globals.region);
      selectValue(localeSelect, globals.locale);
      preview.textContent = raw;
      applyButton.disabled = false;
    } catch (err) {
      preview.textContent = `Could not read the file: ${errorMessage(err)}`;
      applyButton.disabled = true;
      toast(`Could not read client settings: ${errorMessage(err)}`, 'error');
    }
  }

  toggleRaw.addEventListener('click', () => {
    rawContainer.hidden = !rawContainer.hidden;
    toggleRaw.textContent = rawContainer.hidden ? 'View File' : 'Hide File';
    toggleRaw.setAttribute('aria-expanded', String(!rawContainer.hidden));
  });

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(raw);
      copyButton.textContent = 'Copied!';
      setTimeout(() => { copyButton.textContent = 'Copy'; }, 2000);
    } catch {
      toast('Could not copy to the clipboard', 'error');
    }
  });

  applyButton.addEventListener('click', () =>
    withBusyButtons([applyButton], 'Applying…', async () => {
      try {
        await api.history.saveSnapshot('Before changing client region/language');
        await api.client.setLocaleAndRegion({ region: regionSelect.value, locale: localeSelect.value });
        toast('Client settings applied', 'success');
        await load();
      } catch (err) {
        toast(`Could not apply: ${errorMessage(err)}`, 'error');
      }
    }),
  );

  load();
}
