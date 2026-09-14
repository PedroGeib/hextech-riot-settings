import { iniKey } from '../lib/settings-model.js';
import { createGameSettingsView } from './shared/game-settings-view.js';

const TFT_SECTION = /^TFT|Cherry|Strawberry/i;
const SHARED_SECTIONS = new Set(['General', 'Performance', 'Volume', 'HUD']);

const view = createGameSettingsView({
  id: 'tft',
  gameName: 'Teamfight Tactics',
  title: 'Teamfight Tactics Settings',
  subtitle: 'Configure TFT options and the general settings it shares with League',
  icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"/><line x1="12" y1="22" x2="12" y2="15.5"/><polyline points="22,8.5 12,15.5 2,8.5"/></svg>`,
  keymapper: false,
  profileTarget: false,
  cards: [
    {
      title: 'Performance & Video',
      controls: [
        {
          type: 'resolution',
          keys: [iniKey('General', 'Width'), iniKey('General', 'Height')],
          label: 'Screen Resolution',
          description: 'Width and height of the game window.',
        },
        {
          type: 'toggle',
          key: iniKey('General', 'WaitForVerticalSync'),
          label: 'Vertical Sync',
          description: 'Locks the frame rate to the monitor refresh rate to prevent screen tearing.',
        },
      ],
    },
    {
      title: 'Audio & HUD',
      controls: [
        { type: 'percent', key: iniKey('Volume', 'MasterVolume'), label: 'Master Volume', description: 'Overall volume of all game sounds.' },
        { type: 'range', key: iniKey('HUD', 'MinimapScale'), min: 0, max: 3, step: 0.05, label: 'Minimap Scale', description: 'Size of the minimap.' },
      ],
    },
  ],
  categories: ['TFT Options', 'HUD & Chat', 'Engine', 'Audio', 'Controls', 'Additional Settings'],
  categorize: (info) => {
    if (info.source === 'persisted' && info.fileName.toLowerCase() === 'input.ini') return 'Controls';
    if (/^TFT(HUD|Chat)$/i.test(info.sectionName) || info.sectionName === 'HUD') return 'HUD & Chat';
    if (TFT_SECTION.test(info.sectionName)) return 'TFT Options';
    if (info.sectionName === 'General' || info.sectionName === 'Performance') return 'Engine';
    if (info.sectionName === 'Volume') return 'Audio';
    return 'Additional Settings';
  },
  iniSection: (section) => TFT_SECTION.test(section) || SHARED_SECTIONS.has(section),
  persistedSetting: (setting) => TFT_SECTION.test(setting.sectionName) || setting.fileName.toLowerCase() === 'input.ini',
});

export const { render, mount } = view;
