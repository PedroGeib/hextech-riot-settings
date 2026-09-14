import { iniKey } from '../lib/settings-model.js';
import { createGameSettingsView } from './shared/game-settings-view.js';

const SECTION_CATEGORIES = {
  General: 'Graphics & Engine',
  Performance: 'Graphics & Engine',
  ColorPalette: 'Graphics & Engine',
  Volume: 'Audio & Sound',
  Voice: 'Audio & Sound',
  HUD: 'Interface & HUD',
  Chat: 'Interface & HUD',
  LossOfControl: 'Interface & HUD',
  ItemShop: 'Interface & HUD',
  FloatingText: 'Interface & HUD',
  Accessibility: 'Interface & HUD',
};

const TFT_SECTION = /^TFT|Cherry|Strawberry/i;

const view = createGameSettingsView({
  id: 'lol',
  gameName: 'League of Legends',
  title: 'League of Legends Settings',
  subtitle: 'Configure standard settings or deep-dive into advanced options',
  icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
  keymapper: true,
  profileTarget: true,
  cards: [
    {
      title: 'Video & Display',
      controls: [
        {
          type: 'resolution',
          keys: [iniKey('General', 'Width'), iniKey('General', 'Height')],
          label: 'Screen Resolution',
          description: 'Width and height of the game window.',
        },
        {
          type: 'select',
          key: iniKey('General', 'WindowMode'),
          label: 'Window Mode',
          description: 'Fullscreen, windowed or borderless.',
          options: [
            { value: '0', label: 'Fullscreen' },
            { value: '1', label: 'Windowed' },
            { value: '2', label: 'Borderless' },
          ],
        },
      ],
    },
    {
      title: 'Audio & Sound',
      controls: [
        { type: 'percent', key: iniKey('Volume', 'MasterVolume'), label: 'Master Volume', description: 'Overall volume of all game sounds.' },
        { type: 'percent', key: iniKey('Volume', 'MusicVolume'), label: 'Music Volume', description: 'Background music volume.' },
      ],
    },
    {
      title: 'Interface & HUD',
      controls: [
        { type: 'range', key: iniKey('HUD', 'MinimapScale'), min: 0, max: 3, step: 0.05, label: 'Minimap Scale', description: 'Size of the minimap.' },
        { type: 'toggle', key: iniKey('HUD', 'FlipMiniMap'), label: 'Flip Minimap', description: 'Move the minimap to the left side of the screen.' },
      ],
    },
  ],
  categories: ['Graphics & Engine', 'Interface & HUD', 'Audio & Sound', 'Keybindings & Inputs', 'Additional Settings'],
  categorize: (info) => {
    if (info.source === 'persisted' && info.fileName.toLowerCase() === 'input.ini') return 'Keybindings & Inputs';
    return SECTION_CATEGORIES[info.sectionName] ?? 'Additional Settings';
  },
  iniSection: (section) => !TFT_SECTION.test(section),
  persistedSetting: (setting) => !TFT_SECTION.test(setting.sectionName),
});

export const { render, mount } = view;
