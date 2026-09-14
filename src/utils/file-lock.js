/**
 * File Lock — Read-Only Attribute Toggle
 *
 * Riot's cloud-sync mechanism can overwrite `PersistedSettings.json`
 * when the League Client launches.  To protect our applied settings,
 * we toggle the file's Read-Only attribute after writing.
 *
 * Strategy:
 *   1. Remove Read-Only attribute  →  write new settings  →  set Read-Only.
 *   2. When the user wants to revert, remove Read-Only so Riot can sync.
 *
 * On Windows we use `attrib +R` / `attrib -R`.
 * On POSIX we use `chmod 444` / `chmod 644` as a rough equivalent.
 */

import { execSync } from 'node:child_process';
import { chmodSync, statSync, existsSync, constants, accessSync } from 'node:fs';
import { platform } from 'node:os';

/**
 * Set the Read-Only attribute on a file.
 *
 * @param {string} filePath  Absolute path.
 * @throws {Error} If the operation fails.
 */
export function setReadOnly(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Cannot lock non-existent file: "${filePath}".`);
  }

  if (platform() === 'win32') {
    execSync(`attrib +R "${filePath}"`, { windowsHide: true, timeout: 3000 });
  } else {
    chmodSync(filePath, 0o444);
  }
}

/**
 * Remove the Read-Only attribute from a file.
 *
 * @param {string} filePath  Absolute path.
 * @throws {Error} If the operation fails.
 */
export function removeReadOnly(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Cannot unlock non-existent file: "${filePath}".`);
  }

  if (platform() === 'win32') {
    execSync(`attrib -R "${filePath}"`, { windowsHide: true, timeout: 3000 });
  } else {
    chmodSync(filePath, 0o644);
  }
}

/**
 * Check whether a file currently has the Read-Only attribute.
 *
 * @param {string} filePath
 * @returns {boolean}
 */
export function isReadOnly(filePath) {
  if (!existsSync(filePath)) return false;

  if (platform() === 'win32') {
    try {
      const output = execSync(`attrib "${filePath}"`, {
        encoding: 'utf-8',
        windowsHide: true,
        timeout: 3000,
      });
      // attrib output: "     R   C:\path\to\file"
      // The R appears in columns 0–4 of the output line.
      return output.trimStart().startsWith('R') || output.includes(' R ');
    } catch {
      return false;
    }
  } else {
    try {
      accessSync(filePath, constants.W_OK);
      return false;
    } catch {
      return true;
    }
  }
}

/**
 * Ensure a file is writable, perform an operation, then re-lock it.
 *
 * @param {string} filePath
 * @param {() => void | Promise<void>} fn  The write operation to perform.
 * @param {{ relock?: boolean }} [options]  Whether to re-apply Read-Only after.
 */
export async function withUnlockedFile(filePath, fn, options = {}) {
  const { relock = true } = options;
  const wasLocked = isReadOnly(filePath);

  if (wasLocked) {
    removeReadOnly(filePath);
  }

  try {
    await fn();
  } finally {
    if (relock) {
      setReadOnly(filePath);
    } else if (wasLocked) {
      // Restore original state if we're not explicitly relocking
      setReadOnly(filePath);
    }
  }
}
