import { iniKey } from '../lib/settings-model.js';
import { createGameSettingsView } from './shared/game-settings-view.js';

const SECTION_CATEGORIES = {
  General: 'Gráficos e motor',
  Performance: 'Gráficos e motor',
  ColorPalette: 'Gráficos e motor',
  Volume: 'Áudio e som',
  Voice: 'Áudio e som',
  HUD: 'Interface e HUD',
  Chat: 'Interface e HUD',
  LossOfControl: 'Interface e HUD',
  ItemShop: 'Interface e HUD',
  FloatingText: 'Interface e HUD',
  Accessibility: 'Interface e HUD',
};

const TFT_SECTION = /^TFT|Cherry|Strawberry/i;

const view = createGameSettingsView({
  id: 'lol',
  gameName: 'League of Legends',
  title: 'Configurações do League of Legends',
  subtitle: 'Ajuste as opções principais ou explore as avançadas',
  icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
  keymapper: true,
  profileTarget: true,
  cards: [
    {
      title: 'Vídeo e tela',
      controls: [
        {
          type: 'resolution',
          keys: [iniKey('General', 'Width'), iniKey('General', 'Height')],
          label: 'Resolução',
          description: 'Largura e altura da janela do jogo.',
        },
        {
          type: 'select',
          key: iniKey('General', 'WindowMode'),
          label: 'Modo de janela',
          description: 'Tela cheia, janela ou sem bordas.',
          options: [
            { value: '0', label: 'Tela cheia' },
            { value: '1', label: 'Janela' },
            { value: '2', label: 'Sem bordas' },
          ],
        },
      ],
    },
    {
      title: 'Áudio e som',
      controls: [
        { type: 'percent', key: iniKey('Volume', 'MasterVolume'), label: 'Volume geral', description: 'Volume de todos os sons do jogo.' },
        { type: 'percent', key: iniKey('Volume', 'MusicVolume'), label: 'Volume da música', description: 'Volume da música de fundo.' },
      ],
    },
    {
      title: 'Interface e HUD',
      controls: [
        { type: 'range', key: iniKey('HUD', 'MinimapScale'), min: 0, max: 3, step: 0.05, label: 'Escala do minimapa', description: 'Tamanho do minimapa.' },
        { type: 'toggle', key: iniKey('HUD', 'FlipMiniMap'), label: 'Inverter minimapa', description: 'Move o minimapa para o lado esquerdo da tela.' },
      ],
    },
  ],
  categories: ['Gráficos e motor', 'Interface e HUD', 'Áudio e som', 'Atalhos e controles', 'Outras configurações'],
  categorize: (info) => {
    if (info.source === 'persisted' && info.fileName.toLowerCase() === 'input.ini') return 'Atalhos e controles';
    return SECTION_CATEGORIES[info.sectionName] ?? 'Outras configurações';
  },
  iniSection: (section) => !TFT_SECTION.test(section),
  persistedSetting: (setting) => !TFT_SECTION.test(setting.sectionName),
});

export const { render, mount } = view;
