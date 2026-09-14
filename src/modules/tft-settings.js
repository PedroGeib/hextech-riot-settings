/**
 * TFT Settings Module
 *
 * Operates on the same `game.cfg` file as League of Legends but
 * targets TFT-specific INI sections.
 *
 * TFT shares the same config file infrastructure — the relevant
 * sections include:
 *   - [General]       — shared resolution/window mode
 *   - [HUD]           — minimap, health bars, etc.
 *   - [Performance]   — frame rate cap, quality presets
 *   - [Sound]         — audio levels
 *   - [Chat]          — chat settings
 *
 * Some PersistedSettings.json keys are also TFT-relevant (e.g.,
 * TFT-specific keybindings).
 */

import { resolveConfigPaths } from '../config/paths.js';
import { readGameCfg, mergeGameCfg, writeGameCfg } from '../parsers/ini-parser.js';
import {
  readPersistedSettings,
  mergePersistedSettings,
  writePersistedSettings,
} from '../parsers/json-parser.js';
import { assertClientClosed } from '../utils/process-checker.js';
import { withUnlockedFile } from '../utils/file-lock.js';

/**
 * Read TFT-relevant sections from game.cfg.
 *
 * @param {{ installPath?: string }} [options]
 * @returns {{ data: object, filePath: string }}
 */
export function readTFTGameCfg(options = {}) {
  const { gameCfg: filePath } = resolveConfigPaths(options);
  const { data } = readGameCfg(filePath);

  // Extract TFT-relevant sections
  const tftSections = {};
  const relevantKeys = ['General', 'HUD', 'Performance', 'Sound', 'Chat', 'FloatingText'];
  for (const key of relevantKeys) {
    if (data[key]) {
      tftSections[key] = data[key];
    }
  }

  return { data: tftSections, fullData: data, filePath };
}

/**
 * Update TFT in-game settings.
 *
 * Writes to the same `game.cfg` used by LoL; only TFT-relevant
 * sections should be passed.
 *
 * @param {Record<string, Record<string, string>>} params
 *   INI-style patch, e.g.:
 *   ```
 *   {
 *     Performance: { FrameCapType: '1', MaxFPS: '144' },
 *     HUD:         { MinimapScale: '1.2' },
 *   }
 *   ```
 *
 * @param {{ installPath?: string, backup?: boolean }} [options]
 * @returns {{ merged: object, filePath: string }}
 */
export function updateTFTSettings(params, options = {}) {
  const { gameCfg: filePath } = resolveConfigPaths(options);
  const { data } = readGameCfg(filePath);
  const merged = mergeGameCfg(data, params);
  writeGameCfg(filePath, merged, options);

  return { merged, filePath };
}

/**
 * Update TFT-specific keybindings in PersistedSettings.json.
 *
 * TFT uses a subset of the same keybinding schema as LoL.
 *
 * @param {object} params  Patch targeting TFT keybindings.
 * @param {{ installPath?: string, force?: boolean, lockAfterWrite?: boolean }} [options]
 * @returns {Promise<{ merged: object, filePath: string }>}
 */
export async function updateTFTKeybindings(params, options = {}) {
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

// ─── Preset Helpers ────────────────────────────────────────────────────────

/**
 * Set the FPS cap for TFT.
 *
 * @param {number} fps  Target FPS (e.g. 60, 144, 240).
 * @param {{ installPath?: string }} [options]
 */
export function setTFTFrameRateCap(fps, options = {}) {
  return updateTFTSettings({
    Performance: {
      FrameCapType: '1',
      MaxFPS: String(fps),
    },
  }, options);
}

/**
 * Set TFT minimap scale.
 *
 * @param {number} scale  Scale factor (e.g. 1.0, 1.5, 2.0).
 * @param {{ installPath?: string }} [options]
 */
export function setTFTMinimapScale(scale, options = {}) {
  return updateTFTSettings({
    HUD: { MinimapScale: String(scale) },
  }, options);
}

/**
 * Mute all TFT audio.
 *
 * @param {{ installPath?: string }} [options]
 */
export function muteTFTAudio(options = {}) {
  return updateTFTSettings({
    Sound: { MasterVolume: '0' },
  }, options);
}
