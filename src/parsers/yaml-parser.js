/**
 * YAML Parser — LeagueClientSettings.yaml
 *
 * Handles reading and writing `LeagueClientSettings.yaml`, which the
 * League Client uses for UI preferences, locale, and behavioural flags.
 *
 * Riot uses a hybrid format: the file extension is `.yaml` but the
 * actual content can be either strict YAML **or** JSON.  We handle
 * both transparently.
 *
 * Typical structure:
 * ```yaml
 * install:
 *   gameflow-process-info: ""
 *   globals:
 *     locale: "en_GB"
 *     region: "EUW"
 *   ...
 * ```
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { mergeWith, cloneDeep } from 'lodash-es';

/**
 * Detect whether raw content is JSON or YAML and parse accordingly.
 *
 * @param {string} raw  File contents.
 * @returns {{ data: object, format: 'json' | 'yaml' }}
 */
function autoDetectAndParse(raw) {
  const trimmed = raw.trimStart();

  // If the file begins with `{`, assume JSON
  if (trimmed.startsWith('{')) {
    return { data: JSON.parse(trimmed), format: 'json' };
  }

  // Otherwise, fall through to YAML
  const data = yaml.load(raw);
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('LeagueClientSettings.yaml parsed to a non-object value.');
  }
  return { data, format: 'yaml' };
}

/**
 * Read and parse LeagueClientSettings.yaml.
 *
 * @param {string} filePath
 * @returns {{ raw: string, data: object, format: 'json' | 'yaml' }}
 */
export function readClientYaml(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`LeagueClientSettings.yaml not found at "${filePath}".`);
  }

  const raw = readFileSync(filePath, 'utf-8');
  const { data, format } = autoDetectAndParse(raw);

  return { raw, data, format };
}

/**
 * Deep-merge a patch into the client settings data.
 *
 * Same strategy as PersistedSettings: arrays replaced atomically,
 * objects merged recursively.
 *
 * @param {object} current
 * @param {object} patch
 * @returns {object}  New merged object (input is not mutated).
 */
export function mergeClientYaml(current, patch) {
  const clone = cloneDeep(current);

  return mergeWith(clone, patch, (_objValue, srcValue) => {
    if (Array.isArray(srcValue)) return srcValue;
    return undefined;
  });
}

/**
 * Write client settings back to disk, preserving the original format.
 *
 * @param {string} filePath
 * @param {object} data
 * @param {{ backup?: boolean, format?: 'json' | 'yaml' }} [options]
 */
export function writeClientYaml(filePath, data, options = {}) {
  const { backup = true, format = 'yaml' } = options;

  if (backup && existsSync(filePath)) {
    copyFileSync(filePath, `${filePath}.bak`);
  }

  let output;
  if (format === 'json') {
    output = JSON.stringify(data, null, 2);
  } else {
    output = yaml.dump(data, {
      indent: 2,
      lineWidth: -1,        // Never wrap lines
      noRefs: true,          // Avoid YAML anchors
      sortKeys: false,       // Preserve insertion order
      quotingType: '"',      // Prefer double quotes for strings
      forceQuotes: false,    // Only quote when necessary
    });
  }

  writeFileSync(filePath, output, 'utf-8');
}

/**
 * Convenience: read → merge → write.
 *
 * @param {string} filePath
 * @param {object} patch
 * @param {{ backup?: boolean }} [options]
 * @returns {object}  The merged data.
 */
export function patchClientYaml(filePath, patch, options = {}) {
  const { data, format } = readClientYaml(filePath);
  const merged = mergeClientYaml(data, patch);
  writeClientYaml(filePath, merged, { ...options, format });
  return merged;
}
