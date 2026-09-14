/**
 * Electron Main Process
 *
 * Creates the BrowserWindow, registers IPC handlers that bridge
 * the backend engine to the renderer, and manages the app lifecycle.
 */

import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';

// ─── Backend imports ───────────────────────────────────────────────────────
import {
  resolveConfigPaths,
  resolveInstallPath,
  readLoLGameCfg,
  updateLoLSettings,
  readLoLKeybindings,
  updateLoLKeybindings,
  setResolution,
  setWindowMode,
  readTFTGameCfg,
  updateTFTSettings,
  updateTFTKeybindings,
  setTFTFrameRateCap,
  setTFTMinimapScale,
  muteTFTAudio,
  readClientSettings,
  updateClientSettings,
  setLocale,
  setRegion,
  getCurrentSummonerName,
  getCurrentSummonerProfile,
  exportProfile,
  saveProfile,
  loadProfile,
  listProfiles,
  applyAllProfiles,
  quickSaveProfile,
  deleteProfile,
  getRunningRiotProcesses,
  isRiotClientRunning,
  isGameRunning,
  assertClientClosed,
  setReadOnly,
  removeReadOnly,
  isReadOnly,
} from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    frame: false,           // Custom title bar
    transparent: false,
    backgroundColor: '#0a0e1a',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,       // Needed for preload to use Node APIs
    },
    icon: join(__dirname, '..', 'renderer', 'assets', 'icon.png'),
    show: false,
  });

  mainWindow.loadFile(join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── App lifecycle ─────────────────────────────────────────────────────────
const LAST_SUMMONER_FILE = join(homedir(), '.riot-orchestrator', 'last_summoner.txt');

function startSummonerWatcher() {
  setInterval(() => {
    try {
      const currentName = getCurrentSummonerName();
      if (!currentName) return;

      let lastSavedName = '';
      if (existsSync(LAST_SUMMONER_FILE)) {
        lastSavedName = readFileSync(LAST_SUMMONER_FILE, 'utf-8').trim();
      }

      if (currentName !== lastSavedName) {
        console.log(`[Summoner Watcher] Account switch: "${lastSavedName}" -> "${currentName}"`);
        
        // Update stored name
        writeFileSync(LAST_SUMMONER_FILE, currentName, 'utf-8');

        // Auto save profile
        const { filePath } = quickSaveProfile(currentName);
        console.log(`[Summoner Watcher] Auto-saved profile for "${currentName}" at ${filePath}`);

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('profile:auto-saved', currentName);
        }
      }
    } catch (err) {
      console.error('[Summoner Watcher] Error:', err);
    }
  }, 10000); // Check every 10 seconds
}

app.whenReady().then(() => {
  createWindow();
  registerIpcHandlers();
  startSummonerWatcher();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ─── Window control IPC ────────────────────────────────────────────────────

ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window:close', () => mainWindow?.close());

// ─── Backend IPC Handlers ──────────────────────────────────────────────────

function registerIpcHandlers() {
  // ── Paths ──
  ipcMain.handle('paths:resolve', (_e, options) => {
    return resolveConfigPaths(options);
  });

  ipcMain.handle('paths:resolveInstall', (_e, options) => {
    return resolveInstallPath(options);
  });

  ipcMain.handle('paths:getFileInfo', (_e, filePath) => {
    if (!existsSync(filePath)) return null;
    const stat = statSync(filePath);
    return {
      exists: true,
      size: stat.size,
      modified: stat.mtime.toISOString(),
    };
  });

  ipcMain.handle('paths:readRaw', (_e, filePath) => {
    if (!existsSync(filePath)) return '';
    return readFileSync(filePath, 'utf-8');
  });

  ipcMain.handle('paths:writeRaw', (_e, filePath, content) => {
    writeFileSync(filePath, content, 'utf-8');
    return true;
  });

  // ── LoL ──
  ipcMain.handle('lol:readGameCfg', (_e, options) => {
    return readLoLGameCfg(options);
  });

  ipcMain.handle('lol:updateSettings', (_e, params, options) => {
    return updateLoLSettings(params, options);
  });

  ipcMain.handle('lol:readKeybindings', (_e, options) => {
    return readLoLKeybindings(options);
  });

  ipcMain.handle('lol:updateKeybindings', async (_e, params, options) => {
    return await updateLoLKeybindings(params, options);
  });

  ipcMain.handle('lol:setResolution', (_e, w, h, options) => {
    return setResolution(w, h, options);
  });

  ipcMain.handle('lol:setWindowMode', (_e, mode, options) => {
    return setWindowMode(mode, options);
  });

  // ── TFT ──
  ipcMain.handle('tft:readGameCfg', (_e, options) => {
    return readTFTGameCfg(options);
  });

  ipcMain.handle('tft:updateSettings', (_e, params, options) => {
    return updateTFTSettings(params, options);
  });

  ipcMain.handle('tft:updateKeybindings', async (_e, params, options) => {
    return await updateTFTKeybindings(params, options);
  });

  ipcMain.handle('tft:setFrameRateCap', (_e, fps, options) => {
    return setTFTFrameRateCap(fps, options);
  });

  ipcMain.handle('tft:setMinimapScale', (_e, scale, options) => {
    return setTFTMinimapScale(scale, options);
  });

  ipcMain.handle('tft:muteAudio', (_e, options) => {
    return muteTFTAudio(options);
  });

  // ── Client ──
  ipcMain.handle('client:read', (_e, options) => {
    return readClientSettings(options);
  });

  ipcMain.handle('client:update', (_e, params, options) => {
    return updateClientSettings(params, options);
  });

  ipcMain.handle('client:setLocale', (_e, locale, options) => {
    return setLocale(locale, options);
  });

  ipcMain.handle('client:setRegion', (_e, region, options) => {
    return setRegion(region, options);
  });

  ipcMain.handle('client:getCurrentSummonerName', (_e, options) => {
    return getCurrentSummonerName(options);
  });

  ipcMain.handle('client:getCurrentSummonerProfile', (_e, options) => {
    return getCurrentSummonerProfile(options);
  });

  // ── Profiles ──
  ipcMain.handle('profiles:export', (_e, name, options) => {
    return exportProfile(name, options);
  });

  ipcMain.handle('profiles:save', (_e, profile, options) => {
    return saveProfile(profile, options);
  });

  ipcMain.handle('profiles:load', (_e, nameOrPath, options) => {
    return loadProfile(nameOrPath, options);
  });

  ipcMain.handle('profiles:list', (_e, options) => {
    return listProfiles(options);
  });

  ipcMain.handle('profiles:applyAll', async (_e, profileObj, options) => {
    return await applyAllProfiles(profileObj, options);
  });

  ipcMain.handle('profiles:quickSave', (_e, name, options) => {
    return quickSaveProfile(name, options);
  });

  ipcMain.handle('profiles:delete', (_e, name, options) => {
    return deleteProfile(name, options);
  });

  // ── Status ──
  ipcMain.handle('status:isClientRunning', () => {
    return isRiotClientRunning();
  });

  ipcMain.handle('status:isGameRunning', () => {
    return isGameRunning();
  });

  ipcMain.handle('status:getRunningProcesses', () => {
    return getRunningRiotProcesses();
  });

  ipcMain.handle('status:assertClosed', (_e, options) => {
    assertClientClosed(options);
    return true;
  });

  // ── File Lock ──
  ipcMain.handle('lock:isReadOnly', (_e, filePath) => {
    return isReadOnly(filePath);
  });

  ipcMain.handle('lock:setReadOnly', (_e, filePath) => {
    setReadOnly(filePath);
    return true;
  });

  ipcMain.handle('lock:removeReadOnly', (_e, filePath) => {
    removeReadOnly(filePath);
    return true;
  });
}
