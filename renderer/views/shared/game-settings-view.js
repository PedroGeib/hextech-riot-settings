// Shared implementation of the League of Legends and TFT settings pages:
// standard controls, the searchable advanced list, comparison with a saved
// profile, the keymapper and saving. Each page passes a declarative config.

import { escapeHtml } from '../../lib/html.js';
import { GAME_CFG_FILE, findBinding, rebindKey } from '../../lib/persisted.js';
import {
  applyValue,
  booleanValue,
  decodeKey,
  flattenConfigs,
  isChecked,
  valueKind,
  valuesEqual,
} from '../../lib/settings-model.js';
import { confirmAction, errorMessage, toast, withBusyButtons } from '../../lib/ui.js';

const SAVE_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`;
const SYNC_ICON = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M17 2.1l4 4-4 4M3 22v-6h6M21 2v6h-6M7 21.9l-4-4 4-4"/></svg>`;
const COPY_ICON = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`;

const KEYMAP_ACTIONS = [
  ['evtCastSpell1', 'Cast Spell 1 (Q)'],
  ['evtCastSpell2', 'Cast Spell 2 (W)'],
  ['evtCastSpell3', 'Cast Spell 3 (E)'],
  ['evtCastSpell4', 'Cast Spell 4 (R)'],
  ['evtCastAvatarSpell1', 'Summoner Spell 1 (D)'],
  ['evtCastAvatarSpell2', 'Summoner Spell 2 (F)'],
  ['evtUseItem1', 'Use Item 1'],
  ['evtUseItem2', 'Use Item 2'],
  ['evtUseItem3', 'Use Item 3'],
  ['evtUseItem4', 'Use Item 4'],
  ['evtUseItem5', 'Use Item 5'],
  ['evtUseItem6', 'Use Item 6'],
  ['evtUseVisionItem', 'Use Ward'],
  ['evtCameraSnap', 'Center Camera'],
  ['evtPlayerStopPosition', 'Stop Action'],
  ['evtPlayerAttackMove', 'Attack Move'],
];
const KEYMAP_ROWS = [['1', '2', '3', '4', '5', '6', '7'], ['Q', 'W', 'E', 'R'], ['A', 'S', 'D', 'F'], ['Space']];
const HIGHLIGHTED_KEYS = new Set(['Q', 'W', 'E', 'R', 'D', 'F']);

const actionLabel = (name) => KEYMAP_ACTIONS.find(([id]) => id === name)?.[1] ?? name;
const controlKeys = (control) => control.keys ?? [control.key];

function iniValue(ini, key) {
  const { sectionName, keyName } = decodeKey(key);
  return ini?.[sectionName]?.[keyName];
}

function displayValue(control, value) {
  if (value === undefined) return '—';
  switch (control.type) {
    case 'percent':
      return `${Math.round(Number(value) * 100)}%`;
    case 'range':
      return Number(value).toFixed(2);
    case 'toggle':
      return isChecked(value) ? 'ON' : 'OFF';
    case 'select':
      return control.options.find((o) => o.value === String(value))?.label ?? String(value);
    default:
      return String(value);
  }
}

function compareBadgeHtml(text, different, copyAttribute) {
  return `
    <div class="comparison-badge flex items-center gap-2" style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); padding: 4px 10px; border-radius: var(--radius-sm);">
      <span class="text-xs text-muted" style="font-size: 10px; text-transform: uppercase;">Profile:</span>
      <span class="font-mono text-xs ${different ? 'text-amber font-semibold' : 'text-emerald'}">${escapeHtml(text)}</span>
      ${different ? `<button class="btn btn--secondary btn--sm" ${copyAttribute} title="Use this value" style="padding: 2px 6px; font-size: 10px; margin-left: 4px;">${COPY_ICON}</button>` : ''}
    </div>`;
}

// ─── Templates ──────────────────────────────────────────────────────────────

function controlInputHtml(control, index) {
  const attrs = (part = 0) => `data-control="${index}" data-part="${part}"`;
  switch (control.type) {
    case 'resolution':
      return `
        <div class="flex items-center gap-2">
          <input type="number" min="1" step="1" class="input-control" style="width: 90px; text-align: center;" placeholder="Width" aria-label="Width" ${attrs(0)} />
          <span class="text-muted">x</span>
          <input type="number" min="1" step="1" class="input-control" style="width: 90px; text-align: center;" placeholder="Height" aria-label="Height" ${attrs(1)} />
        </div>`;
    case 'select':
      return `
        <select class="select-control" style="width: 150px;" ${attrs()}>
          ${control.options.map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('')}
        </select>`;
    case 'percent':
    case 'range': {
      const [min, max, step] = control.type === 'percent' ? [0, 100, 1] : [control.min, control.max, control.step];
      return `
        <div class="flex items-center gap-2" style="width: 210px;">
          <input type="range" class="slider-control flex-1" min="${min}" max="${max}" step="${step}" aria-label="${escapeHtml(control.label)}" ${attrs()} />
          <span class="font-mono text-xs text-cyan" style="width: 40px; text-align: right;" data-readout="${index}"></span>
        </div>`;
    }
    case 'toggle':
      return `<input type="checkbox" class="toggle-switch" aria-label="${escapeHtml(control.label)}" ${attrs()} />`;
    default:
      throw new Error(`Unknown control type "${control.type}"`);
  }
}

function standardCardsHtml(cards) {
  let index = 0;
  return cards
    .map(
      (card) => `
      <div class="card mb-4">
        <div class="card-header"><h3 class="card-title text-violet">${escapeHtml(card.title)}</h3></div>
        <div class="card-body" style="padding: 0;">
          ${card.controls
            .map((control) => {
              const i = index++;
              return `
              <div class="setting-row" data-row="${i}">
                <div class="setting-label">
                  <span class="setting-title">${escapeHtml(control.label)}</span>
                  <p class="setting-desc">${escapeHtml(control.description)}</p>
                </div>
                <div class="flex items-center gap-4">
                  ${controlInputHtml(control, i)}
                  <div data-badge="${i}"></div>
                </div>
              </div>`;
            })
            .join('')}
        </div>
      </div>`,
    )
    .join('');
}

function keymapperHtml() {
  const keyButton = (key) => {
    const width = key === 'Space' ? '120px' : '36px';
    const accent = HIGHLIGHTED_KEYS.has(key) ? 'font-weight: 600; color: var(--accent-cyan); border-color: var(--accent-cyan);' : '';
    return `<button class="kbd-key btn" data-key="${key}" style="width: ${width}; height: 36px; padding: 0; font-family: monospace; font-size: 13px; ${accent}">${key}</button>`;
  };
  return `
    <div class="card mb-4">
      <div class="card-header"><h3 class="card-title text-violet">Interactive Keymapper</h3></div>
      <div class="card-body">
        <p class="text-sm text-muted mb-4">Click a key to see what it does and bind it to another action.</p>
        <div class="visual-keyboard" style="display: flex; flex-direction: column; gap: 6px; width: 100%; max-width: 480px; margin: 0 auto; background: rgba(0,0,0,0.2); padding: 12px; border-radius: var(--radius-lg); border: 1px solid var(--glass-border);">
          ${KEYMAP_ROWS.map((row) => `<div style="display: flex; gap: 6px; justify-content: center;">${row.map(keyButton).join('')}</div>`).join('')}
        </div>
        <div data-keymap-info style="margin-top: 16px; background: rgba(255,255,255,0.02); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--glass-border); display: none; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <span style="color: var(--text-muted); font-size: 11px;">Selected key:</span>
            <kbd data-keymap-key style="background: var(--bg-tertiary); color: var(--accent-cyan); padding: 3px 8px; border-radius: 4px; font-family: monospace; font-weight: bold; margin-left: 4px; border: 1px solid var(--glass-border);"></kbd>
            <span style="color: var(--text-muted); font-size: 11px; margin-left: 12px;">Bound to:</span>
            <span data-keymap-action class="font-semibold text-emerald" style="margin-left: 4px;"></span>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <select data-keymap-select class="select-control" style="height: 32px; font-size: 12px; width: 180px;">
              ${KEYMAP_ACTIONS.map(([id, label]) => `<option value="${id}">${escapeHtml(label)}</option>`).join('')}
            </select>
            <button data-keymap-rebind class="btn btn--primary btn--sm" style="padding: 4px 10px; font-size: 11px; height: 32px;">Rebind</button>
          </div>
        </div>
      </div>
    </div>`;
}

function advancedInputHtml(key, name, value) {
  const kind = valueKind(name, value);
  const attrs = `data-key="${escapeHtml(key)}" data-kind="${kind}" aria-label="${escapeHtml(name)}"`;
  if (kind === 'boolean') {
    return `<input type="checkbox" class="toggle-switch setting-input-field" ${attrs} ${isChecked(value) ? 'checked' : ''} />`;
  }
  if (kind === 'number') {
    return `<input type="number" step="any" class="input-control setting-input-field" style="width: 110px; text-align: right;" ${attrs} value="${escapeHtml(value)}" />`;
  }
  return `<input type="text" class="input-control setting-input-field" style="width: 250px;" ${attrs} value="${escapeHtml(value)}" />`;
}

// ─── View factory ───────────────────────────────────────────────────────────

/**
 * @param {object} config
 * @param {string} config.id                  DOM id prefix ('lol', 'tft').
 * @param {string} config.title
 * @param {string} config.subtitle
 * @param {string} config.icon                SVG markup for the page title.
 * @param {Array}  config.cards               Standard controls, grouped in cards.
 * @param {string[]} config.categories        Advanced category order.
 * @param {(info) => string} config.categorize
 * @param {(section: string) => boolean} config.iniSection
 * @param {(setting) => boolean} config.persistedSetting
 * @param {boolean} [config.keymapper]
 * @param {boolean} [config.profileTarget]    Allow editing a saved profile instead of the game files.
 * @param {string} config.gameName            Used in messages ("League of Legends").
 */
export function createGameSettingsView(config) {
  const controls = config.cards.flatMap((card) => card.controls);
  const standardKeys = new Set(controls.flatMap(controlKeys));

  function render() {
    return `
      <div id="${config.id}-view" class="page-container animate-fade-in">
        <div class="page-header flex justify-between items-center mb-6">
          <div>
            <h1 class="page-title text-cyan">${config.icon}${escapeHtml(config.title)}</h1>
            <p class="page-subtitle">${escapeHtml(config.subtitle)}</p>
          </div>
          <button data-save class="btn btn--primary flex items-center" style="padding: 10px 20px; font-weight: 600;">${SAVE_ICON}<span data-save-label>Save & Apply</span></button>
        </div>

        <div class="card mb-4">
          <div class="card-body flex flex-wrap gap-4 items-center justify-between">
            <div class="flex items-center gap-4 flex-wrap">
              ${config.profileTarget ? `
              <div class="flex flex-col">
                <span class="text-xs text-muted mb-1 uppercase font-semibold tracking-wider">Settings to edit</span>
                <select data-target class="select-control" style="width: 250px; height: 38px;"><option value="">Current game files</option></select>
              </div>` : ''}
              <div class="flex flex-col">
                <span class="text-xs text-muted mb-1 uppercase font-semibold tracking-wider">Compare with profile</span>
                <select data-compare class="select-control" style="width: 250px; height: 38px;"><option value="">None</option></select>
              </div>
              <button data-sync-all class="btn btn--secondary flex items-center" style="display: none; height: 38px; margin-top: 18px;">${SYNC_ICON}<span data-sync-label>Sync All Differences</span></button>
            </div>
          </div>
        </div>

        ${config.keymapper ? keymapperHtml() : ''}
        ${standardCardsHtml(config.cards)}

        <div class="card mb-4">
          <div class="card-header"><h2 class="card-title text-cyan">Advanced & Additional Settings</h2></div>
          <div class="card-body py-2">
            <div class="flex flex-col mb-4">
              <span class="text-xs text-muted mb-1 uppercase font-semibold tracking-wider">Search advanced options</span>
              <input type="search" data-search class="input-control" placeholder="Search by setting or section name…" style="height: 38px;" />
            </div>
          </div>
        </div>

        <div data-advanced class="flex flex-col gap-6"></div>

        <div class="card" style="margin-top: 24px;">
          <div class="card-body flex justify-between items-center py-4">
            <div class="text-sm text-muted" data-target-description>${escapeHtml(config.gameName)} config files</div>
            <button data-save class="btn btn--primary">${SAVE_ICON}<span data-save-label>Save & Apply</span></button>
          </div>
        </div>
      </div>`;
  }

  function mount() {
    const root = document.getElementById(`${config.id}-view`);
    if (!root) return;
    const $ = (selector) => root.querySelector(selector);
    const api = window.api;

    const targetSelect = $('[data-target]');
    const compareSelect = $('[data-compare]');
    const syncButton = $('[data-sync-all]');
    const searchInput = $('[data-search]');
    const advanced = $('[data-advanced]');
    const saveButtons = [...root.querySelectorAll('[data-save]')];

    /** @type {{ targetName: string, ini: object, persisted: object } | null} */
    let state = null;
    /** @type {{ name: string, ini: object, persisted: object } | null} */
    let compare = null;
    let dirty = false;
    let selectedKey = null;

    // Game.cfg entries in PersistedSettings duplicate game.cfg; applyValue keeps
    // them in sync, so the list only shows the game.cfg copy.
    const flatten = (ini, persisted) =>
      flattenConfigs(ini, persisted, {
        iniSection: config.iniSection,
        persistedSetting: (s) =>
          config.persistedSetting(s) &&
          !(s.fileName.toLowerCase() === GAME_CFG_FILE.toLowerCase() && ini?.[s.sectionName]?.[s.name] !== undefined),
      });

    const currentFlat = () => (state ? flatten(state.ini, state.persisted) : {});
    const compareFlat = () => (compare ? flatten(compare.ini, compare.persisted) : {});

    function differingKeys() {
      if (!state || !compare) return [];
      const current = currentFlat();
      const other = compareFlat();
      return Object.keys(other).filter((k) => current[k] !== undefined && !valuesEqual(current[k], other[k]));
    }

    function markDirty() {
      dirty = true;
      root.querySelectorAll('[data-save-label]').forEach((el) => {
        el.textContent = `${state?.targetName ? 'Save Profile' : 'Save & Apply'} •`;
      });
    }

    function updateSaveLabels() {
      root.querySelectorAll('[data-save-label]').forEach((el) => {
        el.textContent = state?.targetName ? 'Save Profile' : 'Save & Apply';
      });
      const description = $('[data-target-description]');
      description.textContent = state?.targetName
        ? `Editing saved profile "${state.targetName}" (game files are not touched)`
        : `${config.gameName} config files`;
      saveButtons.forEach((b) => (b.disabled = !state));
    }

    // ── Standard controls ──

    function updateReadout(index) {
      const control = controls[index];
      const readout = root.querySelector(`[data-readout="${index}"]`);
      const input = root.querySelector(`[data-control="${index}"]`);
      if (!readout || !input) return;
      if (input.disabled) readout.textContent = '—';
      else readout.textContent = control.type === 'percent' ? `${input.value}%` : Number(input.value).toFixed(2);
    }

    function bindStandardControls() {
      controls.forEach((control, index) => {
        const row = root.querySelector(`[data-row="${index}"]`);
        const missing = controlKeys(control).some((key) => iniValue(state?.ini, key) === undefined);
        row.classList.toggle('setting-row--missing', missing);
        row.title = missing ? 'Not present in game.cfg yet. Change it once in game to create it.' : '';

        controlKeys(control).forEach((key, part) => {
          const input = root.querySelector(`[data-control="${index}"][data-part="${part}"]`);
          const value = iniValue(state?.ini, key);
          input.disabled = value === undefined;
          if (value === undefined) return;
          if (control.type === 'toggle') input.checked = isChecked(value);
          else if (control.type === 'percent') input.value = String(Math.round(Number(value) * 100));
          else input.value = String(value);
        });
        updateReadout(index);
      });
    }

    function renderStandardBadges() {
      const current = currentFlat();
      const other = compareFlat();
      controls.forEach((control, index) => {
        const badge = root.querySelector(`[data-badge="${index}"]`);
        const row = root.querySelector(`[data-row="${index}"]`);
        const keys = controlKeys(control);
        const values = keys.map((k) => other[k]);

        if (!compare || values.every((v) => v === undefined)) {
          badge.innerHTML = '';
          row.classList.remove('setting-row--diff');
          return;
        }
        const different = keys.some((k) => other[k] !== undefined && current[k] !== undefined && !valuesEqual(current[k], other[k]));
        row.classList.toggle('setting-row--diff', different);
        badge.innerHTML = compareBadgeHtml(values.map((v) => displayValue(control, v)).join(' x '), different, `data-copy-control="${index}"`);
      });
    }

    root.querySelectorAll('[data-control]').forEach((input) => {
      input.addEventListener('input', () => updateReadout(Number(input.dataset.control)));
      input.addEventListener('change', () => {
        if (!state) return;
        const control = controls[Number(input.dataset.control)];
        const key = controlKeys(control)[Number(input.dataset.part)];
        const original = iniValue(state.ini, key);
        let value;
        switch (control.type) {
          case 'toggle':
            value = booleanValue(original, input.checked);
            break;
          case 'percent':
            value = (Number(input.value) / 100).toFixed(4);
            break;
          case 'range':
            value = Number(input.value).toFixed(4);
            break;
          case 'resolution':
            if (!/^\d+$/.test(input.value) || Number(input.value) < 1) {
              toast('Resolution must be a positive whole number', 'error');
              input.value = original ?? '';
              return;
            }
            value = input.value;
            break;
          default:
            value = input.value;
        }
        applyValue(state.ini, state.persisted, key, value);
        markDirty();
        renderStandardBadges();
        updateSyncButton();
      });
    });

    // ── Advanced list ──

    function renderAdvanced() {
      if (!state) return;
      const current = currentFlat();
      const other = compareFlat();
      const groups = new Map();

      for (const [key, value] of Object.entries(current)) {
        if (standardKeys.has(key)) continue;
        const info = decodeKey(key);
        const category = config.categorize(info);
        const section = info.source === 'persisted' ? `${info.fileName} › ${info.sectionName}` : info.sectionName;
        if (!groups.has(category)) groups.set(category, new Map());
        const sections = groups.get(category);
        if (!sections.has(section)) sections.set(section, []);
        sections.get(section).push({ key, name: info.keyName, value });
      }

      const html = config.categories
        .filter((category) => groups.has(category))
        .map((category) => {
          const sections = [...groups.get(category).entries()].sort(([a], [b]) => a.localeCompare(b));
          const cards = sections
            .map(([section, items]) => {
              const rows = items
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(({ key, name, value }) => {
                  const compared = compare ? other[key] : undefined;
                  const different = compared !== undefined && !valuesEqual(value, compared);
                  return `
                    <div class="setting-row ${different ? 'setting-row--diff' : ''}" data-search-row="${escapeHtml(name.toLowerCase())}" style="height: auto; min-height: 48px; padding: 10px 0;">
                      <div class="setting-label" style="flex: 1;">
                        <span class="setting-title" style="font-family: monospace; font-size: 13px;">${escapeHtml(name)}</span>
                      </div>
                      <div class="flex items-center gap-4">
                        ${advancedInputHtml(key, name, value)}
                        ${compared !== undefined ? compareBadgeHtml(String(compared), different, `data-copy-key="${escapeHtml(key)}"`) : ''}
                      </div>
                    </div>`;
                })
                .join('');
              return `
                <div class="card mb-4" data-search-section="${escapeHtml(section.toLowerCase())}" style="margin-bottom: 16px;">
                  <div class="card-header py-2" style="border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 12px;">
                    <h4 class="card-title text-violet" style="font-size: 14px;">${escapeHtml(section)}</h4>
                  </div>
                  <div class="card-body" style="padding: 0;">${rows}</div>
                </div>`;
            })
            .join('');
          return `
            <div data-search-category>
              <h3 class="section-title text-cyan" style="font-size: 15px; margin-bottom: 12px; margin-top: 8px; border-bottom: 1px solid rgba(0, 212, 255, 0.15); padding-bottom: 6px;">${escapeHtml(category)}</h3>
              ${cards}
            </div>`;
        })
        .join('');

      advanced.innerHTML = html || '<div class="empty-state"><p>No additional settings found in these files.</p></div>';
      applySearch();
    }

    function applySearch() {
      const query = searchInput.value.toLowerCase().trim();
      advanced.querySelectorAll('[data-search-category]').forEach((category) => {
        let visibleSections = 0;
        category.querySelectorAll('[data-search-section]').forEach((card) => {
          const sectionMatches = card.dataset.searchSection.includes(query);
          let visibleRows = 0;
          card.querySelectorAll('[data-search-row]').forEach((row) => {
            const visible = sectionMatches || row.dataset.searchRow.includes(query);
            row.style.display = visible ? 'flex' : 'none';
            if (visible) visibleRows++;
          });
          card.style.display = visibleRows ? 'block' : 'none';
          if (visibleRows) visibleSections++;
        });
        category.style.display = visibleSections ? 'block' : 'none';
      });
    }

    function updateSyncButton() {
      const count = differingKeys().length;
      syncButton.style.display = compare && count ? 'inline-flex' : 'none';
      $('[data-sync-label]').textContent = `Sync All Differences (${count})`;
    }

    function renderAll() {
      bindStandardControls();
      renderStandardBadges();
      renderAdvanced();
      updateSyncButton();
    }

    advanced.addEventListener('change', (event) => {
      const input = event.target.closest('.setting-input-field');
      if (!input || !state) return;
      const key = input.dataset.key;
      const value = input.dataset.kind === 'boolean' ? booleanValue(currentFlat()[key], input.checked) : input.value;
      applyValue(state.ini, state.persisted, key, value);
      markDirty();

      // Update just this row so keyboard focus is not lost while editing.
      const compared = compare ? compareFlat()[key] : undefined;
      const row = input.closest('.setting-row');
      const different = compared !== undefined && !valuesEqual(value, compared);
      row.classList.toggle('setting-row--diff', different);
      const badge = row.querySelector('.comparison-badge');
      if (badge) badge.outerHTML = compareBadgeHtml(String(compared), different, `data-copy-key="${escapeHtml(key)}"`);
      renderStandardBadges();
      updateSyncButton();
    });

    root.addEventListener('click', (event) => {
      if (!state || !compare) return;
      const other = compareFlat();
      const copyKey = event.target.closest('[data-copy-key]')?.dataset.copyKey;
      const copyControl = event.target.closest('[data-copy-control]')?.dataset.copyControl;
      if (copyKey !== undefined) {
        applyValue(state.ini, state.persisted, copyKey, other[copyKey]);
      } else if (copyControl !== undefined) {
        for (const key of controlKeys(controls[Number(copyControl)])) {
          if (other[key] !== undefined) applyValue(state.ini, state.persisted, key, other[key]);
        }
      } else {
        return;
      }
      markDirty();
      renderAll();
    });

    searchInput.addEventListener('input', applySearch);

    syncButton.addEventListener('click', async () => {
      const keys = differingKeys();
      if (!keys.length) return;
      const confirmed = await confirmAction({
        title: 'Sync differences',
        message: `Copy ${keys.length} value(s) from "${compare.name}" into the settings being edited?\nNothing is written to disk until you save.`,
        confirmText: 'Sync',
      });
      if (!confirmed) return;
      const other = compareFlat();
      keys.forEach((key) => applyValue(state.ini, state.persisted, key, other[key]));
      markDirty();
      renderAll();
      toast(`${keys.length} value(s) copied from "${compare.name}"`, 'success');
    });

    // ── Keymapper ──

    function showBinding() {
      const info = $('[data-keymap-info]');
      if (!info || !selectedKey) return;
      const binding = findBinding(state?.persisted, selectedKey);
      const actionEl = $('[data-keymap-action]');
      $('[data-keymap-key]').textContent = selectedKey;
      actionEl.textContent = binding ? actionLabel(binding.name) : 'Nothing (unbound)';
      actionEl.className = `font-semibold ${binding ? 'text-emerald' : 'text-muted'}`;
      if (binding && KEYMAP_ACTIONS.some(([id]) => id === binding.name)) $('[data-keymap-select]').value = binding.name;
      info.style.display = 'flex';
    }

    root.querySelectorAll('.kbd-key').forEach((button) => {
      button.addEventListener('click', () => {
        root.querySelectorAll('.kbd-key').forEach((b) => b.classList.remove('kbd-key--selected'));
        button.classList.add('kbd-key--selected');
        selectedKey = button.dataset.key;
        showBinding();
      });
    });

    $('[data-keymap-rebind]')?.addEventListener('click', () => {
      if (!selectedKey || !state) return;
      if (!state.persisted?.files) {
        toast('PersistedSettings.json could not be loaded, so keybindings cannot be changed.', 'error');
        return;
      }
      const action = $('[data-keymap-select]').value;
      rebindKey(state.persisted, selectedKey, action);
      markDirty();
      renderAll();
      showBinding();
      toast(`"${selectedKey}" now triggers ${actionLabel(action)}. Save to apply.`, 'success');
    });

    // ── Loading ──

    async function loadProfileOptions() {
      const profiles = await api.profiles.list().catch((err) => {
        toast(`Could not list profiles: ${errorMessage(err)}`, 'error');
        return [];
      });
      const options = profiles.map((p) => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`).join('');
      const fill = (select, emptyLabel) => {
        if (!select) return;
        const previous = select.value;
        select.innerHTML = `<option value="">${emptyLabel}</option>${options}`;
        select.value = profiles.some((p) => p.name === previous) ? previous : '';
      };
      fill(targetSelect, 'Current game files');
      fill(compareSelect, 'None');
    }

    async function loadTarget() {
      const targetName = targetSelect?.value ?? '';
      advanced.innerHTML = '<div class="skeleton skeleton--card" style="height: 150px;"></div>';
      try {
        if (targetName) {
          const profile = await api.profiles.load(targetName);
          state = {
            targetName,
            ini: structuredClone(profile.targets?.gameCfg ?? {}),
            persisted: structuredClone(profile.targets?.persistedSettings ?? {}),
          };
        } else {
          const ini = (await api.lol.readGameCfg()).data;
          let persisted = {};
          try {
            persisted = (await api.lol.readKeybindings()).data;
          } catch (err) {
            toast(`PersistedSettings.json could not be read: ${errorMessage(err)}`, 'error');
          }
          state = { targetName: '', ini, persisted };
        }
        if (!root.isConnected) return;
        dirty = false;
        updateSaveLabels();
        renderAll();
        showBinding();
      } catch (err) {
        state = null;
        updateSaveLabels();
        advanced.innerHTML = `<div class="empty-state"><h3>Could not load settings</h3><p>${escapeHtml(errorMessage(err))}</p></div>`;
      }
    }

    targetSelect?.addEventListener('change', async () => {
      const previous = state?.targetName ?? '';
      if (dirty) {
        const discard = await confirmAction({
          title: 'Discard changes?',
          message: 'You have unsaved changes. Switching will discard them.',
          confirmText: 'Discard',
          danger: true,
        });
        if (!discard) {
          targetSelect.value = previous;
          return;
        }
      }
      if (targetSelect.value && targetSelect.value === compareSelect.value) {
        compareSelect.value = '';
        compare = null;
      }
      await loadTarget();
    });

    compareSelect.addEventListener('change', async () => {
      const name = compareSelect.value;
      compare = null;
      if (name) {
        try {
          const profile = await api.profiles.load(name);
          compare = { name, ini: profile.targets?.gameCfg ?? {}, persisted: profile.targets?.persistedSettings ?? {} };
        } catch (err) {
          toast(`Could not load profile: ${errorMessage(err)}`, 'error');
          compareSelect.value = '';
        }
      }
      renderAll();
    });

    async function save() {
      if (!state) return;
      const busyLabel = state.targetName ? 'Saving profile…' : 'Saving…';
      await withBusyButtons(saveButtons, busyLabel, async () => {
        try {
          if (state.targetName) {
            const profile = await api.profiles.load(state.targetName);
            await api.profiles.save({
              ...profile,
              targets: { ...profile.targets, gameCfg: state.ini, persistedSettings: state.persisted },
            });
            toast(`Profile "${state.targetName}" saved`, 'success');
          } else {
            await api.status.assertGameClosed();
            await api.history.saveSnapshot(`Before saving ${config.gameName} settings`);
            await api.lol.updateSettings(state.ini);
            if (state.persisted?.files) await api.lol.updateKeybindings(state.persisted);
            toast(`${config.gameName} settings saved`, 'success');
          }
          dirty = false;
        } catch (err) {
          toast(`Could not save: ${errorMessage(err)}`, 'error');
        }
      });
      if (!dirty) await loadTarget();
    }

    saveButtons.forEach((button) => button.addEventListener('click', save));

    (async () => {
      await loadProfileOptions();
      await loadTarget();
    })();
  }

  return { render, mount };
}
