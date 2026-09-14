// "All Configs": every value of each Riot config file, as a form or as raw text.

import { escapeHtml } from '../lib/html.js';
import { isPlainObject } from '../lib/merge.js';
import { listSettings, setSetting } from '../lib/persisted.js';
import { booleanValue, isChecked, valueKind } from '../lib/settings-model.js';
import { confirmAction, errorMessage, toast, withBusyButtons } from '../lib/ui.js';

const FILES = [
  { kind: 'gameCfg', name: 'game.cfg', label: 'game.cfg (in-game video, audio and interface)' },
  { kind: 'persistedSettings', name: 'PersistedSettings.json', label: 'PersistedSettings.json (keybindings, cloud synced)' },
  { kind: 'clientSettings', name: 'LeagueClientSettings.yaml', label: 'LeagueClientSettings.yaml (Riot Client)' },
];

const encodePath = (parts) => parts.map((p) => encodeURIComponent(String(p))).join('/');
const decodePath = (key) => key.split('/').map(decodeURIComponent);

/** Groups every editable leaf value of a file: [{ title, rows: [{ path, name, value }] }]. */
function buildGroups(kind, data) {
  const groups = new Map();
  const add = (title, row) => {
    if (!groups.has(title)) groups.set(title, []);
    groups.get(title).push(row);
  };

  if (kind === 'gameCfg') {
    for (const [section, values] of Object.entries(data ?? {})) {
      for (const [name, value] of Object.entries(values ?? {})) add(`[${section}]`, { path: [section, name], name, value });
    }
  } else if (kind === 'persistedSettings') {
    for (const s of listSettings(data)) {
      add(`${s.fileName} › ${s.sectionName}`, { path: [s.fileName, s.sectionName, s.name], name: s.name, value: s.value });
    }
  } else {
    const walk = (node, path) => {
      for (const [key, value] of Object.entries(node ?? {})) {
        const childPath = [...path, key];
        if (isPlainObject(value) && Object.keys(value).length) walk(value, childPath);
        else add(childPath.slice(0, Math.min(2, childPath.length - 1)).join(' › ') || 'root', { path: childPath, name: childPath.slice(2).join('.') || key, value });
      }
    };
    walk(data, []);
  }

  return [...groups.entries()].map(([title, rows]) => ({ title, rows: rows.sort((a, b) => a.name.localeCompare(b.name)) }));
}

function setValue(kind, data, path, value) {
  if (kind === 'gameCfg') {
    data[path[0]][path[1]] = String(value);
  } else if (kind === 'persistedSettings') {
    setSetting(data, path[0], path[1], path[2], value);
  } else {
    const parent = path.slice(0, -1).reduce((node, key) => node[key], data);
    parent[path.at(-1)] = value;
  }
}

function inputKind(kind, name, value) {
  if (Array.isArray(value) || isPlainObject(value)) return 'json';
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  // YAML already distinguishes strings from numbers/booleans; INI and JSON settings are all strings.
  return kind === 'clientSettings' ? 'string' : valueKind(name, value);
}

function inputHtml(kind, row) {
  const inputType = inputKind(kind, row.name, row.value);
  const attrs = `class="input-control raw-input" data-path="${escapeHtml(encodePath(row.path))}" data-input="${inputType}" aria-label="${escapeHtml(row.name)}"`;
  switch (inputType) {
    case 'boolean':
      return `<input type="checkbox" class="toggle-switch raw-input" data-path="${escapeHtml(encodePath(row.path))}" data-input="boolean" aria-label="${escapeHtml(row.name)}" ${isChecked(row.value) ? 'checked' : ''} />`;
    case 'number':
      return `<input type="number" step="any" ${attrs} style="width: 120px; text-align: right;" value="${escapeHtml(row.value)}" />`;
    case 'json':
      return `<input type="text" ${attrs} style="width: 320px; font-family: monospace;" value="${escapeHtml(JSON.stringify(row.value))}" />`;
    case 'null':
      return `<input type="text" ${attrs} style="width: 320px;" placeholder="(empty)" value="" />`;
    default:
      return `<input type="text" ${attrs} style="width: 320px;" value="${escapeHtml(row.value)}" />`;
  }
}

export function render() {
  return `
    <div id="raw-configs-view" class="page-container animate-fade-in">
      <div class="page-header flex justify-between items-center mb-6">
        <div>
          <h1 class="page-title text-cyan">All Configs</h1>
          <p class="page-subtitle">Every value stored in the config files</p>
        </div>
        <button data-toggle-mode class="btn btn--secondary">View Raw Text</button>
      </div>

      <div class="card mb-4">
        <div class="card-body flex flex-wrap gap-4 items-center justify-between">
          <div class="flex items-center gap-4" style="flex-wrap: wrap;">
            <div class="flex flex-col">
              <span class="text-xs text-muted mb-1 uppercase font-semibold tracking-wider">File</span>
              <select data-file class="select-control" style="width: 340px; height: 38px;">
                ${FILES.map((f) => `<option value="${f.kind}">${escapeHtml(f.label)}</option>`).join('')}
              </select>
            </div>
            <div class="flex flex-col">
              <span class="text-xs text-muted mb-1 uppercase font-semibold tracking-wider">Status</span>
              <span class="status-badge status-badge--offline" data-lock style="margin-top: 8px;">
                <span class="status-badge__dot"></span>
                <span class="status-badge__text">Checking…</span>
              </span>
            </div>
          </div>
          <div class="flex flex-col" data-search-wrapper style="flex: 1; max-width: 400px; min-width: 250px;">
            <span class="text-xs text-muted mb-1 uppercase font-semibold tracking-wider">Search</span>
            <input type="search" data-search class="input-control" placeholder="Search by setting or section…" style="height: 38px;" />
          </div>
        </div>
      </div>

      <div data-form class="flex flex-col"></div>

      <div data-raw class="card mb-4" style="display: none;">
        <div class="card-header"><h2 class="card-title">File Text</h2></div>
        <div class="card-body">
          <textarea data-raw-text class="code-editor code-editor--tall" spellcheck="false" aria-label="File content"></textarea>
        </div>
      </div>

      <div class="card" style="margin-top: 24px;">
        <div class="card-body flex justify-between items-center py-4" style="gap: 16px;">
          <div class="text-sm text-muted" data-path-label style="font-family: monospace; overflow-wrap: anywhere;">Path: …</div>
          <button data-save class="btn btn--primary" style="flex-shrink: 0;">Save & Apply</button>
        </div>
      </div>
    </div>`;
}

export function mount() {
  const root = document.getElementById('raw-configs-view');
  if (!root) return;
  const api = window.api;
  const $ = (selector) => root.querySelector(selector);

  const fileSelect = $('[data-file]');
  const form = $('[data-form]');
  const rawCard = $('[data-raw]');
  const rawText = $('[data-raw-text]');
  const searchInput = $('[data-search]');
  const modeButton = $('[data-toggle-mode]');
  const saveButton = $('[data-save]');

  let kind = fileSelect.value;
  let loaded = null; // { path, raw, data }
  let rawMode = false;
  let dirty = false;

  const fileLabel = () => FILES.find((f) => f.kind === kind).name;

  async function updateLockBadge() {
    const badge = $('[data-lock]');
    try {
      const locked = await api.lock.isReadOnly(loaded.path);
      badge.className = `status-badge status-badge--${locked ? 'locked' : 'online'}`;
      badge.querySelector('.status-badge__text').textContent = locked ? 'Locked (read-only)' : 'Writable';
    } catch {
      badge.className = 'status-badge status-badge--offline';
      badge.querySelector('.status-badge__text').textContent = 'Unknown';
    }
  }

  function renderForm() {
    if (!loaded) return;
    const groups = buildGroups(kind, loaded.data);
    form.innerHTML = groups.length
      ? groups
          .map(
            (group) => `
          <div class="card" data-search-section="${escapeHtml(group.title.toLowerCase())}">
            <div class="card-header"><h3 class="card-title text-violet">${escapeHtml(group.title)}</h3></div>
            <div class="card-body">
              ${group.rows
                .map(
                  (row) => `
                <div class="setting-row" data-search-row="${escapeHtml(row.name.toLowerCase())}">
                  <div class="setting-label"><span class="setting-title" style="font-family: monospace; font-size: 13px;">${escapeHtml(row.name)}</span></div>
                  <div class="setting-control">${inputHtml(kind, row)}</div>
                </div>`,
                )
                .join('')}
            </div>
          </div>`,
          )
          .join('')
      : '<div class="empty-state"><p>This file has no settings.</p></div>';
    applySearch();
  }

  function applySearch() {
    const query = searchInput.value.toLowerCase().trim();
    form.querySelectorAll('[data-search-section]').forEach((card) => {
      const sectionMatches = card.dataset.searchSection.includes(query);
      let visible = 0;
      card.querySelectorAll('[data-search-row]').forEach((row) => {
        const show = sectionMatches || row.dataset.searchRow.includes(query);
        row.style.display = show ? 'flex' : 'none';
        if (show) visible++;
      });
      card.style.display = visible ? 'block' : 'none';
    });
  }

  function setMode(nextRawMode) {
    if (nextRawMode) {
      rawText.value = api.configs.serialize(kind, loaded.data, loaded.raw);
    } else {
      try {
        loaded.data = api.configs.parse(kind, rawText.value);
      } catch (err) {
        toast(`The text is not a valid ${fileLabel()}: ${err.message}`, 'error');
        return;
      }
      renderForm();
    }
    rawMode = nextRawMode;
    form.style.display = rawMode ? 'none' : 'flex';
    rawCard.style.display = rawMode ? 'block' : 'none';
    $('[data-search-wrapper]').style.visibility = rawMode ? 'hidden' : 'visible';
    modeButton.textContent = rawMode ? 'View Form' : 'View Raw Text';
  }

  async function loadFile() {
    kind = fileSelect.value;
    form.innerHTML = '<div class="skeleton skeleton--card" style="height: 200px;"></div>';
    try {
      loaded = await api.configs.read(kind);
      if (!root.isConnected) return;
      dirty = false;
      $('[data-path-label]').textContent = `Path: ${loaded.path}`;
      saveButton.disabled = false;
      if (rawMode) rawText.value = loaded.raw;
      else renderForm();
      await updateLockBadge();
    } catch (err) {
      loaded = null;
      saveButton.disabled = true;
      form.innerHTML = `<div class="empty-state"><h3>Could not load this file</h3><p>${escapeHtml(errorMessage(err))}</p></div>`;
      if (rawMode) setMode(false);
    }
  }

  form.addEventListener('change', (event) => {
    const input = event.target.closest('.raw-input');
    if (!input || !loaded) return;
    const path = decodePath(input.dataset.path);
    let value;

    switch (input.dataset.input) {
      case 'boolean': {
        const current = kind === 'persistedSettings'
          ? listSettings(loaded.data).find((s) => s.fileName === path[0] && s.sectionName === path[1] && s.name === path[2])?.value
          : kind === 'gameCfg' ? loaded.data[path[0]][path[1]] : path.reduce((node, key) => node[key], loaded.data);
        value = typeof current === 'boolean' ? input.checked : booleanValue(current, input.checked);
        break;
      }
      case 'number':
        if (kind === 'clientSettings') {
          value = Number(input.value);
          if (input.value === '' || Number.isNaN(value)) {
            toast('Enter a valid number', 'error');
            return;
          }
        } else {
          value = input.value;
        }
        break;
      case 'json':
        try {
          value = JSON.parse(input.value);
        } catch (err) {
          toast(`Invalid value: ${err.message}`, 'error');
          return;
        }
        break;
      case 'null':
        value = input.value === '' ? null : input.value;
        break;
      default:
        value = input.value;
    }
    setValue(kind, loaded.data, path, value);
    dirty = true;
  });

  rawText.addEventListener('input', () => {
    dirty = true;
  });

  searchInput.addEventListener('input', applySearch);
  modeButton.addEventListener('click', () => loaded && setMode(!rawMode));

  fileSelect.addEventListener('change', async () => {
    if (dirty) {
      const discard = await confirmAction({
        title: 'Discard changes?',
        message: `${fileLabel()} has unsaved changes. Switching files will discard them.`,
        confirmText: 'Discard',
        danger: true,
      });
      if (!discard) {
        fileSelect.value = kind;
        return;
      }
    }
    await loadFile();
  });

  saveButton.addEventListener('click', async () => {
    if (!loaded) return;
    let data = loaded.data;
    if (rawMode) {
      try {
        data = api.configs.parse(kind, rawText.value);
      } catch (err) {
        toast(`The text is not a valid ${fileLabel()}: ${err.message}`, 'error');
        return;
      }
    }

    const confirmed = await confirmAction({
      title: 'Save file',
      message: `Save changes to ${loaded.path}?\nInvalid values can break the game preferences, so a backup is saved first.`,
      confirmText: 'Save',
    });
    if (!confirmed) return;

    await withBusyButtons([saveButton], 'Saving…', async () => {
      try {
        await api.status.assertGameClosed();
        await api.history.saveSnapshot(`Before editing ${fileLabel()}`);
        await api.configs.replace(kind, data);
        toast(`${fileLabel()} saved`, 'success');
        dirty = false;
      } catch (err) {
        toast(`Could not save: ${errorMessage(err)}`, 'error');
      }
    });
    if (!dirty) await loadFile();
  });

  loadFile();
}
