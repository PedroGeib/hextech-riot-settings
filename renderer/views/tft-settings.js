import { iniKey } from '../lib/settings-model.js';
import { createGameSettingsView } from './shared/game-settings-view.js';

const TFT_SECTION = /^TFT|Cherry|Strawberry/i;
const SHARED_SECTIONS = new Set(['General', 'Performance', 'Volume', 'HUD']);

const view = createGameSettingsView({
  id: 'tft',
  gameName: 'Teamfight Tactics',
  title: 'Configurações do Teamfight Tactics',
  subtitle: 'Opções do TFT e as configurações gerais que ele compartilha com o League',
  icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"/><line x1="12" y1="22" x2="12" y2="15.5"/><polyline points="22,8.5 12,15.5 2,8.5"/></svg>`,
  keymapper: false,
  profileTarget: false,
  cards: [
    {
      title: 'Desempenho e vídeo',
      controls: [
        {
          type: 'resolution',
          keys: [iniKey('General', 'Width'), iniKey('General', 'Height')],
          label: 'Resolução',
          description: 'Largura e altura da janela do jogo.',
        },
        {
          type: 'toggle',
          key: iniKey('General', 'WaitForVerticalSync'),
          label: 'Sincronização vertical (V-Sync)',
          description: 'Limita o FPS à taxa de atualização do monitor para evitar cortes na imagem.',
        },
      ],
    },
    {
      title: 'Áudio e HUD',
      controls: [
        { type: 'percent', key: iniKey('Volume', 'MasterVolume'), label: 'Volume geral', description: 'Volume de todos os sons do jogo.' },
        { type: 'range', key: iniKey('HUD', 'MinimapScale'), min: 0, max: 3, step: 0.05, label: 'Escala do minimapa', description: 'Tamanho do minimapa.' },
      ],
    },
  ],
  categories: ['Opções do TFT', 'HUD e chat', 'Motor', 'Áudio', 'Controles', 'Outras configurações'],
  categorize: (info) => {
    if (info.source === 'persisted' && info.fileName.toLowerCase() === 'input.ini') return 'Controles';
    if (/^TFT(HUD|Chat)$/i.test(info.sectionName) || info.sectionName === 'HUD') return 'HUD e chat';
    if (TFT_SECTION.test(info.sectionName)) return 'Opções do TFT';
    if (info.sectionName === 'General' || info.sectionName === 'Performance') return 'Motor';
    if (info.sectionName === 'Volume') return 'Áudio';
    return 'Outras configurações';
  },
  iniSection: (section) => TFT_SECTION.test(section) || SHARED_SECTIONS.has(section),
  persistedSetting: (setting) => TFT_SECTION.test(setting.sectionName) || setting.fileName.toLowerCase() === 'input.ini',
});

export const { render, mount } = view;
