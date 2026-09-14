/**
 * Electron Preload Script
 *
 * Exposes a safe `window.api` bridge via contextBridge.
 * The renderer can call backend functions through this API
 * without having direct access to Node.js or Electron internals.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // ── Paths ──
  paths: {
    resolve: (options) => ipcRenderer.invoke('paths:resolve', options),
    resolveInstall: (options) => ipcRenderer.invoke('paths:resolveInstall', options),
    getFileInfo: (filePath) => ipcRenderer.invoke('paths:getFileInfo', filePath),
    readRaw: (filePath) => ipcRenderer.invoke('paths:readRaw', filePath),
    writeRaw: (filePath, content) => ipcRenderer.invoke('paths:writeRaw', filePath, content),
  },

  // ── LoL ──
  lol: {
    readGameCfg: (options) => ipcRenderer.invoke('lol:readGameCfg', options),
    updateSettings: (params, options) => ipcRenderer.invoke('lol:updateSettings', params, options),
    readKeybindings: (options) => ipcRenderer.invoke('lol:readKeybindings', options),
    updateKeybindings: (params, options) => ipcRenderer.invoke('lol:updateKeybindings', params, options),
    setResolution: (w, h, options) => ipcRenderer.invoke('lol:setResolution', w, h, options),
    setWindowMode: (mode, options) => ipcRenderer.invoke('lol:setWindowMode', mode, options),
  },

  // ── TFT ──
  tft: {
    readGameCfg: (options) => ipcRenderer.invoke('tft:readGameCfg', options),
    updateSettings: (params, options) => ipcRenderer.invoke('tft:updateSettings', params, options),
    updateKeybindings: (params, options) => ipcRenderer.invoke('tft:updateKeybindings', params, options),
    setFrameRateCap: (fps, options) => ipcRenderer.invoke('tft:setFrameRateCap', fps, options),
    setMinimapScale: (scale, options) => ipcRenderer.invoke('tft:setMinimapScale', scale, options),
    muteAudio: (options) => ipcRenderer.invoke('tft:muteAudio', options),
  },

  // ── Client ──
  client: {
    read: (options) => ipcRenderer.invoke('client:read', options),
    update: (params, options) => ipcRenderer.invoke('client:update', params, options),
    setLocale: (locale, options) => ipcRenderer.invoke('client:setLocale', locale, options),
    setRegion: (region, options) => ipcRenderer.invoke('client:setRegion', region, options),
    getCurrentSummonerName: (options) => ipcRenderer.invoke('client:getCurrentSummonerName', options),
    getCurrentSummonerProfile: (options) => ipcRenderer.invoke('client:getCurrentSummonerProfile', options),
  },

  // ── Profiles ──
  profiles: {
    export: (name, options) => ipcRenderer.invoke('profiles:export', name, options),
    save: (profile, options) => ipcRenderer.invoke('profiles:save', profile, options),
    load: (nameOrPath, options) => ipcRenderer.invoke('profiles:load', nameOrPath, options),
    list: (options) => ipcRenderer.invoke('profiles:list', options),
    applyAll: (profileObj, options) => ipcRenderer.invoke('profiles:applyAll', profileObj, options),
    quickSave: (name, options) => ipcRenderer.invoke('profiles:quickSave', name, options),
    delete: (name, options) => ipcRenderer.invoke('profiles:delete', name, options),
    onAutoSave: (callback) => ipcRenderer.on('profile:auto-saved', callback),
  },

  // ── Status ──
  status: {
    isClientRunning: () => ipcRenderer.invoke('status:isClientRunning'),
    isGameRunning: () => ipcRenderer.invoke('status:isGameRunning'),
    getRunningProcesses: () => ipcRenderer.invoke('status:getRunningProcesses'),
    assertClosed: (options) => ipcRenderer.invoke('status:assertClosed', options),
  },

  // ── File Lock ──
  lock: {
    isReadOnly: (filePath) => ipcRenderer.invoke('lock:isReadOnly', filePath),
    setReadOnly: (filePath) => ipcRenderer.invoke('lock:setReadOnly', filePath),
    removeReadOnly: (filePath) => ipcRenderer.invoke('lock:removeReadOnly', filePath),
  },

  // ── Window Controls ──
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },
});
