/**
 * Profile Manager
 *
 * Profiles are portable JSON blobs that capture a complete or partial
 * snapshot of all three configuration files.  The profile manager can:
 *
 *   - **Export** the current state into a profile.
 *   - **Import / Apply** a profile to the installation.
 *   - **Store** profiles locally for quick switching.
 *
 * Profile Schema:
 * ```json
 * {
 *   "name": "My Pro Setup",
 *   "version": 1,
 *   "createdAt": "2026-07-19T...",
 *   "targets": {
 *     "gameCfg":          { ... INI-style sections },
 *     "persistedSettings": { ... JSON patch },
 *     "clientSettings":    { ... YAML patch }
 *   }
 * }
 * ```
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';

import { resolveConfigPaths } from '../config/paths.js';
import { readGameCfg } from '../parsers/ini-parser.js';
import { readPersistedSettings } from '../parsers/json-parser.js';
import { readClientYaml } from '../parsers/yaml-parser.js';
import { updateLoLSettings, updateLoLKeybindings } from './lol-settings.js';
import { updateTFTSettings } from './tft-settings.js';
import { updateClientSettings, getCurrentSummonerProfile } from './client-settings.js';

// ─── Constants ─────────────────────────────────────────────────────────────

const PROFILE_VERSION = 1;
const PROFILES_DIR = join(homedir(), '.riot-orchestrator', 'profiles');

// ─── Storage Helpers ───────────────────────────────────────────────────────

/**
 * Ensure the profiles directory exists.
 */
function ensureProfilesDir(dir = PROFILES_DIR) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Sanitize a profile name into a safe filename.
 *
 * @param {string} name
 * @returns {string}
 */
function toFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') + '.json';
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Export the current installation state as a profile object.
 *
 * @param {string} name  Human-friendly profile name.
 * @param {{ installPath?: string, include?: ('gameCfg' | 'persistedSettings' | 'clientSettings')[] }} [options]
 *   `include` defaults to all three targets.
 * @returns {object}  The profile object.
 */
export function exportProfile(name, options = {}) {
  const {
    include = ['gameCfg', 'persistedSettings', 'clientSettings'],
  } = options;

  const paths = resolveConfigPaths(options);
  const targets = {};

  if (include.includes('gameCfg') && existsSync(paths.gameCfg)) {
    targets.gameCfg = readGameCfg(paths.gameCfg).data;
  }

  if (include.includes('persistedSettings') && existsSync(paths.persistedSettings)) {
    targets.persistedSettings = readPersistedSettings(paths.persistedSettings).data;
  }

  if (include.includes('clientSettings') && existsSync(paths.clientSettings)) {
    const { data, format } = readClientYaml(paths.clientSettings);
    targets.clientSettings = data;
    targets._clientSettingsFormat = format;
  }

  const activeProfile = getCurrentSummonerProfile(options);
  const meta = activeProfile ? {
    summonerName: activeProfile.name,
    profileIconId: activeProfile.profileIconId,
    summonerLevel: activeProfile.summonerLevel,
    regalia: activeProfile.regalia || {
      bannerUrl: `https://cdn.communitydragon.org/latest/profile-icon/${activeProfile.profileIconId}`,
      crestUrl: 'https://cdn.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-crests/unranked.png'
    }
  } : null;

  return {
    name,
    version: PROFILE_VERSION,
    createdAt: new Date().toISOString(),
    targets,
    meta,
  };
}

/**
 * Save a profile to the local profiles directory.
 *
 * @param {object} profile  Profile object (from `exportProfile`).
 * @param {{ profilesDir?: string }} [options]
 * @returns {string}  Absolute path to the saved profile file.
 */
export function saveProfile(profile, options = {}) {
  const dir = options.profilesDir || PROFILES_DIR;
  ensureProfilesDir(dir);

  const filePath = join(dir, toFileName(profile.name));
  writeFileSync(filePath, JSON.stringify(profile, null, 2), 'utf-8');

  return filePath;
}

/**
 * Load a profile from disk by name or file path.
 *
 * @param {string} nameOrPath  Profile name or absolute path.
 * @param {{ profilesDir?: string }} [options]
 * @returns {object}  The parsed profile object.
 */
export function loadProfile(nameOrPath, options = {}) {
  const dir = options.profilesDir || PROFILES_DIR;
  let filePath;

  if (existsSync(nameOrPath)) {
    filePath = nameOrPath;
  } else {
    filePath = join(dir, toFileName(nameOrPath));
  }

  if (!existsSync(filePath)) {
    throw new Error(`Profile not found: "${nameOrPath}" (looked in "${filePath}").`);
  }

  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

/**
 * List all saved profiles.
 *
 * @param {{ profilesDir?: string }} [options]
 * @returns {{ name: string, filePath: string, createdAt: string }[]}
 */
export function listProfiles(options = {}) {
  const dir = options.profilesDir || PROFILES_DIR;
  ensureProfilesDir(dir);

  return readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const filePath = join(dir, f);
      try {
        const profile = JSON.parse(readFileSync(filePath, 'utf-8'));
        return {
          name: profile.name || basename(f, '.json'),
          filePath,
          createdAt: profile.createdAt || 'unknown',
          meta: profile.meta || null,
        };
      } catch {
        return { name: basename(f, '.json'), filePath, createdAt: 'parse-error', meta: null };
      }
    });
}

/**
 * Apply an entire profile to the installation.
 *
 * This is the "nuclear" apply — it writes all three configuration
 * targets from the profile.
 *
 * @param {object} profileObject  The full profile object.
 * @param {{ installPath?: string, force?: boolean, lockAfterWrite?: boolean }} [options]
 * @returns {Promise<{ applied: string[] }>}
 */
export async function applyAllProfiles(profileObject, options = {}) {
  const { targets } = profileObject;
  if (!targets || typeof targets !== 'object') {
    throw new Error('Invalid profile: missing "targets" object.');
  }

  const applied = [];

  // 1. game.cfg (not cloud-synced — safe to write any time)
  if (targets.gameCfg) {
    updateLoLSettings(targets.gameCfg, options);
    applied.push('gameCfg');
  }

  // 2. PersistedSettings.json (cloud-synced — requires lock)
  if (targets.persistedSettings) {
    await updateLoLKeybindings(targets.persistedSettings, options);
    applied.push('persistedSettings');
  }

  // 3. LeagueClientSettings.yaml
  if (targets.clientSettings) {
    updateClientSettings(targets.clientSettings, options);
    applied.push('clientSettings');
  }

  return { applied };
}

/**
 * Quick export + save in one call.
 *
 * @param {string} name
 * @param {{ installPath?: string, profilesDir?: string }} [options]
 * @returns {{ profile: object, filePath: string }}
 */
export function quickSaveProfile(name, options = {}) {
  const profile = exportProfile(name, options);
  const filePath = saveProfile(profile, options);
  return { profile, filePath };
}

/**
 * Delete a profile by name or absolute path.
 *
 * @param {string} nameOrPath
 * @param {{ profilesDir?: string }} [options]
 * @returns {boolean}
 */
export function deleteProfile(nameOrPath, options = {}) {
  const dir = options.profilesDir || PROFILES_DIR;
  let filePath;

  if (existsSync(nameOrPath)) {
    filePath = nameOrPath;
  } else {
    filePath = join(dir, toFileName(nameOrPath));
  }

  if (!existsSync(filePath)) {
    throw new Error(`Profile not found: "${nameOrPath}" (looked in "${filePath}").`);
  }

  unlinkSync(filePath);
  return true;
}

export { PROFILES_DIR, PROFILE_VERSION };
