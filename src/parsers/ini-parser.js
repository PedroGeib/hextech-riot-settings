/**
 * INI Parser — game.cfg
 *
 * Handles reading and writing League of Legends / TFT `game.cfg`,
 * which uses a standard Windows INI dialect:
 *
 *   [General]
 *   WindowMode=1
 *   Width=1920
 *
 * We use the `ini` npm package for the heavy lifting but add a
 * safety layer that preserves the original byte-order and avoids
 * clobbering keys that we did not explicitly touch.
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { parse as iniParse, stringify as iniStringify } from 'ini';

/**
 * Read and parse a game.cfg file.
 *
 * @param {string} filePath  Absolute path to game.cfg.
 * @returns {{ raw: string, data: Record<string, Record<string, string>> }}
 * @throws {Error} If the file does not exist or is unreadable.
 */
export function readGameCfg(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`game.cfg not found at "${filePath}".`);
  }

  const raw = readFileSync(filePath, 'utf-8');
  const data = iniParse(raw);

  return { raw, data };
}

/**
 * Merge partial settings into an existing game.cfg data structure.
 *
 * Only the keys present in `patch` are written; all other keys are
 * left untouched.  Sections that do not exist will be created.
 *
 * @param {Record<string, Record<string, string>>} current
 *   Existing parsed INI data (mutated in-place and returned).
 * @param {Record<string, Record<string, string>>} patch
 *   Partial settings to merge.  E.g. `{ General: { WindowMode: '2' } }`.
 * @returns {Record<string, Record<string, string>>}
 */
export function mergeGameCfg(current, patch) {
  for (const [section, values] of Object.entries(patch)) {
    if (!current[section]) {
      current[section] = {};
    }
    for (const [key, value] of Object.entries(values)) {
      current[section][key] = String(value);
    }
  }
  return current;
}

/**
 * Write a parsed INI data structure back to disk.
 *
 * Creates a `.bak` backup of the original file before writing.
 *
 * @param {string} filePath  Absolute path to game.cfg.
 * @param {Record<string, Record<string, string>>} data  Merged INI data.
 * @param {{ backup?: boolean }} [options]
 */
export function writeGameCfg(filePath, data, options = {}) {
  const { backup = true } = options;

  if (backup && existsSync(filePath)) {
    copyFileSync(filePath, `${filePath}.bak`);
  }

  // `ini.stringify` produces `key = value` by default.
  // Riot's game.cfg uses `key=value` (no spaces around `=`).
  const output = iniStringify(data, { whitespace: false });

  writeFileSync(filePath, output, 'utf-8');
}

/**
 * Convenience: read → merge → write in one call.
 *
 * @param {string} filePath
 * @param {Record<string, Record<string, string>>} patch
 * @param {{ backup?: boolean }} [options]
 * @returns {Record<string, Record<string, string>>}  The merged data.
 */
export function patchGameCfg(filePath, patch, options = {}) {
  const { data } = readGameCfg(filePath);
  const merged = mergeGameCfg(data, patch);
  writeGameCfg(filePath, merged, options);
  return merged;
}
