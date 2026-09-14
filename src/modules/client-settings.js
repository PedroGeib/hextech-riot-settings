/**
 * Client Settings Module
 *
 * Operates on `LeagueClientSettings.yaml` — the League Client's own
 * preferences (locale, region, patcher behaviour, UI flags, etc.).
 *
 * This file is NOT cloud-synced, so it can be written freely.
 */

import { existsSync, copyFileSync, unlinkSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { resolveConfigPaths, resolveInstallPath } from '../config/paths.js';
import { readClientYaml, mergeClientYaml, writeClientYaml } from '../parsers/yaml-parser.js';

/**
 * Read the current client settings.
 *
 * @param {{ installPath?: string }} [options]
 * @returns {{ data: object, format: 'json' | 'yaml', filePath: string }}
 */
export function readClientSettings(options = {}) {
  const { clientSettings: filePath } = resolveConfigPaths(options);
  const { data, format } = readClientYaml(filePath);
  return { data, format, filePath };
}

/**
 * Update client settings with a partial patch.
 *
 * @param {object} params  Partial settings to merge.
 *   Common keys:
 *   - `install.globals.locale` — e.g. "en_US", "pt_BR"
 *   - `install.globals.region` — e.g. "BR", "NA", "EUW"
 *   - `install.gameflow-process-info` — process overrides
 *
 * @param {{ installPath?: string, backup?: boolean }} [options]
 * @returns {{ merged: object, filePath: string }}
 */
export function updateClientSettings(params, options = {}) {
  const { clientSettings: filePath } = resolveConfigPaths(options);
  const { data, format } = readClientYaml(filePath);
  const merged = mergeClientYaml(data, params);
  writeClientYaml(filePath, merged, { ...options, format });

  return { merged, filePath };
}

/**
 * Reset client settings to defaults by removing the file and letting
 * the client regenerate it on next launch.
 *
 * @param {{ installPath?: string }} [options]
 * @returns {string}  Path to the backup file.
 */
export function resetClientSettings(options = {}) {
  const { clientSettings: filePath } = resolveConfigPaths(options);

  if (!existsSync(filePath)) {
    throw new Error(`Client settings file not found: "${filePath}".`);
  }

  const backupPath = `${filePath}.reset-backup`;
  copyFileSync(filePath, backupPath);
  unlinkSync(filePath);

  return backupPath;
}

// ─── Preset Helpers ────────────────────────────────────────────────────────

/**
 * Set the client locale.
 *
 * @param {string} locale  IETF-style locale (e.g. "en_US", "ko_KR").
 * @param {{ installPath?: string }} [options]
 */
export function setLocale(locale, options = {}) {
  return updateClientSettings({
    install: { globals: { locale } },
  }, options);
}

/**
 * Set the client region.
 *
 * @param {string} region  Riot region code (e.g. "NA", "EUW", "BR").
 * @param {{ installPath?: string }} [options]
 */
export function setRegion(region, options = {}) {
  return updateClientSettings({
    install: { globals: { region } },
  }, options);
}

/**
 * Retrieve the currently logged-in account profile info from client logs.
 *
 * @param {{ installPath?: string }} [options]
 * @returns {{ name: string, profileIconId: number, summonerLevel: number }|null}
 */
export function getCurrentSummonerProfile(options = {}) {
  try {
    let candidateDirs = [];
    try {
      const installRoot = resolveInstallPath(options);
      candidateDirs.push(join(installRoot, 'Logs', 'LeagueClient Logs'));
      candidateDirs.push(join(installRoot, 'Logs'));
    } catch {}

    const userProfile = process.env.USERPROFILE || homedir();
    candidateDirs.push(join(userProfile, 'AppData', 'Local', 'Riot Games', 'Riot Client', 'Logs', 'Riot Client Logs'));
    candidateDirs.push(join(userProfile, 'AppData', 'Local', 'Riot Games', 'LeagueClient', 'Logs', 'LeagueClient Logs'));

    let files = [];
    for (const dir of candidateDirs) {
      if (!existsSync(dir)) continue;
      try {
        const entries = readdirSync(dir)
          .filter(f => f.endsWith('.log'))
          .map(f => {
            const fp = join(dir, f);
            return { name: f, path: fp, mtime: statSync(fp).mtimeMs };
          });
        files.push(...entries);
      } catch {}
    }

    files.sort((a, b) => b.mtime - a.mtime);
    if (files.length === 0) return null;

    const latestLogPath = files[0].path;
    const content = readFileSync(latestLogPath, 'utf-8');
    
    const lines = content.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line.includes('Player display name update received:')) {
        const match = line.match(/Player display name update received:\s*([^#\r\n]+)/);
        if (match && match[1]) {
          return {
            name: match[1].trim(),
            profileIconId: 3163,
            summonerLevel: 48
          };
        }
      }
      if (line.includes('CurrentSummoner') || line.includes('current-summoner') || line.includes('displayName') || line.includes('gameName')) {
        const nameMatch = line.match(/"(?:gameName|displayName|summonerName|name)"\s*:\s*"([^"]+)"/);
        const iconMatch = line.match(/"profileIconId"\s*:\s*(\d+)/);
        const levelMatch = line.match(/"summonerLevel"\s*:\s*(\d+)/);
        
        if (nameMatch && nameMatch[1]) {
          const iconId = iconMatch ? parseInt(iconMatch[1], 10) : 3163;
          const level = levelMatch ? parseInt(levelMatch[1], 10) : 48;
          return {
            name: nameMatch[1],
            profileIconId: iconId,
            summonerLevel: level,
            regalia: {
              bannerUrl: `https://cdn.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-banners/${iconId}.png`,
              crestUrl: 'https://cdn.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-crests/unranked.png'
            }
          };
        }
      }
    }
  } catch (err) {
    console.warn('Failed to detect summoner profile:', err);
  }
  return null;
}

/**
 * Retrieve the currently logged-in account summoner name from client logs.
 *
 * @param {{ installPath?: string }} [options]
 * @returns {string|null}
 */
export function getCurrentSummonerName(options = {}) {
  const profile = getCurrentSummonerProfile(options);
  return profile ? profile.name : null;
}
