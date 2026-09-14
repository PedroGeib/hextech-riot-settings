/**
 * Integration tests for the Riot Settings Orchestrator.
 *
 * These tests create a temporary mock Riot installation directory
 * and exercise the full read → merge → write pipeline for all three
 * config file formats.
 */

import { jest } from '@jest/globals';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ─── Test fixture: mock Riot installation ──────────────────────────────────

const TEST_ROOT = join(tmpdir(), `riot-orchestrator-test-${Date.now()}`);
const CONFIG_DIR = join(TEST_ROOT, 'Config');

const MOCK_GAME_CFG = `[General]
WindowMode=1
Width=1920
Height=1080
[Sound]
MasterVolume=50
MusicVolume=80
[HUD]
MinimapScale=1.0
FlipMiniMap=0
[Performance]
FrameCapType=0
`;

const MOCK_PERSISTED_SETTINGS = JSON.stringify({
  name: 'PersistedSettings',
  schemaVersion: 3,
  files: {
    'Input.ini': {
      GameEvents: {
        evtCastSpell1: '[q]',
        evtCastSpell2: '[w]',
        evtCastSpell3: '[e]',
        evtCastSpell4: '[r]',
      },
      Quickbinds: {
        evtCastSpell1smart: '[q]',
      },
    },
    'Game.cfg': {
      HUD: {
        ShowSummonerNames: '1',
      },
      General: {
        EnableScreenShake: '0',
      },
    },
  },
}, null, 2);

const MOCK_CLIENT_YAML = `install:
  globals:
    locale: "en_US"
    region: "NA"
  gameflow-process-info: ""
  patcher:
    channels:
      public: true
`;

// ─── Setup & Teardown ──────────────────────────────────────────────────────

beforeAll(() => {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(join(CONFIG_DIR, 'game.cfg'), MOCK_GAME_CFG, 'utf-8');
  writeFileSync(join(CONFIG_DIR, 'PersistedSettings.json'), MOCK_PERSISTED_SETTINGS, 'utf-8');
  writeFileSync(join(CONFIG_DIR, 'LeagueClientSettings.yaml'), MOCK_CLIENT_YAML, 'utf-8');
});

afterAll(() => {
  rmSync(TEST_ROOT, { recursive: true, force: true });
});

// ─── Path Resolution ──────────────────────────────────────────────────────

describe('Config Path Resolution', () => {
  let resolveConfigPaths, resolveInstallPath;

  beforeAll(async () => {
    ({ resolveConfigPaths, resolveInstallPath } = await import('../src/config/paths.js'));
  });

  test('resolves explicit installPath correctly', () => {
    const paths = resolveConfigPaths({ installPath: TEST_ROOT });
    expect(paths.configDir).toBe(CONFIG_DIR);
    expect(paths.gameCfg).toBe(join(CONFIG_DIR, 'game.cfg'));
    expect(paths.persistedSettings).toBe(join(CONFIG_DIR, 'PersistedSettings.json'));
    expect(paths.clientSettings).toBe(join(CONFIG_DIR, 'LeagueClientSettings.yaml'));
  });

  test('rejects invalid installPath', () => {
    expect(() => resolveInstallPath({ installPath: 'C:\\nonexistent' })).toThrow(
      /not a valid League of Legends installation/
    );
  });
});

// ─── INI Parser (game.cfg) ────────────────────────────────────────────────

describe('INI Parser — game.cfg', () => {
  let readGameCfg, mergeGameCfg, writeGameCfg, patchGameCfg;

  const cfgPath = () => join(CONFIG_DIR, 'game.cfg');

  beforeAll(async () => {
    ({ readGameCfg, mergeGameCfg, writeGameCfg, patchGameCfg } = await import('../src/parsers/ini-parser.js'));
  });

  beforeEach(() => {
    // Reset the file before each test
    writeFileSync(cfgPath(), MOCK_GAME_CFG, 'utf-8');
  });

  test('reads and parses game.cfg correctly', () => {
    const { data } = readGameCfg(cfgPath());
    expect(data.General.WindowMode).toBe('1');
    expect(data.General.Width).toBe('1920');
    expect(data.Sound.MasterVolume).toBe('50');
    expect(data.HUD.MinimapScale).toBe('1.0');
  });

  test('merges settings without overwriting unmentioned keys', () => {
    const { data } = readGameCfg(cfgPath());
    const merged = mergeGameCfg(data, {
      General: { WindowMode: '2' },
    });

    // Changed key
    expect(merged.General.WindowMode).toBe('2');
    // Untouched keys
    expect(merged.General.Width).toBe('1920');
    expect(merged.General.Height).toBe('1080');
    expect(merged.Sound.MasterVolume).toBe('50');
  });

  test('creates new sections during merge', () => {
    const { data } = readGameCfg(cfgPath());
    const merged = mergeGameCfg(data, {
      NewSection: { CustomKey: 'hello' },
    });
    expect(merged.NewSection.CustomKey).toBe('hello');
  });

  test('patchGameCfg round-trips correctly', () => {
    patchGameCfg(cfgPath(), {
      General: { Width: '2560', Height: '1440' },
      Sound: { MasterVolume: '100' },
    });

    const { data } = readGameCfg(cfgPath());
    expect(data.General.Width).toBe('2560');
    expect(data.General.Height).toBe('1440');
    expect(data.Sound.MasterVolume).toBe('100');
    // Untouched
    expect(data.General.WindowMode).toBe('1');
    expect(data.Sound.MusicVolume).toBe('80');
  });

  test('creates backup file on write', () => {
    patchGameCfg(cfgPath(), { Sound: { MasterVolume: '0' } });
    expect(existsSync(`${cfgPath()}.bak`)).toBe(true);
  });

  test('throws on non-existent file', () => {
    expect(() => readGameCfg('C:\\nonexistent\\game.cfg')).toThrow(/not found/);
  });
});

// ─── JSON Parser (PersistedSettings.json) ─────────────────────────────────

describe('JSON Parser — PersistedSettings.json', () => {
  let readPersistedSettings, mergePersistedSettings, mergeFileSection, patchPersistedSettings;

  const jsonPath = () => join(CONFIG_DIR, 'PersistedSettings.json');

  beforeAll(async () => {
    ({ readPersistedSettings, mergePersistedSettings, mergeFileSection, patchPersistedSettings } =
      await import('../src/parsers/json-parser.js'));
  });

  beforeEach(() => {
    writeFileSync(jsonPath(), MOCK_PERSISTED_SETTINGS, 'utf-8');
  });

  test('reads and parses PersistedSettings.json correctly', () => {
    const { data } = readPersistedSettings(jsonPath());
    expect(data.name).toBe('PersistedSettings');
    expect(data.schemaVersion).toBe(3);
    expect(data.files['Input.ini'].GameEvents.evtCastSpell1).toBe('[q]');
  });

  test('deep-merges without clobbering unmentioned keys', () => {
    const { data } = readPersistedSettings(jsonPath());
    const merged = mergePersistedSettings(data, {
      files: {
        'Input.ini': {
          GameEvents: {
            evtCastSpell1: '[a]',  // Change Q to A
          },
        },
      },
    });

    // Changed
    expect(merged.files['Input.ini'].GameEvents.evtCastSpell1).toBe('[a]');
    // Untouched
    expect(merged.files['Input.ini'].GameEvents.evtCastSpell2).toBe('[w]');
    expect(merged.files['Input.ini'].Quickbinds.evtCastSpell1smart).toBe('[q]');
    expect(merged.files['Game.cfg'].HUD.ShowSummonerNames).toBe('1');
  });

  test('does not mutate original data', () => {
    const { data } = readPersistedSettings(jsonPath());
    const original = data.files['Input.ini'].GameEvents.evtCastSpell1;
    mergePersistedSettings(data, {
      files: { 'Input.ini': { GameEvents: { evtCastSpell1: '[z]' } } },
    });
    expect(data.files['Input.ini'].GameEvents.evtCastSpell1).toBe(original);
  });

  test('mergeFileSection targets a specific sub-file', () => {
    const { data } = readPersistedSettings(jsonPath());
    const merged = mergeFileSection(data, 'Input.ini', {
      GameEvents: { evtCastSpell3: '[d]' },
    });

    expect(merged.files['Input.ini'].GameEvents.evtCastSpell3).toBe('[d]');
    expect(merged.files['Input.ini'].GameEvents.evtCastSpell1).toBe('[q]');
  });

  test('patchPersistedSettings round-trips correctly', () => {
    patchPersistedSettings(jsonPath(), {
      files: {
        'Input.ini': {
          GameEvents: { evtCastSpell4: '[f]' },
        },
      },
    });

    const { data } = readPersistedSettings(jsonPath());
    expect(data.files['Input.ini'].GameEvents.evtCastSpell4).toBe('[f]');
    expect(data.files['Input.ini'].GameEvents.evtCastSpell1).toBe('[q]');
  });

  test('replaces arrays atomically', () => {
    const original = {
      items: [1, 2, 3],
      nested: { arr: ['a', 'b'] },
    };
    const merged = mergePersistedSettings(original, {
      items: [10, 20],
    });
    expect(merged.items).toEqual([10, 20]);
  });
});

// ─── YAML Parser (LeagueClientSettings.yaml) ─────────────────────────────

describe('YAML Parser — LeagueClientSettings.yaml', () => {
  let readClientYaml, mergeClientYaml, patchClientYaml;

  const yamlPath = () => join(CONFIG_DIR, 'LeagueClientSettings.yaml');

  beforeAll(async () => {
    ({ readClientYaml, mergeClientYaml, patchClientYaml } =
      await import('../src/parsers/yaml-parser.js'));
  });

  beforeEach(() => {
    writeFileSync(yamlPath(), MOCK_CLIENT_YAML, 'utf-8');
  });

  test('reads and parses YAML correctly', () => {
    const { data, format } = readClientYaml(yamlPath());
    expect(format).toBe('yaml');
    expect(data.install.globals.locale).toBe('en_US');
    expect(data.install.globals.region).toBe('NA');
  });

  test('auto-detects JSON format when content is JSON', () => {
    const jsonContent = JSON.stringify({
      install: { globals: { locale: 'ko_KR' } },
    });
    writeFileSync(yamlPath(), jsonContent, 'utf-8');

    const { data, format } = readClientYaml(yamlPath());
    expect(format).toBe('json');
    expect(data.install.globals.locale).toBe('ko_KR');
  });

  test('merges without clobbering unmentioned keys', () => {
    const { data } = readClientYaml(yamlPath());
    const merged = mergeClientYaml(data, {
      install: { globals: { locale: 'pt_BR' } },
    });

    expect(merged.install.globals.locale).toBe('pt_BR');
    expect(merged.install.globals.region).toBe('NA');  // Untouched
    expect(merged.install.patcher.channels.public).toBe(true);  // Untouched
  });

  test('patchClientYaml round-trips correctly', () => {
    patchClientYaml(yamlPath(), {
      install: { globals: { region: 'EUW' } },
    });

    const { data } = readClientYaml(yamlPath());
    expect(data.install.globals.region).toBe('EUW');
    expect(data.install.globals.locale).toBe('en_US');  // Untouched
  });
});

// ─── File Lock Utility ────────────────────────────────────────────────────

describe('File Lock Utility', () => {
  let setReadOnly, removeReadOnly, isReadOnly, withUnlockedFile;

  const lockTestFile = join(CONFIG_DIR, '_lock_test.txt');

  beforeAll(async () => {
    ({ setReadOnly, removeReadOnly, isReadOnly, withUnlockedFile } =
      await import('../src/utils/file-lock.js'));
    writeFileSync(lockTestFile, 'test content', 'utf-8');
  });

  afterAll(() => {
    try { removeReadOnly(lockTestFile); } catch { /* ignore */ }
  });

  test('setReadOnly makes a file read-only', () => {
    setReadOnly(lockTestFile);
    expect(isReadOnly(lockTestFile)).toBe(true);
  });

  test('removeReadOnly restores write access', () => {
    setReadOnly(lockTestFile);
    removeReadOnly(lockTestFile);
    expect(isReadOnly(lockTestFile)).toBe(false);
  });

  test('withUnlockedFile unlocks, runs fn, then re-locks', async () => {
    setReadOnly(lockTestFile);

    await withUnlockedFile(lockTestFile, () => {
      // Should be writable inside callback
      writeFileSync(lockTestFile, 'modified', 'utf-8');
    });

    // Should be locked again
    expect(isReadOnly(lockTestFile)).toBe(true);
    expect(readFileSync(lockTestFile, 'utf-8')).toBe('modified');
  });

  test('throws on non-existent file', () => {
    expect(() => setReadOnly('C:\\nonexistent\\file.txt')).toThrow(/non-existent/);
  });
});

// ─── Domain Modules ───────────────────────────────────────────────────────

describe('LoL Settings Module', () => {
  let updateLoLSettings, readLoLGameCfg;

  beforeAll(async () => {
    ({ updateLoLSettings, readLoLGameCfg } = await import('../src/modules/lol-settings.js'));
  });

  beforeEach(() => {
    writeFileSync(join(CONFIG_DIR, 'game.cfg'), MOCK_GAME_CFG, 'utf-8');
  });

  test('updateLoLSettings merges INI sections correctly', () => {
    const { merged } = updateLoLSettings(
      { General: { WindowMode: '2', Width: '2560' } },
      { installPath: TEST_ROOT },
    );

    expect(merged.General.WindowMode).toBe('2');
    expect(merged.General.Width).toBe('2560');
    expect(merged.General.Height).toBe('1080'); // Untouched
  });

  test('readLoLGameCfg returns parsed data', () => {
    const { data } = readLoLGameCfg({ installPath: TEST_ROOT });
    expect(data.General).toBeDefined();
    expect(data.Sound).toBeDefined();
  });
});

describe('TFT Settings Module', () => {
  let updateTFTSettings, readTFTGameCfg, setTFTFrameRateCap;

  beforeAll(async () => {
    ({ updateTFTSettings, readTFTGameCfg, setTFTFrameRateCap } =
      await import('../src/modules/tft-settings.js'));
  });

  beforeEach(() => {
    writeFileSync(join(CONFIG_DIR, 'game.cfg'), MOCK_GAME_CFG, 'utf-8');
  });

  test('updateTFTSettings writes to game.cfg correctly', () => {
    const { merged } = updateTFTSettings(
      { Performance: { FrameCapType: '1', MaxFPS: '144' } },
      { installPath: TEST_ROOT },
    );

    expect(merged.Performance.FrameCapType).toBe('1');
    expect(merged.Performance.MaxFPS).toBe('144');
  });

  test('readTFTGameCfg extracts TFT-relevant sections', () => {
    const { data } = readTFTGameCfg({ installPath: TEST_ROOT });
    expect(data.General).toBeDefined();
    expect(data.HUD).toBeDefined();
    expect(data.Performance).toBeDefined();
    expect(data.Sound).toBeDefined();
  });

  test('setTFTFrameRateCap preset helper works', () => {
    const { merged } = setTFTFrameRateCap(240, { installPath: TEST_ROOT });
    expect(merged.Performance.FrameCapType).toBe('1');
    expect(merged.Performance.MaxFPS).toBe('240');
  });
});

describe('Client Settings Module', () => {
  let updateClientSettings, readClientSettings, setLocale;

  beforeAll(async () => {
    ({ updateClientSettings, readClientSettings, setLocale } =
      await import('../src/modules/client-settings.js'));
  });

  beforeEach(() => {
    writeFileSync(join(CONFIG_DIR, 'LeagueClientSettings.yaml'), MOCK_CLIENT_YAML, 'utf-8');
  });

  test('updateClientSettings merges YAML correctly', () => {
    const { merged } = updateClientSettings(
      { install: { globals: { locale: 'ko_KR' } } },
      { installPath: TEST_ROOT },
    );

    expect(merged.install.globals.locale).toBe('ko_KR');
    expect(merged.install.globals.region).toBe('NA'); // Untouched
  });

  test('readClientSettings returns parsed data and format', () => {
    const { data, format } = readClientSettings({ installPath: TEST_ROOT });
    expect(data.install.globals.locale).toBe('en_US');
    expect(format).toBe('yaml');
  });

  test('setLocale preset helper works', () => {
    const { merged } = setLocale('ja_JP', { installPath: TEST_ROOT });
    expect(merged.install.globals.locale).toBe('ja_JP');
  });
});

// ─── Profile Manager ──────────────────────────────────────────────────────

describe('Profile Manager', () => {
  let exportProfile, saveProfile, loadProfile, listProfiles;

  const profilesDir = join(TEST_ROOT, '.profiles');

  beforeAll(async () => {
    ({ exportProfile, saveProfile, loadProfile, listProfiles } =
      await import('../src/modules/profile-manager.js'));
  });

  test('exportProfile captures all three config targets', () => {
    const profile = exportProfile('Test Profile', { installPath: TEST_ROOT });

    expect(profile.name).toBe('Test Profile');
    expect(profile.version).toBe(1);
    expect(profile.createdAt).toBeDefined();
    expect(profile.targets.gameCfg).toBeDefined();
    expect(profile.targets.persistedSettings).toBeDefined();
    expect(profile.targets.clientSettings).toBeDefined();
  });

  test('exportProfile respects include filter', () => {
    const profile = exportProfile('Partial', {
      installPath: TEST_ROOT,
      include: ['gameCfg'],
    });

    expect(profile.targets.gameCfg).toBeDefined();
    expect(profile.targets.persistedSettings).toBeUndefined();
    expect(profile.targets.clientSettings).toBeUndefined();
  });

  test('save + load round-trips a profile', () => {
    const profile = exportProfile('Round Trip', { installPath: TEST_ROOT });
    const filePath = saveProfile(profile, { profilesDir });

    expect(existsSync(filePath)).toBe(true);

    const loaded = loadProfile('Round Trip', { profilesDir });
    expect(loaded.name).toBe('Round Trip');
    expect(loaded.targets.gameCfg).toEqual(profile.targets.gameCfg);
  });

  test('listProfiles enumerates saved profiles', () => {
    const profile = exportProfile('Listed', { installPath: TEST_ROOT });
    saveProfile(profile, { profilesDir });

    const list = listProfiles({ profilesDir });
    const names = list.map(p => p.name);
    expect(names).toContain('Listed');
  });

  test('loadProfile throws for missing profile', () => {
    expect(() => loadProfile('nonexistent-profile', { profilesDir })).toThrow(/not found/);
  });
});

// ─── Process Checker ──────────────────────────────────────────────────────

describe('Process Checker', () => {
  let getRunningRiotProcesses, isRiotClientRunning, assertClientClosed;

  beforeAll(async () => {
    ({ getRunningRiotProcesses, isRiotClientRunning, assertClientClosed } =
      await import('../src/utils/process-checker.js'));
  });

  test('getRunningRiotProcesses returns an array', () => {
    const result = getRunningRiotProcesses();
    expect(Array.isArray(result)).toBe(true);
  });

  test('isRiotClientRunning returns a boolean', () => {
    expect(typeof isRiotClientRunning()).toBe('boolean');
  });

  test('assertClientClosed does not throw when force=true', () => {
    expect(() => assertClientClosed({ force: true })).not.toThrow();
  });
});
