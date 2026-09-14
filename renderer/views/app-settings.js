// App preferences: theme, automation, startup and the League install path.

import { escapeHtml } from '../lib/html.js';
import { KEYS, readFlag, readText, writeFlag, writeText } from '../lib/storage.js';
import { errorMessage, toast, withBusyButtons } from '../lib/ui.js';

// [id, label, accent color shown in the swatch]
const THEMES = [
  ['default', 'Azul do Vazio (padrão)', '#1fc7e6'],
  ['hextech', 'Hextec (Piltover)', '#c89b3c'],
  ['chemtech', 'Quimtec (Zaun)', '#39e53d'],
  ['void', 'Roxo do Vazio', '#ca46ff'],
  ['shadowisles', 'Ilhas das Sombras', '#00f0b5'],
  ['noxus', 'Carmesim de Noxus', '#ff4d4d'],
  ['demacia', 'Ouro de Demacia', '#e5b955'],
  ['shurima', 'Deserto de Shurima', '#ffc400'],
  ['ionia', 'Espírito de Ionia', '#ff6eb4'],
  ['freljord', 'Gelo de Freljord', '#80e5ff'],
  ['bilgewater', 'Águas de Sentina', '#ff8a1f'],
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

const enabledText = (enabled) => (enabled ? 'ativada' : 'desativada');

export function render() {
  return `
    <div class="page-container animate-fade-in">
      <div class="page-header mb-6">
        <h1 class="page-title text-cyan">Configurações</h1>
        <p class="page-subtitle">Tema, automação e local de instalação do League of Legends</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section class="card">
          <div class="card-header"><h3 class="card-title text-violet">Tema</h3></div>
          <div class="card-body">
            <p class="text-sm text-muted mb-4">Cores inspiradas nas regiões de Runeterra.</p>
            <div id="theme-buttons" class="theme-grid">
              ${THEMES.map(([id, label, color]) => `
                <button type="button" class="btn btn--secondary theme-btn" data-theme="${id}" aria-pressed="false">
                  <span class="theme-btn__swatch" style="--swatch: ${color};"></span>${escapeHtml(label)}
                </button>`).join('')}
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-header"><h3 class="card-title text-violet">Automação e controles</h3></div>
          <div class="card-body" style="padding: 0;">
            ${toggleRow('cfg-auto-switcher', 'Troca automática de perfil', 'Aplica o perfil vinculado quando a conta entra no client.')}
            ${toggleRow('cfg-global-hotkeys', 'Atalhos globais (Ctrl+Alt+1 / 2)', 'Aplica o Slot 1 ou 2 de qualquer lugar do Windows.')}
            ${toggleRow('cfg-run-startup', 'Iniciar com o Windows', 'Abre o Hextech Riot Settings na bandeja quando você entra no Windows.')}
            ${toggleRow('cfg-close-to-tray', 'Continuar na bandeja ao fechar', 'Fechar a janela mantém o app na bandeja do sistema, para os atalhos e a automação continuarem funcionando.')}
          </div>
        </section>
      </div>

      <div class="card" style="margin-top: 24px;">
        <div class="card-header"><h3 class="card-title text-cyan">Instalação do League of Legends</h3></div>
        <div class="card-body">
          <p class="text-sm text-muted mb-4">Detectada automaticamente nas pastas comuns. Se o jogo estiver em outro lugar, informe a pasta dele (ou a pasta "Riot Games" que a contém).</p>
          <form id="install-path-form" class="flex gap-4 items-center" style="flex-wrap: wrap;">
            <input type="text" id="cfg-install-path" class="input-control flex-1" aria-label="Pasta de instalação" placeholder="C:\\Riot Games\\League of Legends" style="min-width: 260px;" />
            <button type="submit" class="btn btn--primary">Salvar caminho</button>
            <button type="button" id="btn-reset-path" class="btn btn--secondary">Detectar automaticamente</button>
          </form>
          <p class="text-xs text-muted" id="detected-path" style="margin: 12px 0 0; font-family: monospace;"></p>
        </div>
      </div>

      <div class="card" style="margin-top: 24px;">
        <div class="card-body flex justify-between items-center" style="gap: 16px; flex-wrap: wrap;">
          <p class="text-sm text-muted" style="margin: 0;">Encerra o app por completo, inclusive a bandeja, os atalhos e a automação.</p>
          <button type="button" id="btn-quit-app" class="btn btn--danger">Sair do app</button>
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
    toast(`Troca automática de perfil ${enabledText(autoSwitcher.checked)}`, 'success');
  });

  const hotkeys = document.getElementById('cfg-global-hotkeys');
  hotkeys.checked = readFlag(KEYS.globalHotkeys, true);
  hotkeys.addEventListener('change', async () => {
    try {
      await api.system.setGlobalHotkeys(hotkeys.checked);
      writeFlag(KEYS.globalHotkeys, hotkeys.checked);
      toast(`Atalhos globais ${hotkeys.checked ? 'ativados' : 'desativados'}`, 'success');
    } catch (err) {
      hotkeys.checked = !hotkeys.checked;
      toast(`Não foi possível alterar os atalhos: ${errorMessage(err)}`, 'error');
    }
  });

  const closeToTray = document.getElementById('cfg-close-to-tray');
  closeToTray.checked = readFlag(KEYS.closeToTray, true);
  closeToTray.addEventListener('change', async () => {
    try {
      await api.system.setCloseToTray(closeToTray.checked);
      writeFlag(KEYS.closeToTray, closeToTray.checked);
    } catch (err) {
      closeToTray.checked = !closeToTray.checked;
      toast(`Não foi possível alterar esta opção: ${errorMessage(err)}`, 'error');
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
      toast(`Iniciar com o Windows ${startup.checked ? 'ativado' : 'desativado'}`, 'success');
    } catch (err) {
      startup.checked = !startup.checked;
      toast(`Não foi possível alterar a inicialização: ${errorMessage(err)}`, 'error');
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
      .then((paths) => { detected.textContent = `Em uso: ${paths.installRoot}`; })
      .catch((err) => { detected.textContent = errorMessage(err); });
  showDetected();

  const savePath = (value, button) =>
    withBusyButtons([button], 'Verificando…', async () => {
      try {
        const paths = await api.paths.setInstallPath(value);
        pathInput.value = readText(KEYS.installPath, '');
        detected.textContent = `Em uso: ${paths.installRoot}`;
        toast(value ? 'Caminho de instalação salvo' : 'Usando detecção automática', 'success');
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

  document.getElementById('btn-quit-app').addEventListener('click', () => api.system.quit());
}
