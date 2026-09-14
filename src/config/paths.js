/**
 * Riot Games Config Path Resolver
 * 
 * Locates the Riot Games installation directory and resolves
 * paths to the three target configuration files:
 *   - game.cfg         (INI — in-game settings for LoL / TFT)
 *   - PersistedSettings.json  (JSON — keybindings, cloud-synced)
 *   - LeagueClientSettings.yaml (YAML — client UI/behaviour)
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir, platform } from 'node:os';

// ─── Default search roots (ordered by likelihood) ──────────────────────────
const DEFAULT_SEARCH_ROOTS = [
  'C:\\Riot Games\\League of Legends',
  'D:\\Riot Games\\League of Legends',
  'E:\\Riot Games\\League of Legends',
  join(homedir(), 'Riot Games', 'League of Legends'),
  join('C:\\Program Files', 'Riot Games', 'League of Legends'),
  join('C:\\Program Files (x86)', 'Riot Games', 'League of Legends'),
];

const CONFIG_DIR = 'Config';

const TARGET_FILES = Object.freeze({
  GAME_CFG:          'game.cfg',
  PERSISTED_JSON:    'PersistedSettings.json',
  CLIENT_YAML:       'LeagueClientSettings.yaml',
});

// ─── Internal helpers ──────────────────────────────────────────────────────

/**
 * Checks whether a given directory contains the expected Config subfolder
 * with at least one of the target files present.
 *
 * @param {string} root  Candidate installation root.
 * @returns {boolean}
 */
function isValidInstallation(root) {
  const configDir = join(root, CONFIG_DIR);
  if (!existsSync(configDir)) return false;

  try {
    const entries = readdirSync(configDir);
    return Object.values(TARGET_FILES).some(f => entries.includes(f));
  } catch {
    return false;
  }
}

/**
 * Recursively searches a drive root for directories named "League of Legends"
 * that contain a valid Config folder.  Depth-limited to prevent runaway scans.
 *
 * @param {string}  searchRoot  Directory to start scanning from.
 * @param {number}  maxDepth    Maximum recursion depth.
 * @returns {string|null}  Resolved installation path, or null.
 */
function deepScan(searchRoot, maxDepth = 3) {
  if (maxDepth <= 0 || !existsSync(searchRoot)) return null;

  try {
    const entries = readdirSync(searchRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      // Skip system / hidden directories
      if (entry.name.startsWith('.') || entry.name.startsWith('$')) continue;

      const candidate = join(searchRoot, entry.name);
      if (entry.name === 'League of Legends' && isValidInstallation(candidate)) {
        return candidate;
      }

      const deeper = deepScan(candidate, maxDepth - 1);
      if (deeper) return deeper;
    }
  } catch {
    // Permission denied or inaccessible — skip silently.
  }
  return null;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Detects the League of Legends installation directory.
 *
 * Resolution order:
 *   1. Explicit override via `options.installPath`.
 *   2. `RIOT_INSTALL_PATH` environment variable.
 *   3. Well-known default locations (C:\Riot Games\..., etc.).
 *   4. Shallow deep-scan of all fixed drive roots.
 *
 * @param {{ installPath?: string }} [options]
 * @returns {string} Resolved installation root.
 * @throws {Error} If no valid installation is found.
 */
export function resolveInstallPath(options = {}) {
  // 1. Explicit override
  if (options.installPath) {
    const custom = resolve(options.installPath);
    if (isValidInstallation(custom)) return custom;
    throw new Error(
      `Provided installPath "${custom}" is not a valid League of Legends installation ` +
      `(expected a "Config" subfolder with game.cfg / PersistedSettings.json).`
    );
  }

  // 2. Environment variable
  const envPath = process.env.RIOT_INSTALL_PATH;
  if (envPath) {
    const resolved = resolve(envPath);
    if (isValidInstallation(resolved)) return resolved;
  }

  // 3. Well-known defaults
  for (const root of DEFAULT_SEARCH_ROOTS) {
    if (isValidInstallation(root)) return root;
  }

  // 4. Deep scan on Windows only (drive letters)
  if (platform() === 'win32') {
    for (const letter of ['C', 'D', 'E', 'F']) {
      const driveRoot = `${letter}:\\`;
      if (!existsSync(driveRoot)) continue;
      const found = deepScan(driveRoot, 3);
      if (found) return found;
    }
  }

  throw new Error(
    'Could not locate a valid Riot Games / League of Legends installation. ' +
    'Set the RIOT_INSTALL_PATH environment variable or pass { installPath } explicitly.'
  );
}

/**
 * Returns fully qualified paths to all three target configuration files.
 *
 * @param {{ installPath?: string }} [options]
 * @returns {{
 *   configDir: string,
 *   gameCfg: string,
 *   persistedSettings: string,
 *   clientSettings: string,
 * }}
 */
export function resolveConfigPaths(options = {}) {
  const installRoot = resolveInstallPath(options);
  const configDir   = join(installRoot, CONFIG_DIR);

  return {
    configDir,
    gameCfg:           join(configDir, TARGET_FILES.GAME_CFG),
    persistedSettings: join(configDir, TARGET_FILES.PERSISTED_JSON),
    clientSettings:    join(configDir, TARGET_FILES.CLIENT_YAML),
  };
}

export { TARGET_FILES, DEFAULT_SEARCH_ROOTS, isValidInstallation };
