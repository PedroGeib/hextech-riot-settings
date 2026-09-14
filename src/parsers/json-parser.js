/**
 * JSON Parser — PersistedSettings.json
 *
 * Handles reading and writing `PersistedSettings.json`, which Riot uses
 * to store keybindings and server-synced settings.
 *
 * Structure example (simplified):
 * {
 *   "name": "PersistedSettings",
 *   "schemaVersion": 3,
 *   "files": {
 *     "Input.ini": {
 *       "GameEvents": {
 *         "evtCastSpell1": "[q]",
 *         ...
 *       }
 *     },
 *     "Game.cfg": {
 *       "HUD": { ... },
 *       "General": { ... }
 *     }
 *   }
 * }
 *
 * IMPORTANT: Riot cloud-syncs this file.  See `src/utils/file-lock.js`
 * for the Read-Only attribute strategy to prevent overwrite on launch.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { mergeWith, isPlainObject, cloneDeep } from 'lodash-es';

/**
 * Read and parse PersistedSettings.json.
 *
 * @param {string} filePath
 * @returns {{ raw: string, data: object }}
 * @throws {Error} If the file is missing or contains invalid JSON.
 */
export function readPersistedSettings(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`PersistedSettings.json not found at "${filePath}".`);
  }

  const raw = readFileSync(filePath, 'utf-8');

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Failed to parse PersistedSettings.json: ${err.message}. ` +
      `The file may be corrupted — check "${filePath}".`
    );
  }

  return { raw, data };
}

/**
 * Deep-merge a patch into the existing PersistedSettings data.
 *
 * Merging strategy:
 *   - Objects are recursively merged (lodash `mergeWith`).
 *   - Arrays are **replaced** wholesale (Riot treats arrays as atomic values).
 *   - Primitives are overwritten.
 *
 * @param {object} current   Current parsed JSON (cloned internally — not mutated).
 * @param {object} patch     Partial data to apply.
 * @returns {object}         New merged object.
 */
export function mergePersistedSettings(current, patch) {
  const clone = cloneDeep(current);

  return mergeWith(clone, patch, (_objValue, srcValue) => {
    // Replace arrays entirely instead of element-wise merge
    if (Array.isArray(srcValue)) return srcValue;
    // Let lodash handle object recursion and primitive overwrite
    return undefined;
  });
}

/**
 * Merge a patch specifically into a named "file" section within
 * PersistedSettings (e.g., "Input.ini" or "Game.cfg").
 *
 * @param {object} current   Full PersistedSettings data.
 * @param {string} fileName  Section key (e.g. "Input.ini").
 * @param {object} patch     Partial data to merge into that section.
 * @returns {object}         New merged root object.
 */
export function mergeFileSection(current, fileName, patch) {
  const clone = cloneDeep(current);
  if (!clone.files) clone.files = {};
  if (!clone.files[fileName]) clone.files[fileName] = {};

  clone.files[fileName] = mergeWith(
    clone.files[fileName],
    patch,
    (_objValue, srcValue) => {
      if (Array.isArray(srcValue)) return srcValue;
      return undefined;
    },
  );

  return clone;
}

/**
 * Write PersistedSettings data back to disk.
 *
 * @param {string} filePath
 * @param {object} data
 * @param {{ backup?: boolean, pretty?: boolean }} [options]
 */
export function writePersistedSettings(filePath, data, options = {}) {
  const { backup = true, pretty = true } = options;

  if (backup && existsSync(filePath)) {
    copyFileSync(filePath, `${filePath}.bak`);
  }

  const indent = pretty ? 2 : 0;
  writeFileSync(filePath, JSON.stringify(data, null, indent), 'utf-8');
}

/**
 * Convenience: read → merge → write.
 *
 * @param {string} filePath
 * @param {object} patch
 * @param {{ backup?: boolean, pretty?: boolean }} [options]
 * @returns {object}  The merged data.
 */
export function patchPersistedSettings(filePath, patch, options = {}) {
  const { data } = readPersistedSettings(filePath);
  const merged = mergePersistedSettings(data, patch);
  writePersistedSettings(filePath, merged, options);
  return merged;
}
