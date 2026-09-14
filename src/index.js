/**
 * Riot Settings Orchestrator — Public API
 *
 * This is the single entry point for consumers of the orchestrator.
 * All modules are re-exported from here for convenience.
 *
 * Usage:
 * ```js
 * import {
 *   resolveConfigPaths,
 *   updateLoLSettings,
 *   updateTFTSettings,
 *   updateClientSettings,
 *   applyAllProfiles,
 *   isRiotClientRunning,
 * } from 'riot-settings-orchestrator';
 * ```
 */

// ─── Config / Path Resolution ──────────────────────────────────────────────
export {
  resolveInstallPath,
  resolveConfigPaths,
  TARGET_FILES,
} from './config/paths.js';

// ─── Parsers (low-level — exposed for advanced usage) ──────────────────────
export {
  readGameCfg,
  mergeGameCfg,
  writeGameCfg,
  patchGameCfg,
} from './parsers/ini-parser.js';

export {
  readPersistedSettings,
  mergePersistedSettings,
  mergeFileSection,
  writePersistedSettings,
  patchPersistedSettings,
} from './parsers/json-parser.js';

export {
  readClientYaml,
  mergeClientYaml,
  writeClientYaml,
  patchClientYaml,
} from './parsers/yaml-parser.js';

// ─── Domain Modules (high-level API) ──────────────────────────────────────
export {
  readClientSettings,
  updateClientSettings,
  setLocale,
  setRegion,
  getCurrentSummonerName,
  getCurrentSummonerProfile,
} from './modules/client-settings.js';

export {
  readLoLGameCfg,
  updateLoLSettings,
  readLoLKeybindings,
  updateLoLKeybindings,
  updateLoLPersistedSection,
  setResolution,
  setWindowMode,
} from './modules/lol-settings.js';

export {
  readTFTGameCfg,
  updateTFTSettings,
  updateTFTKeybindings,
  setTFTFrameRateCap,
  setTFTMinimapScale,
  muteTFTAudio,
} from './modules/tft-settings.js';

// ─── Profile Management ───────────────────────────────────────────────────
export {
  exportProfile,
  saveProfile,
  loadProfile,
  listProfiles,
  applyAllProfiles,
  quickSaveProfile,
  deleteProfile,
} from './modules/profile-manager.js';

// ─── Utilities ────────────────────────────────────────────────────────────
export {
  getRunningRiotProcesses,
  isRiotClientRunning,
  isGameRunning,
  assertClientClosed,
} from './utils/process-checker.js';

export {
  setReadOnly,
  removeReadOnly,
  isReadOnly,
  withUnlockedFile,
} from './utils/file-lock.js';
