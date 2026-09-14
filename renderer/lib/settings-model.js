// Flat, UI-friendly view over game.cfg + PersistedSettings.json.
//
// Every editable value gets a key that encodes where it lives. Parts are
// URI-encoded and joined with '/', because real names contain dots
// ('Input.ini', 'Game.cfg') and spaces ('Camera Height').

import { GAME_CFG_FILE, findSetting, listSettings, setSetting } from './persisted.js';

export function iniKey(section, name) {
  return ['gameCfg', section, name].map(encodeURIComponent).join('/');
}

export function persistedKey(fileName, section, name) {
  return ['persisted', fileName, section, name].map(encodeURIComponent).join('/');
}

export function decodeKey(key) {
  const [source, a, b, c] = String(key).split('/').map(decodeURIComponent);
  if (source === 'gameCfg') return { source, fileName: 'game.cfg', sectionName: a, keyName: b };
  if (source === 'persisted') return { source, fileName: a, sectionName: b, keyName: c };
  return null;
}

export function flattenConfigs(ini, persisted, { iniSection = () => true, persistedSetting = () => true } = {}) {
  const flat = {};
  for (const [section, values] of Object.entries(ini ?? {})) {
    if (!iniSection(section)) continue;
    for (const [name, value] of Object.entries(values ?? {})) {
      flat[iniKey(section, name)] = value;
    }
  }
  for (const s of listSettings(persisted)) {
    if (persistedSetting(s)) flat[persistedKey(s.fileName, s.sectionName, s.name)] = s.value;
  }
  return flat;
}

/**
 * Writes a value addressed by a flat key. game.cfg values also exist in
 * PersistedSettings' "Game.cfg" file, which Riot restores from its servers on
 * login, so both copies are kept aligned when the other one already exists.
 */
export function applyValue(ini, persisted, key, value) {
  const info = decodeKey(key);
  if (!info) return;
  const text = String(value);

  if (info.source === 'gameCfg') {
    ini[info.sectionName] ??= {};
    ini[info.sectionName][info.keyName] = text;
    setSetting(persisted, GAME_CFG_FILE, info.sectionName, info.keyName, text);
    return;
  }

  setSetting(persisted, info.fileName, info.sectionName, info.keyName, text);
  const iniSection = ini?.[info.sectionName];
  if (info.fileName.toLowerCase() === GAME_CFG_FILE.toLowerCase() && iniSection && info.keyName in iniSection) {
    iniSection[info.keyName] = text;
  }
}

/**
 * Copies game.cfg values into the PersistedSettings "Game.cfg" entries that
 * already exist, so Riot's server-synced copy doesn't revert them on login.
 * Returns how many entries changed.
 */
export function syncPersistedWithIni(persisted, ini) {
  let changed = 0;
  for (const [section, values] of Object.entries(ini ?? {})) {
    for (const [name, value] of Object.entries(values ?? {})) {
      const setting = findSetting(persisted, GAME_CFG_FILE, section, name);
      if (setting && setting.value !== String(value)) {
        setting.value = String(value);
        changed++;
      }
    }
  }
  return changed;
}

// Numeric enums ('EffectsQuality=1', 'FrameCapType=0') must not be shown as toggles.
const NON_BOOLEAN_NAME =
  /(quality|type|mode|level|scale|speed|volume|size|offset|width|height|tab|format|visibility|sensitivity|version|time|region|queue|device|rate|index|count|id)$/i;

export function valueKind(name, value) {
  const v = typeof value === 'string' ? value.trim() : value;
  if (typeof v === 'boolean' || v === 'true' || v === 'false') return 'boolean';
  if ((v === '0' || v === '1' || v === 0 || v === 1) && !NON_BOOLEAN_NAME.test(String(name))) return 'boolean';
  if (v !== '' && v !== null && v !== undefined && typeof v !== 'object' && !Number.isNaN(Number(v))) return 'number';
  return 'string';
}

const isNumeric = (v) => typeof v !== 'object' && v !== '' && v !== undefined && !Number.isNaN(Number(v));

/** '1.0000' equals '1'; non-numeric values are compared as exact text. */
export function valuesEqual(a, b) {
  if (isNumeric(a) && isNumeric(b)) return Number(a) === Number(b);
  return String(a ?? '') === String(b ?? '');
}

export function isChecked(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

/** Converts a checkbox state back into the representation the file already uses. */
export function booleanValue(original, checked) {
  if (typeof original === 'boolean') return checked;
  if (original === 'true' || original === 'false') return checked ? 'true' : 'false';
  return checked ? '1' : '0';
}
