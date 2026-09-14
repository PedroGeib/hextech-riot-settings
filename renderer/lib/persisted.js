// Helpers for PersistedSettings.json, whose shape is:
//
//   { description, files: [ { name: 'Input.ini', sections: [
//       { name: 'GameEvents', settings: [ { name: 'evtCastSpell1', value: '[q]' } ] } ] } ] }
//
// Riot syncs this file with its servers, so writes merge setting-by-setting
// instead of replacing the file.

export const GAME_CFG_FILE = 'Game.cfg';
export const INPUT_FILE = 'Input.ini';
export const GAME_EVENTS_SECTION = 'GameEvents';
export const UNBOUND = '[<Unbound>]';

const sameName = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

export function findFile(data, fileName) {
  return (data?.files ?? []).find((f) => sameName(f.name, fileName)) ?? null;
}

function findSection(file, sectionName) {
  return (file?.sections ?? []).find((s) => s.name === sectionName) ?? null;
}

export function findSetting(data, fileName, sectionName, name) {
  const section = findSection(findFile(data, fileName), sectionName);
  return (section?.settings ?? []).find((s) => s.name === name) ?? null;
}

/**
 * Sets a setting's value. Returns false when the setting does not exist and
 * `create` is not set, so callers never invent keys Riot doesn't know about.
 */
export function setSetting(data, fileName, sectionName, name, value, { create = false } = {}) {
  if (!data || typeof data !== 'object') return false;
  let setting = findSetting(data, fileName, sectionName, name);
  if (!setting) {
    if (!create) return false;
    data.files ??= [];
    let file = findFile(data, fileName);
    if (!file) {
      file = { name: fileName, sections: [] };
      data.files.push(file);
    }
    file.sections ??= [];
    let section = findSection(file, sectionName);
    if (!section) {
      section = { name: sectionName, settings: [] };
      file.sections.push(section);
    }
    section.settings ??= [];
    setting = { name, value: '' };
    section.settings.push(setting);
  }
  setting.value = String(value);
  return true;
}

export function listSettings(data) {
  const out = [];
  for (const file of data?.files ?? []) {
    for (const section of file.sections ?? []) {
      for (const setting of section.settings ?? []) {
        out.push({ fileName: file.name, sectionName: section.name, name: setting.name, value: setting.value });
      }
    }
  }
  return out;
}

/** Returns a new object with every setting from `patch` applied onto `current`. */
export function mergePersisted(current, patch) {
  const result = structuredClone(current && typeof current === 'object' ? current : {});
  for (const [key, value] of Object.entries(patch ?? {})) {
    if (key !== 'files') result[key] = structuredClone(value);
  }
  for (const s of listSettings(patch)) {
    setSetting(result, s.fileName, s.sectionName, s.name, s.value, { create: true });
  }
  return result;
}

// ─── Keybindings ────────────────────────────────────────────────────────────

/** 'Q' → '[q]', 'Space' → '[Space]' (the notation used in Input.ini). */
export function keyToken(key) {
  const k = String(key);
  return k.length === 1 ? `[${k.toLowerCase()}]` : `[${k}]`;
}

// A binding value holds up to two comma-separated tokens: primary and secondary.
function bindingTokens(value) {
  return String(value ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t && t !== UNBOUND);
}

export function findBinding(data, key) {
  const token = keyToken(key);
  return (
    listSettings(data).find(
      (s) => sameName(s.fileName, INPUT_FILE) && bindingTokens(s.value).some((t) => sameName(t, token)),
    ) ?? null
  );
}

/**
 * Makes `key` the primary binding of `action`, keeping the action's secondary
 * binding and unbinding the key from every other action.
 */
export function rebindKey(data, key, action) {
  const token = keyToken(key);
  const original = bindingTokens(findSetting(data, INPUT_FILE, GAME_EVENTS_SECTION, action)?.value);
  const secondary = original.slice(1).filter((t) => !sameName(t, token));

  for (const section of findFile(data, INPUT_FILE)?.sections ?? []) {
    for (const setting of section.settings ?? []) {
      const tokens = bindingTokens(setting.value);
      const remaining = tokens.filter((t) => !sameName(t, token));
      if (remaining.length !== tokens.length) {
        setting.value = remaining.length ? remaining.join(',') : UNBOUND;
      }
    }
  }

  return setSetting(data, INPUT_FILE, GAME_EVENTS_SECTION, action, [token, ...secondary].join(','), {
    create: true,
  });
}
