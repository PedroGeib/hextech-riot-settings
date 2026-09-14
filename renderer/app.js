/**
 * App shell: router, toasts, modals, title bar status and account automation
 * (auto profile switcher, automatic backups and global hotkeys).
 */

import { escapeHtml } from './lib/html.js';
import { KEYS, readFlag, readJson, readText, writeFlag, writeText } from './lib/storage.js';
import { errorMessage } from './lib/ui.js';
import * as appSettings from './views/app-settings.js';
import * as client from './views/client-settings.js';
import * as dashboard from './views/dashboard.js';
import * as lol from './views/lol-settings.js';
import * as profiles from './views/profiles.js';
import * as rawConfigs from './views/raw-configs.js';
import * as tft from './views/tft-settings.js';

const VIEWS = { dashboard, lol, tft, client, profiles, rawConfigs, appSettings };
const VIEW_ORDER = ['dashboard', 'lol', 'tft', 'client', 'profiles', 'rawConfigs', 'appSettings'];
const STATUS_POLL_MS = 8000;
const AUTOMATION_INTERVAL_MS = 60_000;
const BACKUP_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const api = window.api;
const byId = (id) => document.getElementById(id);

// ─── Toasts ─────────────────────────────────────────────────────────────────

const TOAST_ICONS = {
  success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg>`,
  error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
};

/** @param {'success' | 'error' | 'info'} type */
function showToast(message, type = 'info') {
  const lifetime = type === 'error' ? 6000 : 3500;
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.innerHTML = `
    <div class="toast__icon">${TOAST_ICONS[type] ?? TOAST_ICONS.info}</div>
    <div class="toast__message"></div>
    <button class="toast__close" aria-label="Close">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div class="toast__progress" style="animation-duration: ${lifetime}ms;"></div>`;
  toast.querySelector('.toast__message').textContent = String(message);

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    toast.classList.add('toast--exit');
    setTimeout(() => toast.remove(), 300);
  };
  toast.querySelector('.toast__close').addEventListener('click', dismiss);
  byId('toast-container').appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast--visible'));
  setTimeout(dismiss, lifetime);
}

// ─── Modals ─────────────────────────────────────────────────────────────────

let activeModal = null;

/**
 * Opens the shared modal. `body` and `footer` are HTML the caller has escaped.
 * Returns a handle whose `signal` aborts when the modal closes, so listeners
 * registered with it never leak into the next modal.
 */
function openModal({ title, body, footer, wide = false }) {
  activeModal?.close();

  const overlay = byId('modal-overlay');
  const controller = new AbortController();
  byId('modal').classList.toggle('modal--wide', wide);
  byId('modal-header').innerHTML = `<h3>${escapeHtml(title)}</h3>`;
  byId('modal-body').innerHTML = body;
  byId('modal-footer').innerHTML = footer;
  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('modal-overlay--visible'));

  const modal = {
    body: byId('modal-body'),
    footer: byId('modal-footer'),
    signal: controller.signal,
    onClose: null,
    close() {
      if (activeModal !== modal) return;
      activeModal = null;
      controller.abort();
      overlay.classList.remove('modal-overlay--visible');
      setTimeout(() => {
        if (!activeModal) overlay.style.display = 'none';
      }, 200);
      modal.onClose?.();
    },
  };

  overlay.addEventListener('click', (e) => e.target === overlay && modal.close(), { signal: controller.signal });
  document.addEventListener('keydown', (e) => e.key === 'Escape' && modal.close(), { signal: controller.signal });
  activeModal = modal;
  return modal;
}

/** Confirmation dialog; resolves true when confirmed. `body` is HTML. */
function showModal({ title = 'Confirm', body = '', confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    const modal = openModal({
      title,
      body,
      footer: `
        <button class="btn btn--secondary" data-action="cancel">${escapeHtml(cancelText)}</button>
        <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-action="confirm">${escapeHtml(confirmText)}</button>`,
    });
    let confirmed = false;
    modal.onClose = () => resolve(confirmed);
    const confirmButton = modal.footer.querySelector('[data-action="confirm"]');
    confirmButton.addEventListener('click', () => { confirmed = true; modal.close(); }, { signal: modal.signal });
    modal.footer.querySelector('[data-action="cancel"]').addEventListener('click', () => modal.close(), { signal: modal.signal });
    confirmButton.focus();
  });
}

window.showToast = showToast;
window.showModal = showModal;
window.openModal = openModal;

// ─── Router ─────────────────────────────────────────────────────────────────

let currentView = null;

function navigateTo(name) {
  const view = VIEWS[name];
  if (!view) return;

  try {
    currentView?.unmount?.();
  } catch (err) {
    console.error('Failed to unmount view:', err);
  }
  activeModal?.close();
  currentView = view;

  document.querySelectorAll('.nav-item').forEach((item) => {
    const active = item.dataset.view === name;
    item.classList.toggle('nav-item--active', active);
    item.setAttribute('aria-current', active ? 'page' : 'false');
  });

  const content = byId('content');
  content.innerHTML = view.render();
  content.scrollTop = 0;
  content.firstElementChild?.classList.add('fade-in');

  Promise.resolve()
    .then(() => view.mount())
    .catch((err) => {
      console.error(`Failed to mount view "${name}":`, err);
      showToast(`This page failed to load: ${errorMessage(err)}`, 'error');
    });
}

window.navigateTo = navigateTo;

document.querySelectorAll('.nav-item').forEach((item) => {
  item.addEventListener('click', () => navigateTo(item.dataset.view));
});

document.addEventListener('keydown', (e) => {
  if (!e.ctrlKey || e.altKey || activeModal || !/^[1-7]$/.test(e.key)) return;
  e.preventDefault();
  navigateTo(VIEW_ORDER[Number(e.key) - 1]);
});

// ─── Status (title bar + sidebar) ───────────────────────────────────────────

/** Shared, read-only for views; updated on every status poll ("app:status" event). */
const appState = { account: null, processes: [], clientRunning: false, gameRunning: false, persistedLocked: null };
window.appState = appState;

function renderStatusChrome() {
  const clientText = appState.gameRunning ? 'In Game' : appState.clientRunning ? 'Client Online' : 'Client Offline';
  const clientClass = `status-badge status-badge--${appState.clientRunning || appState.gameRunning ? 'online' : 'offline'}`;

  const sidebarBadge = byId('client-status-badge');
  sidebarBadge.className = clientClass;
  sidebarBadge.querySelector('.status-badge__text').textContent = clientText;

  const titlebarBadge = byId('titlebar-client-badge');
  titlebarBadge.className = clientClass;
  titlebarBadge.textContent = clientText;

  byId('titlebar-account-name').textContent = appState.account?.name ?? 'None';

  const lockBadge = byId('titlebar-lock-badge');
  lockBadge.style.display = appState.persistedLocked === null ? 'none' : '';
  lockBadge.className = `status-badge status-badge--${appState.persistedLocked ? 'locked' : 'offline'}`;
  lockBadge.textContent = appState.persistedLocked ? 'Locked' : 'Unlocked';
}

let statusTimer = null;
let statusInFlight = null;

async function pollStatus() {
  const [snapshot, account, locked] = await Promise.all([
    api.status.snapshot().catch(() => null),
    api.client.getCurrentSummonerProfile(),
    api.paths
      .resolve()
      .then((paths) => api.lock.isReadOnly(paths.persistedSettings))
      .catch(() => null),
  ]);
  if (snapshot) Object.assign(appState, snapshot);
  appState.account = account;
  appState.persistedLocked = locked;

  renderStatusChrome();
  window.dispatchEvent(new CustomEvent('app:status', { detail: appState }));

  if (account?.live) {
    await runAccountAutomation(account).catch((err) => console.warn('Account automation failed:', err));
  }
}

/** Refreshes now and restarts the polling timer. Concurrent calls share one refresh. */
function refreshStatus() {
  clearTimeout(statusTimer);
  statusInFlight ??= pollStatus()
    .catch((err) => console.warn('Status refresh failed:', err))
    .finally(() => {
      statusInFlight = null;
      statusTimer = setTimeout(refreshStatus, STATUS_POLL_MS);
    });
  return statusInFlight;
}

window.refreshStatus = refreshStatus;

async function toggleCloudSyncLock() {
  try {
    const { persistedSettings } = await api.paths.resolve();
    const locked = await api.lock.isReadOnly(persistedSettings);
    if (locked) await api.lock.removeReadOnly(persistedSettings);
    else await api.lock.setReadOnly(persistedSettings);
    showToast(
      locked
        ? 'PersistedSettings.json unlocked: Riot cloud sync can update it again'
        : 'PersistedSettings.json locked: Riot cloud sync can no longer overwrite it',
      'success',
    );
    await refreshStatus();
  } catch (err) {
    showToast(`Could not change the lock: ${errorMessage(err)}`, 'error');
  }
}

window.toggleCloudSyncLock = toggleCloudSyncLock;

// ─── Account automation ─────────────────────────────────────────────────────

let lastAutomation = { account: null, at: 0 };

async function runAccountAutomation(account) {
  if (appState.gameRunning) return;

  const accountChanged = readText(KEYS.lastAccount) !== account.name;
  if (accountChanged) {
    writeText(KEYS.lastAccount, account.name);
    writeText(KEYS.lastAutoApplied, null);
  }
  const recentlyRan = lastAutomation.account === account.name && Date.now() - lastAutomation.at < AUTOMATION_INTERVAL_MS;
  if (!accountChanged && recentlyRan) return;
  lastAutomation = { account: account.name, at: Date.now() };

  await applyLinkedProfile(account);
  await ensureAccountBackup(account);
}

async function applyLinkedProfile(account) {
  if (!readFlag(KEYS.autoSwitcher, true)) return;
  const profileName = readJson(KEYS.accountMappings, {})[account.name];
  const combination = `${account.name}:${profileName}`;
  if (!profileName || readText(KEYS.lastAutoApplied) === combination) return;

  // Recorded before applying so a failure is reported once, not on every poll.
  writeText(KEYS.lastAutoApplied, combination);
  try {
    await api.profiles.applyAll(await api.profiles.load(profileName));
    showToast(`Auto Switcher: applied "${profileName}" for ${account.name}`, 'success');
  } catch (err) {
    showToast(`Auto Switcher could not apply "${profileName}": ${errorMessage(err)}`, 'error');
  }
}

async function ensureAccountBackup(account) {
  const name = account.name.toLowerCase();
  const matches = (await api.profiles.list()).filter(
    (p) =>
      p.name.toLowerCase() === name ||
      p.name.toLowerCase().startsWith(`${name}_`) ||
      p.meta?.summonerName?.toLowerCase() === name,
  );

  if (!matches.length) {
    // Only once per account, so deleting that profile is respected.
    if (readFlag(KEYS.autoSavedAccount(account.name), false)) return;
    await api.profiles.quickSave(account.name);
    writeFlag(KEYS.autoSavedAccount(account.name), true);
    showToast(`New account detected: settings saved as profile "${account.name}"`, 'success');
    return;
  }

  const newest = Math.max(...matches.map((p) => Date.parse(p.createdAt) || 0));
  if (Date.now() - newest > BACKUP_MAX_AGE_MS) {
    const backupName = `${account.name}_${new Date().toISOString().slice(0, 10)}`;
    await api.profiles.quickSave(backupName);
    showToast(`Monthly backup saved as "${backupName}"`, 'success');
  }
}

// ─── Global hotkeys ─────────────────────────────────────────────────────────

api.system.setGlobalHotkeys(readFlag(KEYS.globalHotkeys, true)).catch((err) => {
  console.warn('Could not configure global hotkeys:', err);
});

api.profiles.onGlobalHotkey(async (slot) => {
  const slotName = `Slot_${slot}`;
  try {
    await api.profiles.applyAll(await api.profiles.load(slotName));
    showToast(`Ctrl+Alt+${slot}: applied Slot ${slot}`, 'success');
  } catch (err) {
    showToast(`Ctrl+Alt+${slot}: ${errorMessage(err)}`, 'error');
  }
});

// ─── Startup ────────────────────────────────────────────────────────────────

byId('btn-minimize').addEventListener('click', () => api.window.minimize());
byId('btn-maximize').addEventListener('click', () => api.window.maximize());
byId('btn-close').addEventListener('click', () => api.window.close());
byId('titlebar-lock-badge').addEventListener('click', toggleCloudSyncLock);

const savedTheme = readText(KEYS.theme, 'default');
if (/^[a-z]+$/.test(savedTheme) && savedTheme !== 'default') {
  document.body.classList.add(`theme-${savedTheme}`);
}

window.__TAURI__.app
  ?.getVersion()
  .then((version) => {
    byId('app-version').textContent = `v${version}`;
  })
  .catch(() => {});

navigateTo('dashboard');
refreshStatus();
