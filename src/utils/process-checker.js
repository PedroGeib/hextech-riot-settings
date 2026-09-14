/**
 * Riot Process Checker
 *
 * Determines whether the League Client or Riot Client is currently
 * running.  This is critical because:
 *   - PersistedSettings.json is cloud-synced and will be overwritten
 *     by the client on launch if it detects changes.
 *   - game.cfg can be locked by the running game process.
 *
 * We shell out to `tasklist` on Windows, which is universally available.
 */

import { execSync } from 'node:child_process';
import { platform } from 'node:os';

const RIOT_PROCESS_NAMES = [
  'LeagueClient.exe',
  'LeagueClientUx.exe',
  'League of Legends.exe',
  'RiotClientServices.exe',
  'RiotClientUx.exe',
  'RiotClientCrashHandler.exe',
];

/**
 * Returns the list of Riot-related processes currently running.
 *
 * @returns {string[]}  Names of detected Riot processes.
 */
export function getRunningRiotProcesses() {
  if (platform() !== 'win32') {
    // On non-Windows, we can't reliably detect Riot processes.
    // Return empty to indicate "unknown / not applicable".
    return [];
  }

  try {
    const output = execSync('tasklist /FO CSV /NH', {
      encoding: 'utf-8',
      windowsHide: true,
      timeout: 5000,
    });

    const running = new Set();

    for (const line of output.split('\n')) {
      // CSV format: "Image Name","PID","Session Name","Session#","Mem Usage"
      const match = line.match(/^"([^"]+)"/);
      if (match && RIOT_PROCESS_NAMES.includes(match[1])) {
        running.add(match[1]);
      }
    }

    return [...running];
  } catch {
    // tasklist can fail under unusual security policies.
    return [];
  }
}

/**
 * Returns `true` if any Riot process is currently running.
 * @returns {boolean}
 */
export function isRiotClientRunning() {
  return getRunningRiotProcesses().length > 0;
}

/**
 * Returns `true` if the actual in-game process is running.
 * @returns {boolean}
 */
export function isGameRunning() {
  return getRunningRiotProcesses().includes('League of Legends.exe');
}

/**
 * Asserts that no Riot processes are running, or throws.
 * Callers use this as a gate before writing PersistedSettings.json.
 *
 * @param {{ force?: boolean }} [options]  If `force` is true, skip the check.
 * @throws {Error} If Riot processes are detected and `force` is false.
 */
export function assertClientClosed(options = {}) {
  if (options.force) return;

  const procs = getRunningRiotProcesses();
  if (procs.length > 0) {
    throw new Error(
      `Cannot safely write PersistedSettings.json while Riot processes are running: ` +
      `${procs.join(', ')}. Close the client first, or pass { force: true } to override.`
    );
  }
}

export { RIOT_PROCESS_NAMES };
