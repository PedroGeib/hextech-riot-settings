// Riot Client language and region (LeagueClientSettings.yaml > install.globals).

import { escapeHtml } from '../lib/html.js';
import { errorMessage, toast, withBusyButtons } from '../lib/ui.js';

const REGIONS = [
  ['BR', 'Brasil (BR)'],
  ['NA', 'América do Norte (NA)'],
  ['EUW', 'Europa Ocidental (EUW)'],
  ['EUNE', 'Europa Nórdica e Leste (EUNE)'],
  ['LAN', 'América Latina Norte (LAN)'],
  ['LAS', 'América Latina Sul (LAS)'],
  ['OCE', 'Oceania (OCE)'],
  ['JP', 'Japão (JP)'],
  ['KR', 'Coreia (KR)'],
  ['TR', 'Turquia (TR)'],
  ['RU', 'Rússia (RU)'],
  ['PH', 'Filipinas (PH)'],
  ['SG', 'Singapura (SG)'],
  ['TH', 'Tailândia (TH)'],
  ['TW', 'Taiwan (TW)'],
  ['VN', 'Vietnã (VN)'],
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
  list
    .map(([value, label]) => {
      const text = label.includes(`(${value})`) ? label : `${label} (${value})`;
      return `<option value="${value}">${escapeHtml(text)}</option>`;
    })
    .join('');

export function render() {
  return `
    <div id="client-settings-view" class="page-container animate-fade-in">
      <div class="page-header mb-6">
        <h1 class="page-title text-cyan">Client</h1>
        <p class="page-subtitle">Região e idioma do Riot Client</p>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Região e idioma</h3>
            <p class="card-subtitle">Aplique com o Riot Client fechado: ele pode reescrever este arquivo ao abrir ou atualizar.</p>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 18px;">
          <div class="form-group" style="margin: 0;">
            <label for="client-region">Servidor / região</label>
            <select id="client-region" class="select-control" style="width: 100%;">${options(REGIONS)}</select>
          </div>
          <div class="form-group" style="margin: 0;">
            <label for="client-locale">Idioma</label>
            <select id="client-locale" class="select-control" style="width: 100%;">${options(LOCALES)}</select>
          </div>
        </div>
        <div class="flex justify-end">
          <button id="client-btn-apply" class="btn btn--primary" disabled>${SAVE_ICON}Aplicar no client</button>
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="margin-bottom: 0;">
          <div>
            <h3 class="card-title">Arquivo de configuração</h3>
            <p class="card-subtitle">LeagueClientSettings.yaml como está no seu PC.</p>
          </div>
          <button id="btn-toggle-raw" class="btn btn--secondary btn--sm" aria-expanded="false" aria-controls="client-raw-container">Ver arquivo</button>
        </div>
        <div class="card-body" id="client-raw-container" hidden style="margin-top: 16px;">
          <div class="code-block-wrapper">
            <button id="btn-copy-raw" class="btn btn--secondary btn--sm code-block__copy">Copiar</button>
            <pre id="client-raw-preview" class="code-block">Carregando…</pre>
          </div>
        </div>
      </div>
    </div>`;
}

/** Keeps values the list doesn't know about instead of silently replacing them. */
function selectValue(select, value) {
  if (!value) return;
  if (![...select.options].some((o) => o.value === value)) {
    select.insertAdjacentHTML('afterbegin', `<option value="${escapeHtml(value)}">${escapeHtml(value)} (atual)</option>`);
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
      preview.textContent = `Não foi possível ler o arquivo: ${errorMessage(err)}`;
      applyButton.disabled = true;
      toast(`Não foi possível ler as configurações do client: ${errorMessage(err)}`, 'error');
    }
  }

  toggleRaw.addEventListener('click', () => {
    rawContainer.hidden = !rawContainer.hidden;
    toggleRaw.textContent = rawContainer.hidden ? 'Ver arquivo' : 'Ocultar arquivo';
    toggleRaw.setAttribute('aria-expanded', String(!rawContainer.hidden));
  });

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(raw);
      copyButton.textContent = 'Copiado!';
      setTimeout(() => { copyButton.textContent = 'Copiar'; }, 2000);
    } catch {
      toast('Não foi possível copiar para a área de transferência', 'error');
    }
  });

  applyButton.addEventListener('click', () =>
    withBusyButtons([applyButton], 'Aplicando…', async () => {
      try {
        await api.history.saveSnapshot('Antes de mudar região/idioma do client');
        await api.client.setLocaleAndRegion({ region: regionSelect.value, locale: localeSelect.value });
        toast('Configurações do client aplicadas', 'success');
        await load();
      } catch (err) {
        toast(`Não foi possível aplicar: ${errorMessage(err)}`, 'error');
      }
    }),
  );

  load();
}
