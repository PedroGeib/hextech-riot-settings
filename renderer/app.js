/**
 * App Controller — Router, Toast, Modal, and View Lifecycle
 *
 * Manages navigation between views, provides global toast notifications
 * and modal dialogs, and handles the custom title bar controls.
 */

// ─── View Imports ──────────────────────────────────────────────────────────
import { render as renderDashboard, mount as mountDashboard } from './views/dashboard.js';
import { render as renderLoL, mount as mountLoL } from './views/lol-settings.js';
import { render as renderTFT, mount as mountTFT } from './views/tft-settings.js';
import { render as renderClient, mount as mountClient } from './views/client-settings.js';
import { render as renderProfiles, mount as mountProfiles } from './views/profiles.js';
import { render as renderRaw, mount as mountRaw } from './views/raw-configs.js';
import { render as renderAppSettings, mount as mountAppSettings } from './views/app-settings.js';

// ─── View Registry ─────────────────────────────────────────────────────────
const views = {
  dashboard: { render: renderDashboard, mount: mountDashboard },
  lol:       { render: renderLoL,       mount: mountLoL },
  tft:       { render: renderTFT,       mount: mountTFT },
  client:    { render: renderClient,    mount: mountClient },
  profiles:  { render: renderProfiles,  mount: mountProfiles },
  rawConfigs: { render: renderRaw,       mount: mountRaw },
  appSettings: { render: renderAppSettings, mount: mountAppSettings },
};

let currentView = 'dashboard';
let dashboardInterval = null;

// ─── DOM References ────────────────────────────────────────────────────────
const content = document.getElementById('content');
const toastContainer = document.getElementById('toast-container');
const modalOverlay = document.getElementById('modal-overlay');
const modalHeader = document.getElementById('modal-header');
const modalBody = document.getElementById('modal-body');
const modalFooter = document.getElementById('modal-footer');

// ─── Router ────────────────────────────────────────────────────────────────

function navigateTo(viewName) {
  if (!views[viewName]) return;

  // Cleanup previous view
  if (currentView === 'dashboard' && dashboardInterval) {
    clearInterval(dashboardInterval);
    dashboardInterval = null;
  }

  currentView = viewName;

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('nav-item--active', item.dataset.view === viewName);
  });

  // Render view
  content.innerHTML = views[viewName].render();

  // Add entrance animation
  const firstChild = content.firstElementChild;
  if (firstChild) {
    firstChild.classList.add('fade-in');
  }

  // Mount view (attach event listeners)
  try {
    views[viewName].mount();
  } catch (err) {
    console.error(`Failed to mount view "${viewName}":`, err);
  }
}

// ─── Toast Notifications ───────────────────────────────────────────────────

let toastId = 0;

/**
 * Show a toast notification.
 *
 * @param {string} message
 * @param {'success' | 'error' | 'info'} [type='info']
 * @param {number} [duration=3500]
 */
function showToast(message, type = 'info', duration = 3500) {
  const id = `toast-${++toastId}`;

  const iconMap = {
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20,6 9,17 4,12"/></svg>`,
    error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.id = id;
  toast.innerHTML = `
    <div class="toast__icon">${iconMap[type] || iconMap.info}</div>
    <div class="toast__message">${message}</div>
    <button class="toast__close" aria-label="Close">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
    <div class="toast__progress" style="animation-duration: ${duration}ms;"></div>
  `;

  toastContainer.appendChild(toast);

  // Trigger entrance animation
  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  // Close button
  toast.querySelector('.toast__close').addEventListener('click', () => dismissToast(id));

  // Auto-dismiss
  setTimeout(() => dismissToast(id), duration);
}

function dismissToast(id) {
  const toast = document.getElementById(id);
  if (!toast) return;
  toast.classList.add('toast--exit');
  setTimeout(() => toast.remove(), 300);
}

// ─── Modal ─────────────────────────────────────────────────────────────────

/**
 * Show a modal dialog.
 *
 * @param {{ title: string, body: string, confirmText?: string, cancelText?: string, danger?: boolean }} options
 * @returns {Promise<boolean>}  Resolves `true` if confirmed, `false` if cancelled.
 */
function showModal(options) {
  const {
    title = 'Confirm',
    body = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = false,
  } = options;

  return new Promise((resolve) => {
    modalHeader.innerHTML = `<h3>${title}</h3>`;
    modalBody.innerHTML = body;
    modalFooter.innerHTML = `
      <button class="btn btn--secondary" id="modal-cancel">${cancelText}</button>
      <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" id="modal-confirm">${confirmText}</button>
    `;

    modalOverlay.style.display = 'flex';
    requestAnimationFrame(() => modalOverlay.classList.add('modal-overlay--visible'));

    const cleanup = (result) => {
      modalOverlay.classList.remove('modal-overlay--visible');
      setTimeout(() => { modalOverlay.style.display = 'none'; }, 200);
      resolve(result);
    };

    document.getElementById('modal-confirm').addEventListener('click', () => cleanup(true), { once: true });
    document.getElementById('modal-cancel').addEventListener('click', () => cleanup(false), { once: true });
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) cleanup(false);
    }, { once: true });
  });
}

// ─── Global Exports ────────────────────────────────────────────────────────
// Make these available to view modules
window.showToast = showToast;
window.showModal = showModal;
window.navigateTo = navigateTo;
window.setDashboardInterval = (id) => { dashboardInterval = id; };

// Load saved theme on startup
const savedTheme = localStorage.getItem('app-theme') || 'default';
if (savedTheme !== 'default') {
  document.body.classList.add(`theme-` + savedTheme);
}

// ─── Sidebar Navigation ───────────────────────────────────────────────────

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const viewName = item.dataset.view;
    if (viewName) navigateTo(viewName);
  });
});

// ─── Status Polling (Titlebar & Sidebar) ────────────────────────────────────

async function updateTitlebarAndSidebarStatus() {
  try {
    const running = await window.api.status.isClientRunning();
    
    // 1. Sidebar status badge
    const badge = document.getElementById('client-status-badge');
    if (badge) {
      if (running) {
        badge.className = 'status-badge status-badge--online';
        badge.querySelector('.status-badge__text').textContent = 'Client Online';
      } else {
        badge.className = 'status-badge status-badge--offline';
        badge.querySelector('.status-badge__text').textContent = 'Client Offline';
      }
    }

    // 2. Titlebar client status badge
    const titlebarClientBadge = document.getElementById('titlebar-client-badge');
    if (titlebarClientBadge) {
      titlebarClientBadge.className = running ? 'status-badge status-badge--online' : 'status-badge status-badge--offline';
      titlebarClientBadge.textContent = running ? 'Client Online' : 'Client Offline';
    }

    // 3. Titlebar active account name
    try {
      const profile = await window.api.client.getCurrentSummonerProfile();
      const titlebarAccountName = document.getElementById('titlebar-account-name');
      if (titlebarAccountName) {
        titlebarAccountName.textContent = profile ? profile.name : 'Nenhuma';
      }
    } catch {}

    // 4. Titlebar lock status
    const paths = await window.api.paths.resolve();
    if (paths && paths.persistedSettings) {
      const isLocked = await window.api.lock.isReadOnly(paths.persistedSettings);
      const titlebarLockBadge = document.getElementById('titlebar-lock-badge');
      if (titlebarLockBadge) {
        titlebarLockBadge.className = isLocked ? 'status-badge status-badge--locked' : 'status-badge status-badge--offline';
        titlebarLockBadge.textContent = isLocked ? (isLocked ? 'Locked' : 'Unlocked') : 'Unlocked';
      }
    }
  } catch (err) {
    console.warn('Status polling error:', err);
  }
}

// Publish to window so tauri-bridge or views can trigger updates
window.updateTitlebarAndSidebarStatus = updateTitlebarAndSidebarStatus;

// Poll status every 8 seconds
updateTitlebarAndSidebarStatus();
setInterval(updateTitlebarAndSidebarStatus, 8000);

// ─── Keyboard Shortcuts ────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  // Ctrl+1–5 for quick nav
  if (e.ctrlKey && e.key >= '1' && e.key <= '7') {
    e.preventDefault();
    const viewNames = ['dashboard', 'lol', 'tft', 'client', 'profiles', 'rawConfigs', 'appSettings'];
    navigateTo(viewNames[parseInt(e.key) - 1]);
  }
});

// ─── Initial Load ──────────────────────────────────────────────────────────

navigateTo('dashboard');

// Listen for auto-save events from backend
window.api.profiles.onAutoSave((_event, summonerName) => {
  window.showToast(`Perfil da conta "${summonerName}" salvo automaticamente!`, 'success');
});

// Listen for global hotkeys (Ctrl + Alt + 1/2)
if (window.api.profiles.onGlobalHotkey) {
  window.api.profiles.onGlobalHotkey(async (hotkeyId) => {
    const hotkeysEnabled = localStorage.getItem('app-settings-global-hotkeys') !== 'false';
    if (!hotkeysEnabled) return;
    try {
      const slotName = hotkeyId === 1 ? 'Slot_1' : 'Slot_2';
      const profile = await window.api.profiles.load(slotName);
      await window.api.profiles.applyAll(profile, { force: true });
      window.showToast(`Global Hotkey: Applied ${slotName} settings!`, 'success');
    } catch (err) {
      window.showToast(`Global Hotkey error: Slot may be empty or client is open`, 'error');
    }
  });
}
