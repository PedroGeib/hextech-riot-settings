import { test } from 'node:test';
import assert from 'node:assert/strict';

import { detectEol, detectIndent, withEol } from '../renderer/lib/format.js';
import { escapeHtml } from '../renderer/lib/html.js';
import { mergeIni, parseIni, stringifyIni } from '../renderer/lib/ini.js';
import { deepMerge } from '../renderer/lib/merge.js';
import {
  UNBOUND,
  findBinding,
  findSetting,
  mergePersisted,
  rebindKey,
  setSetting,
} from '../renderer/lib/persisted.js';
import { profileFileName } from '../renderer/lib/profile-name.js';
import { bannerImageUrl, bannerSkinPath, crestBorder, gameDataAssetUrl, levelTheme, profileIconUrl } from '../renderer/lib/regalia.js';
import {
  applyValue,
  booleanValue,
  decodeKey,
  flattenConfigs,
  iniKey,
  persistedKey,
  syncPersistedWithIni,
  valueKind,
  valuesEqual,
} from '../renderer/lib/settings-model.js';

const persistedFixture = () => ({
  description: 'The settings in this file are persisted server-side.',
  files: [
    {
      name: 'Game.cfg',
      sections: [{ name: 'HUD', settings: [{ name: 'MinimapScale', value: '1.0000' }] }],
    },
    {
      name: 'Input.ini',
      sections: [
        {
          name: 'GameEvents',
          settings: [
            { name: 'evtCastSpell1', value: '[q]' },
            { name: 'evtCastSpell2', value: '[w]' },
            { name: 'evtUseVisionItem', value: '[4],[Button 4]' },
          ],
        },
      ],
    },
  ],
});

// ─── ini ────────────────────────────────────────────────────────────────────

test('game.cfg round-trips byte for byte, keeping CRLF and order', () => {
  const text = '[General]\r\nWindowMode=2\r\nWidth=1920\r\n\r\n[Volume]\r\nMasterVolume=0.5000\r\n';
  assert.equal(stringifyIni(parseIni(text), detectEol(text)), text);
});

test('parseIni keeps "=" inside values and skips comments', () => {
  const data = parseIni('; comment\n[Chat]\nFilter=a=b\n');
  assert.deepEqual(data, { Chat: { Filter: 'a=b' } });
});

test('mergeIni stringifies values, creates sections and does not mutate input', () => {
  const current = { General: { Width: '1280' } };
  const merged = mergeIni(current, { General: { Width: 1920 }, HUD: { FlipMiniMap: 1 } });
  assert.deepEqual(merged, { General: { Width: '1920' }, HUD: { FlipMiniMap: '1' } });
  assert.equal(current.General.Width, '1280');
});

// ─── PersistedSettings ──────────────────────────────────────────────────────

test('mergePersisted updates and adds settings without dropping untouched ones', () => {
  const patch = {
    files: [
      {
        name: 'input.ini',
        sections: [{ name: 'GameEvents', settings: [{ name: 'evtCastSpell1', value: '[z]' }] }],
      },
      { name: 'Game.cfg', sections: [{ name: 'Volume', settings: [{ name: 'MasterVolume', value: '0.3' }] }] },
    ],
  };
  const current = persistedFixture();
  const merged = mergePersisted(current, patch);

  assert.equal(findSetting(merged, 'Input.ini', 'GameEvents', 'evtCastSpell1').value, '[z]');
  assert.equal(findSetting(merged, 'Input.ini', 'GameEvents', 'evtCastSpell2').value, '[w]');
  assert.equal(findSetting(merged, 'Game.cfg', 'Volume', 'MasterVolume').value, '0.3');
  assert.equal(merged.description, current.description);
  assert.equal(findSetting(current, 'Input.ini', 'GameEvents', 'evtCastSpell1').value, '[q]');
});

test('setSetting refuses to invent keys unless asked to', () => {
  const data = persistedFixture();
  assert.equal(setSetting(data, 'Game.cfg', 'HUD', 'NotARealKey', '1'), false);
  assert.equal(findSetting(data, 'Game.cfg', 'HUD', 'NotARealKey'), null);
});

test('findBinding matches secondary bindings case-insensitively', () => {
  assert.equal(findBinding(persistedFixture(), 'Q').name, 'evtCastSpell1');
  assert.equal(findBinding(persistedFixture(), 'Button 4').name, 'evtUseVisionItem');
  assert.equal(findBinding(persistedFixture(), 'X'), null);
});

test('rebindKey moves a key and unbinds it from the previous action', () => {
  const data = persistedFixture();
  rebindKey(data, 'W', 'evtCastSpell1');
  assert.equal(findSetting(data, 'Input.ini', 'GameEvents', 'evtCastSpell1').value, '[w]');
  assert.equal(findSetting(data, 'Input.ini', 'GameEvents', 'evtCastSpell2').value, UNBOUND);
});

test('rebindKey keeps the secondary binding of the target action', () => {
  const data = persistedFixture();
  rebindKey(data, 'Q', 'evtUseVisionItem');
  assert.equal(findSetting(data, 'Input.ini', 'GameEvents', 'evtUseVisionItem').value, '[q],[Button 4]');
  assert.equal(findSetting(data, 'Input.ini', 'GameEvents', 'evtCastSpell1').value, UNBOUND);
});

// ─── settings model ─────────────────────────────────────────────────────────

test('flat keys survive names with dots and spaces', () => {
  assert.deepEqual(decodeKey(persistedKey('Input.ini', 'Game Events', 'evt.x')), {
    source: 'persisted',
    fileName: 'Input.ini',
    sectionName: 'Game Events',
    keyName: 'evt.x',
  });
  assert.deepEqual(decodeKey(iniKey('Mobile', 'Camera Height')).keyName, 'Camera Height');
});

test('flattenConfigs applies section and setting filters', () => {
  const flat = flattenConfigs(
    { General: { Width: '1920' }, TFT: { X: '1' } },
    persistedFixture(),
    { iniSection: (s) => !s.startsWith('TFT'), persistedSetting: (s) => s.fileName === 'Input.ini' },
  );
  assert.equal(flat[iniKey('General', 'Width')], '1920');
  assert.equal(flat[iniKey('TFT', 'X')], undefined);
  assert.equal(flat[persistedKey('Input.ini', 'GameEvents', 'evtCastSpell1')], '[q]');
  assert.equal(flat[persistedKey('Game.cfg', 'HUD', 'MinimapScale')], undefined);
});

test('applyValue keeps game.cfg and the synced PersistedSettings copy aligned', () => {
  const ini = { HUD: { MinimapScale: '1.0000' }, General: { Width: '1920' } };
  const persisted = persistedFixture();

  applyValue(ini, persisted, iniKey('HUD', 'MinimapScale'), '2.0000');
  assert.equal(ini.HUD.MinimapScale, '2.0000');
  assert.equal(findSetting(persisted, 'Game.cfg', 'HUD', 'MinimapScale').value, '2.0000');

  applyValue(ini, persisted, persistedKey('Game.cfg', 'HUD', 'MinimapScale'), '1.5000');
  assert.equal(ini.HUD.MinimapScale, '1.5000');

  applyValue(ini, persisted, iniKey('General', 'Width'), '2560');
  assert.equal(findSetting(persisted, 'Game.cfg', 'General', 'Width'), null);
});

test('syncPersistedWithIni only updates Game.cfg entries that already exist', () => {
  const persisted = persistedFixture();
  const changed = syncPersistedWithIni(persisted, {
    HUD: { MinimapScale: '1.5000', NotSynced: '1' },
    Volume: { MasterVolume: '0.2000' },
  });
  assert.equal(changed, 1);
  assert.equal(findSetting(persisted, 'Game.cfg', 'HUD', 'MinimapScale').value, '1.5000');
  assert.equal(findSetting(persisted, 'Game.cfg', 'HUD', 'NotSynced'), null);
  assert.equal(findSetting(persisted, 'Game.cfg', 'Volume', 'MasterVolume'), null);
});

test('valueKind does not turn numeric enums into toggles', () => {
  assert.equal(valueKind('FrameCapType', '1'), 'number');
  assert.equal(valueKind('EffectsQuality', '0'), 'number');
  assert.equal(valueKind('WindowMode', '2'), 'number');
  assert.equal(valueKind('MasterMute', '0'), 'boolean');
  assert.equal(valueKind('ShowFPSAndLatency', '1'), 'boolean');
  assert.equal(valueKind('enabled', true), 'boolean');
  assert.equal(valueKind('evtCastSpell1', '[q]'), 'string');
  assert.equal(valueKind('Empty', ''), 'string');
});

test('booleanValue preserves the representation already in the file', () => {
  assert.equal(booleanValue('1', false), '0');
  assert.equal(booleanValue('false', true), 'true');
  assert.equal(booleanValue(false, true), true);
});

// ─── misc ───────────────────────────────────────────────────────────────────

test('profileFileName produces safe Windows file names', () => {
  assert.equal(profileFileName('trava o chat'), 'trava o chat.json');
  assert.equal(profileFileName('a/b:c*'), 'a_b_c_.json');
  assert.equal(profileFileName('..\\..\\evil'), '.._.._evil.json');
  assert.equal(profileFileName('CON'), '_CON.json');
  assert.equal(profileFileName('...'), 'profile.json');
  assert.equal(profileFileName('   '), 'profile.json');
});

test('escapeHtml neutralises markup', () => {
  assert.equal(escapeHtml('<img src=x onerror="a">&\''), '&lt;img src=x onerror=&quot;a&quot;&gt;&amp;&#39;');
  assert.equal(escapeHtml(null), '');
});

test('deepMerge merges objects, replaces arrays and does not mutate', () => {
  const target = { install: { globals: { locale: 'en_US', region: 'NA' }, patcher: { locales: ['en_US'] } } };
  const merged = deepMerge(target, { install: { globals: { locale: 'pt_BR' }, patcher: { locales: ['pt_BR'] } } });
  assert.deepEqual(merged.install.globals, { locale: 'pt_BR', region: 'NA' });
  assert.deepEqual(merged.install.patcher.locales, ['pt_BR']);
  assert.equal(target.install.globals.locale, 'en_US');
});

test('valuesEqual compares numbers numerically and everything else as text', () => {
  assert.equal(valuesEqual('1.0000', '1'), true);
  assert.equal(valuesEqual('0.5000', '0.5'), true);
  assert.equal(valuesEqual('[q]', '[Q]'), false);
  assert.equal(valuesEqual('', '0'), false);
  assert.equal(valuesEqual(undefined, ''), true);
});

test('levelTheme follows the client level ring thresholds', () => {
  assert.deepEqual(
    [1, 29, 30, 49, 50, 74, 75, 99, 100, 500, 1200].map(levelTheme),
    [1, 1, 2, 2, 3, 3, 4, 4, 5, 21, 21],
  );
});

test('client asset paths and icons map to CommunityDragon', () => {
  const gameData = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default';
  assert.equal(gameDataAssetUrl('/lol-game-data/assets/ASSETS/Regalia/BannerSkins/Gold.png'), `${gameData}/assets/regalia/bannerskins/gold.png`);
  assert.equal(gameDataAssetUrl('https://example.com/x.png'), null);
  assert.equal(profileIconUrl(6923), `${gameData}/v1/profile-icons/6923.jpg`);
  assert.equal(profileIconUrl(0), `${gameData}/v1/profile-icons/0.jpg`);
  assert.equal(profileIconUrl(null), 'assets/lol-profile/profile_unranked.png');
});

test('crestBorder picks the level ring, ranked wings or nothing', () => {
  const images = 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images';
  assert.deepEqual(crestBorder({}, 120), { type: 'prestige', url: `${images}/uikit/themed-borders/theme-5-border.png` });
  assert.deepEqual(crestBorder({ crestType: 'ranked', rankedTier: 'gold' }, 120), { type: 'ranked', url: `${images}/ranked-emblem/wings/wings_gold.png` });
  assert.equal(crestBorder({ crestType: 'ranked', rankedTier: 'NONE' }, 682).type, 'prestige');
  assert.deepEqual(crestBorder({ crestType: 'none' }, 120), { type: 'none', url: null });
  assert.equal(crestBorder({}, null).type, 'none');
});

test('bannerSkinPath resolves equipped, past-rank and default banners', () => {
  const skin = (name) => `/lol-game-data/assets/ASSETS/Regalia/BannerSkins/${name}.png`;
  const catalog = [
    { id: '1', idSecondary: '', regaliaType: 'kBanner', assetPath: skin('default') },
    { id: '2', idSecondary: 'UNRANKED', regaliaType: 'kBanner', assetPath: skin('unranked') },
    { id: '2', idSecondary: 'GOLD', regaliaType: 'kBanner', assetPath: skin('gold') },
    { id: '9', idSecondary: '', regaliaType: 'kBanner', assetPath: skin('UnkillableDemonKingBanner') },
    { id: '', idSecondary: '', regaliaType: 'kNone', assetPath: '/lol-game-data/assets/' },
  ];
  assert.equal(bannerSkinPath(catalog, { bannerItemId: 9 }), skin('UnkillableDemonKingBanner'));
  assert.equal(bannerSkinPath(catalog, { bannerItemId: 2, lastSeasonHighestRank: 'GOLD' }), skin('gold'));
  assert.equal(bannerSkinPath(catalog, { bannerType: 'lastSeasonHighestRank', lastSeasonHighestRank: 'NONE' }), skin('unranked'));
  assert.equal(bannerSkinPath(catalog, { bannerType: 'blank' }), skin('default'));
  assert.equal(bannerSkinPath([], { bannerItemId: 9 }), skin('default'));
  assert.match(bannerImageUrl(null), /\/assets\/regalia\/bannerskins\/default\.png$/);
});

test('format helpers detect and restore the original layout', () => {
  assert.equal(detectEol('a\r\nb'), '\r\n');
  assert.equal(detectEol('a\nb'), '\n');
  assert.equal(detectIndent('{\n    "files": []\n}'), 4);
  assert.equal(detectIndent('{\n\t"files": []\n}'), '\t');
  assert.equal(detectIndent('{}', 2), 2);
  assert.equal(withEol('a\nb\r\nc', '\r\n'), 'a\r\nb\r\nc');
});
