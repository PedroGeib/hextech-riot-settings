/**
 * League of Legends Settings Module
 *
 * Operates on `game.cfg` (INI) for in-game video/audio/HUD settings,
 * and on `PersistedSettings.json` for keybindings and server-synced
 * preferences.
 *
 * Because PersistedSettings.json is cloud-synced, all writes to it go
 * through the file-lock mechanism (Read-Only attribute toggle).
 */

import { resolveConfigPaths } from '../config/paths.js';
import { readGameCfg, mergeGameCfg, writeGameCfg } from '../parsers/ini-parser.js';
import {
  readPersistedSettings,
  mergePersistedSettings,
  mergeFileSection,
  writePersistedSettings,
} from '../parsers/json-parser.js';
import { assertClientClosed } from '../utils/process-checker.js';
import { withUnlockedFile } from '../utils/file-lock.js';

// ─── game.cfg operations ──────────────────────────────────────────────────

/**
 * Read the current LoL game.cfg settings.
 *
 * @param {{ installPath?: string }} [options]
 * @returns {{ data: object, filePath: string }}
 */
export function readLoLGameCfg(options = {}) {
  const { gameCfg: filePath } = resolveConfigPaths(options);
  const { data } = readGameCfg(filePath);
  return { data, filePath };
}

/**
 * Update LoL in-game settings (video, audio, HUD) via game.cfg.
 *
 * @param {Record<string, Record<string, string>>} params
 *   INI-style patch, e.g.:
 *   ```
 *   {
 *     General: { WindowMode: '2', Width: '2560', Height: '1440' },
 *     Sound:   { MasterVolume: '0.5' },
 *   }
 *   ```
 *
 * @param {{ installPath?: string, backup?: boolean }} [options]
 * @returns {{ merged: object, filePath: string }}
 */
export function updateLoLSettings(params, options = {}) {
  const { gameCfg: filePath } = resolveConfigPaths(options);
  const { data } = readGameCfg(filePath);
  const merged = mergeGameCfg(data, params);
  writeGameCfg(filePath, merged, options);

  return { merged, filePath };
}

// ─── PersistedSettings operations (keybindings, cloud-synced) ─────────────

/**
 * Read the current LoL PersistedSettings.
 *
 * @param {{ installPath?: string }} [options]
 * @returns {{ data: object, filePath: string }}
 */
export function readLoLKeybindings(options = {}) {
  const { persistedSettings: filePath } = resolveConfigPaths(options);
  const { data } = readPersistedSettings(filePath);
  return { data, filePath };
}

/**
 * Update LoL keybindings / cloud-synced settings.
 *
 * This function:
 *   1. Asserts the client is not running (unless `force` is set).
 *   2. Unlocks the file if it was previously set to Read-Only.
 *   3. Merges and writes the new settings.
 *   4. Re-locks the file to prevent cloud-sync overwrite.
 *
 * @param {object} params  Patch to merge into PersistedSettings.json.
 *   Can target the root level or a specific file section:
 *   ```
 *   {
 *     files: {
 *       "Input.ini": {
 *         GameEvents: { evtCastSpell1: "[q]" }
 *       }
 *     }
 *   }
 *   ```
 *
 * @param {{ installPath?: string, force?: boolean, lockAfterWrite?: boolean }} [options]
 * @returns {Promise<{ merged: object, filePath: string }>}
 */
export async function updateLoLKeybindings(params, options = {}) {
  const { force = false, lockAfterWrite = true } = options;
  const { persistedSettings: filePath } = resolveConfigPaths(options);

  assertClientClosed({ force });

  let merged;
  await withUnlockedFile(
    filePath,
    () => {
      const { data } = readPersistedSettings(filePath);
      merged = mergePersistedSettings(data, params);
      writePersistedSettings(filePath, merged, options);
    },
    { relock: lockAfterWrite },
  );

  return { merged, filePath };
}

/**
 * Update a specific file-section inside PersistedSettings.json
 * (e.g., "Input.ini", "Game.cfg" inside persisted).
 *
 * @param {string} sectionName  e.g. "Input.ini"
 * @param {object} patch
 * @param {{ installPath?: string, force?: boolean, lockAfterWrite?: boolean }} [options]
 * @returns {Promise<{ merged: object, filePath: string }>}
 */
export async function updateLoLPersistedSection(sectionName, patch, options = {}) {
  const { force = false, lockAfterWrite = true } = options;
  const { persistedSettings: filePath } = resolveConfigPaths(options);

  assertClientClosed({ force });

  let merged;
  await withUnlockedFile(
    filePath,
    () => {
      const { data } = readPersistedSettings(filePath);
      merged = mergeFileSection(data, sectionName, patch);
      writePersistedSettings(filePath, merged, options);
    },
    { relock: lockAfterWrite },
  );

  return { merged, filePath };
}

// ─── Preset Helpers ────────────────────────────────────────────────────────

/**
 * Set video resolution in game.cfg.
 *
 * @param {number} width
 * @param {number} height
 * @param {{ installPath?: string }} [options]
 */
export function setResolution(width, height, options = {}) {
  return updateLoLSettings({
    General: {
      Width: String(width),
      Height: String(height),
    },
  }, options);
}

/**
 * Set window mode in game.cfg.
 *
 * @param {'windowed' | 'fullscreen' | 'borderless'} mode
 * @param {{ installPath?: string }} [options]
 */
export function setWindowMode(mode, options = {}) {
  const modeMap = { windowed: '1', fullscreen: '0', borderless: '2' };
  const value = modeMap[mode];
  if (!value) {
    throw new Error(`Invalid window mode "${mode}". Use: windowed, fullscreen, borderless.`);
  }
  return updateLoLSettings({
    General: { WindowMode: value },
  }, options);
}
