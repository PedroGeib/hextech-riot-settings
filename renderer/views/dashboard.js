// Dashboard: account status, profiles, quick slots, backups and quick actions.
// Live status (account, processes, lock) is pushed by app.js through the
// "app:status" event; this view only loads files and profiles itself.

import { escapeHtml } from '../lib/html.js';
import { attachImageFallbacks, bannerImageUrl } from '../lib/regalia.js';
import { crestHtml } from './shared/regalia-crest.js';
import { SLOT_NAMES, isSlotProfile } from '../lib/profile-name.js';
import { applyValue, iniKey } from '../lib/settings-model.js';
import { KEYS, readJson, writeJson, writeText } from '../lib/storage.js';
import { confirmAction, errorMessage, toast, withBusyButtons } from '../lib/ui.js';

const WINDOW_MODES = { 0: 'Tela cheia', 1: 'Janela', 2: 'Sem bordas' };

// Lowest-cost values for settings that exist in game.cfg. Keys missing from
// the user's file are skipped rather than created.
const FPS_SETTINGS = {
  General: { AntiAliasing: '0', ShadowsEnabled: '0', EffectsQuality: '0', EnvironmentQuality: '0', CharacterQuality: '1' },
  Performance: {
    ShadowsEnabled: '0',
    ShadowQuality: '0',
    EffectsQuality: '0',
    EnvironmentQuality: '0',
    CharacterQuality: '1',
    EnableFXAA: '0',
    EnableHUDAnimations: '0',
  },
};

const LOGO_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`;

let mounted = false;
let renderedAccount;

const api = () => window.api;
const byId = (id) => document.getElementById(id);

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value ?? '') : date.toLocaleString('pt-BR');
}

// ─── Template ───────────────────────────────────────────────────────────────

function summaryItem(id, label) {
  return `
    <div class="summary-item">
      <span class="summary-item__label">${label}</span>
      <span class="summary-item__value" id="${id}">…</span>
    </div>`;
}

function slotCard(index) {
  return `
    <div class="dashboard-slot-card">
      <div>
        <h4 class="dashboard-slot-card__title">Slot ${index} <kbd class="kbd-hint">Ctrl+Alt+${index}</kbd></h4>
        <p class="dashboard-slot-card__status" id="slot-${index}-status">Vazio</p>
      </div>
      <div class="dashboard-slot-card__actions">
        <button data-slot-save="${index}" class="btn btn--primary btn--sm">Salvar atual</button>
        <button data-slot-apply="${index}" class="btn btn--secondary btn--sm" style="display: none;">Aplicar</button>
      </div>
    </div>`;
}

export function render() {
  return `
    <div id="dashboard-view" class="view-container">
      <header class="page-header">
        <h1>Painel</h1>
        <p class="subtitle">Acompanhe e gerencie as configurações dos jogos da Riot</p>
      </header>

      <section class="dashboard-status-strip" aria-label="Status da conta ativa">
        <div class="dashboard-status-strip__avatar" id="strip-avatar">${LOGO_SVG}</div>

        <div class="dashboard-status-strip__item">
          <span class="dashboard-status-strip__label">Conta ativa</span>
          <span class="dashboard-status-strip__value" id="strip-account-name">Detectando…</span>
          <span class="dashboard-status-strip__level" id="strip-account-level" style="display: none;"></span>
        </div>

        <div class="dashboard-status-strip__item">
          <span class="dashboard-status-strip__label">Client</span>
          <span class="dashboard-status-strip__value">
            <span class="status-badge status-badge--offline" id="strip-client-badge">Fechado</span>
            <span class="dashboard-status-strip__detail" id="strip-client-detail"></span>
          </span>
        </div>

        <div class="dashboard-status-strip__item dashboard-status-strip__item--lock">
          <span class="dashboard-status-strip__label">Trava da nuvem</span>
          <span class="dashboard-status-strip__value">
            <span class="status-badge status-badge--offline" id="strip-lock-badge">—</span>
          </span>
        </div>

        <div class="dashboard-status-strip__action">
          <button id="btn-toggle-lock" class="btn btn--secondary btn--sm" style="display: none;">Alternar trava</button>
        </div>

        <div class="dashboard-status-strip__files">
          <span class="dashboard-status-strip__label" style="margin-bottom: 6px;">Arquivos</span>
          <div class="dashboard-status-strip__file-list" id="strip-config-files">
            <span class="text-xs text-muted">Verificando…</span>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-header">
          <h3 class="card-title">Perfis</h3>
          <div class="card-actions">
            <button id="btn-refresh-profiles" class="btn btn--secondary btn--sm">Atualizar</button>
            <button id="btn-quick-save" class="btn btn--primary btn--sm">Salvar atual</button>
          </div>
        </div>
        <div class="dashboard-profiles-grid" id="dashboard-profiles-grid"></div>
      </section>

      <section class="card">
        <div class="card-header"><h3 class="card-title">Configurações atuais do jogo</h3></div>
        <div class="summary-grid">
          ${summaryItem('summary-resolution', 'Resolução')}
          ${summaryItem('summary-windowmode', 'Modo de janela')}
          ${summaryItem('summary-volume', 'Volume geral')}
          ${summaryItem('summary-language', 'Idioma do client')}
        </div>
      </section>

      <section class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Slots rápidos</h3>
            <p class="card-subtitle">Também aplicáveis pelos atalhos globais e pelo menu da bandeja.</p>
          </div>
        </div>
        <div class="dashboard-slots-grid">${SLOT_NAMES.map((_, i) => slotCard(i + 1)).join('')}</div>
      </section>

      <section class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Backups</h3>
            <p class="card-subtitle">Antes de qualquer alteração, uma cópia dos arquivos atuais é salva automaticamente. As 5 mais recentes são mantidas.</p>
          </div>
        </div>
        <div id="change-history-timeline" class="history-list"></div>
      </section>

      <section class="card">
        <div class="card-header"><h3 class="card-title">Ações rápidas</h3></div>
        <div class="card-actions">
          <button id="btn-optimize-fps" class="btn btn--primary">Otimizar FPS</button>
          <button id="btn-unlock-all" class="btn btn--secondary">Destravar todos os arquivos</button>
          <button id="btn-refresh-status" class="btn btn--secondary">Atualizar status</button>
        </div>
      </section>
    </div>`;
}

// ─── Lifecycle ──────────────────────────────────────────────────────────────

export async function mount() {
  mounted = true;
  renderedAccount = undefined;
  window.addEventListener('app:status', onStatus);
  bindHandlers();
  onStatus();
  await Promise.allSettled([refreshFileStatus(), refreshActiveGameSettings(), refreshProfiles(), refreshHistory()]);
}

export function unmount() {
  mounted = false;
  window.removeEventListener('app:status', onStatus);
}

function onStatus() {
  if (!mounted || !window.appState) return;
  renderStatusStrip(window.appState);
  const accountName = window.appState.account?.name ?? null;
  if (renderedAccount !== undefined && accountName !== renderedAccount) refreshProfiles();
}

// ─── Status strip ───────────────────────────────────────────────────────────

async function renderStatusStrip({ account, processes, clientRunning, gameRunning, persistedLocked }) {
  const nameEl = byId('strip-account-name');
  if (!nameEl) return;

  nameEl.textContent = account ? account.name : 'Nenhuma conta logada';
  nameEl.title = account && !account.live ? 'O client está fechado: mostrando a última conta que entrou.' : '';

  const levelEl = byId('strip-account-level');
  levelEl.textContent = account?.summonerLevel ? `NÍVEL ${account.summonerLevel}` : '';
  levelEl.style.display = account?.summonerLevel ? 'inline-block' : 'none';

  const clientBadge = byId('strip-client-badge');
  clientBadge.className = `status-badge status-badge--${clientRunning || gameRunning ? 'online' : 'offline'}`;
  clientBadge.textContent = gameRunning ? 'Em partida' : clientRunning ? 'Aberto' : 'Fechado';
  byId('strip-client-detail').textContent = (processes ?? []).join(', ');

  const lockBadge = byId('strip-lock-badge');
  lockBadge.className = `status-badge status-badge--${persistedLocked ? 'locked' : 'offline'}`;
  lockBadge.textContent = persistedLocked === null ? '—' : persistedLocked ? 'Travado (somente leitura)' : 'Destravado';
  byId('btn-toggle-lock').style.display = persistedLocked === null ? 'none' : 'inline-flex';

  const regalia = await api().client.getRegalia();
  const avatar = byId('strip-avatar');
  if (!avatar) return;
  const avatarKey = account ? JSON.stringify([account.profileIconId, account.summonerLevel, regalia]) : '';
  if (avatar.dataset.key !== avatarKey) {
    avatar.dataset.key = avatarKey;
    avatar.innerHTML = account
      ? crestHtml({ iconId: account.profileIconId, level: account.summonerLevel, regalia, size: 32 })
      : LOGO_SVG;
    attachImageFallbacks(avatar);
  }
}

async function refreshFileStatus() {
  const list = byId('strip-config-files');
  if (!list) return;
  try {
    const status = await api().paths.fileStatus();
    const item = (ok, label) =>
      `<span style="color: var(--accent-${ok ? 'emerald' : 'rose'}); font-weight: 500;" title="${ok ? 'Encontrado' : 'Não encontrado'}">${label}</span>`;
    list.innerHTML = [
      item(status.gameCfg, 'game.cfg'),
      item(status.persistedSettings, 'PersistedSettings'),
      item(status.clientSettings, 'ClientSettings'),
    ].join('<span style="color: var(--glass-border)">|</span>');
  } catch (err) {
    list.innerHTML = `<span class="text-xs text-rose">${escapeHtml(errorMessage(err))}</span>`;
  }
}

async function refreshActiveGameSettings() {
  const set = (id, text) => {
    const el = byId(id);
    if (el) el.textContent = text;
  };

  try {
    const { data } = await api().lol.readGameCfg();
    const general = data.General ?? {};
    const volume = data.Volume ?? {};
    set('summary-resolution', general.Width && general.Height ? `${general.Width}x${general.Height}` : '—');
    set('summary-windowmode', WINDOW_MODES[general.WindowMode] ?? '—');
    set(
      'summary-volume',
      volume.MasterVolume === undefined ? '—' : volume.MasterMute === '1' ? 'Mudo' : `${Math.round(Number(volume.MasterVolume) * 100)}%`,
    );
  } catch {
    ['summary-resolution', 'summary-windowmode', 'summary-volume'].forEach((id) => set(id, '—'));
  }

  try {
    const { data } = await api().client.read();
    set('summary-language', data?.install?.globals?.locale ?? '—');
  } catch {
    set('summary-language', '—');
  }
}

// ─── Profiles & slots ───────────────────────────────────────────────────────

async function refreshProfiles() {
  const grid = byId('dashboard-profiles-grid');
  if (!grid) return;
  const account = window.appState?.account ?? null;
  renderedAccount = account?.name ?? null;

  let profiles;
  try {
    profiles = await api().profiles.list();
  } catch (err) {
    grid.innerHTML = `<p class="text-sm text-rose" style="grid-column: 1 / -1;">Não foi possível carregar os perfis: ${escapeHtml(errorMessage(err))}</p>`;
    return;
  }
  if (!mounted) return;

  renderSlots(profiles);
  await syncAccountMeta(profiles, account);

  const mappings = readJson(KEYS.accountMappings, {});
  const custom = profiles.filter((p) => !isSlotProfile(p.name));
  grid.innerHTML = custom.length
    ? custom.map((profile) => profileCardHtml(profile, mappings, account)).join('')
    : '<p class="empty-hint" style="grid-column: 1 / -1;">Nenhum perfil ainda. Use "Salvar atual" para criar um.</p>';
  attachImageFallbacks(grid);
}

/**
 * Keeps icon, level, crest and banner of the logged-in account's profiles
 * (its own profile and its dated backups) in sync with the client.
 */
async function syncAccountMeta(profiles, account) {
  if (!account?.live) return;
  const regalia = await api().client.getRegalia();
  const accountName = account.name.toLowerCase();

  for (const summary of profiles) {
    const meta = summary.meta ?? {};
    const belongsToAccount = summary.name.toLowerCase() === accountName || meta.summonerName?.toLowerCase() === accountName;
    if (!belongsToAccount || isSlotProfile(summary.name)) continue;

    const upToDate =
      meta.profileIconId === account.profileIconId &&
      meta.summonerLevel === account.summonerLevel &&
      (!regalia || JSON.stringify(meta.regalia) === JSON.stringify(regalia));
    if (upToDate) continue;

    try {
      const profile = await api().profiles.load(summary.name);
      const updatedMeta = {
        ...profile.meta,
        summonerName: account.name,
        profileIconId: account.profileIconId,
        summonerLevel: account.summonerLevel,
        regalia: regalia ?? profile.meta?.regalia ?? null,
      };
      await api().profiles.save({ ...profile, meta: updatedMeta });
      summary.meta = updatedMeta;
    } catch (err) {
      console.warn(`Could not update account details of profile "${summary.name}":`, err);
    }
  }
}

function renderSlots(profiles) {
  SLOT_NAMES.forEach((slotName, i) => {
    const status = byId(`slot-${i + 1}-status`);
    const applyButton = document.querySelector(`[data-slot-apply="${i + 1}"]`);
    if (!status || !applyButton) return;
    const profile = profiles.find((p) => p.name === slotName);
    status.textContent = profile ? `Salvo em ${formatDate(profile.updatedAt ?? profile.createdAt)}` : 'Vazio';
    applyButton.style.display = profile ? 'inline-flex' : 'none';
  });
}

function profileCardHtml(profile, mappings, account) {
  const meta = profile.meta ?? {};
  const name = escapeHtml(profile.name);
  const linkedAccount = Object.entries(mappings).find(([, profileName]) => profileName === profile.name)?.[0];
  const subtitle = linkedAccount
    ? `Vinculado a ${escapeHtml(linkedAccount)}`
    : meta.summonerName && meta.summonerName !== profile.name
      ? `Salvo de ${escapeHtml(meta.summonerName)}`
      : 'Perfil personalizado';

  const linkControl = linkedAccount
    ? `<span class="lol-profile-card__linked">Vinculado <button type="button" class="lol-profile-card__unlink" data-unlink="${name}" title="Desvincular" aria-label="Desvincular ${name}">×</button></span>`
    : `<button class="btn btn--secondary btn--sm" data-link="${name}" ${account ? '' : 'disabled title="Entre no client do League para vincular este perfil à sua conta"'}>Vincular à conta</button>`;

  return `
    <div class="profile-card lol-profile-card">
      <div class="lol-profile-card__banner" style="background-image: url('${escapeHtml(bannerImageUrl(meta.regalia))}');" aria-hidden="true"></div>
      <div class="lol-profile-card__frame" aria-hidden="true"></div>
      <div class="lol-profile-card__topline">
        <span class="lol-profile-card__created">${escapeHtml(formatDate(profile.updatedAt ?? profile.createdAt))}</span>
      </div>
      <div class="lol-profile-card__identity">
        <div class="lol-profile-card__crest-wrapper">
          ${crestHtml({ iconId: meta.profileIconId, level: meta.summonerLevel, regalia: meta.regalia, size: 92 })}
          <span class="lol-profile-card__level">${escapeHtml(meta.summonerLevel ?? '—')}</span>
        </div>
        <h4 class="lol-profile-card__name">${name}</h4>
        <p class="lol-profile-card__meta">${subtitle}</p>
      </div>
      <div class="lol-profile-card__actions">
        ${linkControl}
        <button class="btn btn--primary btn--sm" data-apply="${name}">Aplicar</button>
      </div>
    </div>`;
}

async function applyProfileByName(name, button) {
  await withBusyButtons([button], 'Aplicando…', async () => {
    try {
      await api().profiles.applyAll(await api().profiles.load(name));
      toast(`"${name}" aplicado`, 'success');
      await Promise.allSettled([refreshActiveGameSettings(), refreshHistory()]);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  });
}

// ─── History ────────────────────────────────────────────────────────────────

function refreshHistory() {
  const container = byId('change-history-timeline');
  if (!container) return;
  const history = api().history.list();
  if (!history.length) {
    container.innerHTML = '<p class="empty-hint">Nenhum backup ainda.</p>';
    return;
  }
  container.innerHTML = history
    .map(
      (entry) => `
      <div class="history-row">
        <div class="history-row__text">
          <span class="history-row__title">${escapeHtml(entry.description)}</span>
          <span class="history-row__date">${escapeHtml(formatDate(entry.timestamp))}</span>
        </div>
        <button class="btn btn--secondary btn--sm" data-rollback="${escapeHtml(entry.timestamp)}">Restaurar</button>
      </div>`,
    )
    .join('');
}

// ─── Actions ────────────────────────────────────────────────────────────────

async function optimizeFps(button) {
  const confirmed = await confirmAction({
    title: 'Otimizar FPS',
    message:
      'Desligar sombras, anti-aliasing e animações do HUD, e colocar a qualidade de efeitos, ambiente e personagens no mínimo?\n\nUm backup é salvo antes, e você pode restaurá-lo pela seção Backups.',
    confirmText: 'Otimizar',
  });
  if (!confirmed) return;

  await withBusyButtons([button], 'Otimizando…', async () => {
    try {
      await api().status.assertGameClosed();
      const ini = (await api().lol.readGameCfg()).data;
      const persisted = await api().lol.readKeybindings().then((r) => r.data, () => null);

      let changed = 0;
      for (const [section, values] of Object.entries(FPS_SETTINGS)) {
        for (const [key, value] of Object.entries(values)) {
          if (ini[section]?.[key] === undefined) continue;
          applyValue(ini, persisted ?? {}, iniKey(section, key), value);
          changed++;
        }
      }
      if (!changed) {
        toast('O game.cfg ainda não tem as opções de gráficos. Abra as opções dentro do jogo uma vez e tente de novo.', 'info');
        return;
      }

      await api().history.saveSnapshot('Antes de otimizar o FPS');
      await api().lol.updateSettings(ini);
      if (persisted?.files) await api().lol.updateKeybindings(persisted);
      toast(`${changed} opções de gráficos ajustadas para mais FPS`, 'success');
      await Promise.allSettled([refreshActiveGameSettings(), refreshHistory()]);
    } catch (err) {
      toast(`Não foi possível otimizar: ${errorMessage(err)}`, 'error');
    }
  });
}

async function unlockAllFiles() {
  try {
    const paths = await api().paths.resolve();
    const status = await api().paths.fileStatus();
    for (const kind of ['gameCfg', 'persistedSettings', 'clientSettings']) {
      if (status[kind]) await api().lock.removeReadOnly(paths[kind]);
    }
    toast('Todos os arquivos de configuração podem ser alterados de novo', 'success');
    await window.refreshStatus();
  } catch (err) {
    toast(`Não foi possível destravar os arquivos: ${errorMessage(err)}`, 'error');
  }
}

async function saveCurrentAs(name) {
  const exists = (await api().profiles.list()).some((p) => p.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    const overwrite = await confirmAction({
      title: 'Substituir perfil?',
      message: `Já existe um perfil chamado "${name}". Substituir pelas configurações atuais?`,
      confirmText: 'Substituir',
      danger: true,
    });
    if (!overwrite) return;
  }
  try {
    await api().profiles.quickSave(name);
    toast(`Perfil "${name}" salvo`, 'success');
    await refreshProfiles();
  } catch (err) {
    toast(errorMessage(err), 'error');
  }
}

function openSaveModal() {
  const modal = window.openModal({
    title: 'Salvar configurações atuais',
    body: `
      <div class="form-group" style="margin-bottom: 0;">
        <label for="save-profile-name">Nome do perfil</label>
        <input type="text" id="save-profile-name" class="input-control w-full" maxlength="100" placeholder="ex.: Ranqueada" style="max-width: 100%;" value="${escapeHtml(window.appState?.account?.name ?? '')}" />
      </div>`,
    footer: `
      <button class="btn btn--secondary" data-action="cancel">Cancelar</button>
      <button class="btn btn--primary" data-action="save">Salvar</button>`,
  });

  const input = modal.body.querySelector('input');
  input.focus();
  input.select();

  const submit = () => {
    const name = input.value.trim();
    if (!name) {
      toast('O nome do perfil não pode ficar vazio', 'error');
      input.focus();
      return;
    }
    modal.close();
    saveCurrentAs(name);
  };
  input.addEventListener('keydown', (e) => e.key === 'Enter' && submit(), { signal: modal.signal });
  modal.footer.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'save') submit();
    if (action === 'cancel') modal.close();
  }, { signal: modal.signal });
}

function bindHandlers() {
  const root = byId('dashboard-view');
  if (!root) return;

  root.addEventListener('click', async (event) => {
    const target = event.target.closest('button');
    if (!target || target.disabled) return;
    const { link, unlink, apply, rollback, slotSave, slotApply } = target.dataset;

    if (link !== undefined) {
      const account = window.appState?.account;
      if (!account) return toast('Entre no client do League primeiro', 'error');
      const mappings = readJson(KEYS.accountMappings, {});
      mappings[account.name] = link;
      writeJson(KEYS.accountMappings, mappings);
      // The profile is applied on this account's next login, not right away.
      writeText(KEYS.lastAutoApplied, `${account.name}:${link}`);
      toast(`"${link}" será aplicado sempre que ${account.name} entrar`, 'success');
      return refreshProfiles();
    }

    if (unlink !== undefined) {
      const mappings = Object.fromEntries(Object.entries(readJson(KEYS.accountMappings, {})).filter(([, name]) => name !== unlink));
      writeJson(KEYS.accountMappings, mappings);
      toast(`"${unlink}" não está mais vinculado a uma conta`, 'info');
      return refreshProfiles();
    }

    if (apply !== undefined) return applyProfileByName(apply, target);

    if (slotSave !== undefined) {
      return withBusyButtons([target], 'Salvando…', async () => {
        try {
          await api().profiles.quickSave(`Slot_${slotSave}`);
          toast(`Configurações atuais salvas no Slot ${slotSave}`, 'success');
          await refreshProfiles();
        } catch (err) {
          toast(errorMessage(err), 'error');
        }
      });
    }

    if (slotApply !== undefined) return applyProfileByName(`Slot_${slotApply}`, target);

    if (rollback !== undefined) {
      const confirmed = await confirmAction({
        title: 'Restaurar backup',
        message: 'Voltar suas configurações para este backup? As configurações atuais recebem um backup antes.',
        confirmText: 'Restaurar',
      });
      if (!confirmed) return;
      try {
        await api().history.rollback(rollback);
        toast('Backup restaurado', 'success');
        await Promise.allSettled([refreshActiveGameSettings(), refreshHistory()]);
      } catch (err) {
        toast(errorMessage(err), 'error');
      }
    }
  });

  byId('btn-quick-save').addEventListener('click', openSaveModal);
  byId('btn-refresh-profiles').addEventListener('click', refreshProfiles);
  byId('btn-toggle-lock').addEventListener('click', () => window.toggleCloudSyncLock());
  byId('btn-optimize-fps').addEventListener('click', (e) => optimizeFps(e.currentTarget));
  byId('btn-unlock-all').addEventListener('click', unlockAllFiles);
  byId('btn-refresh-status').addEventListener('click', async () => {
    await Promise.allSettled([window.refreshStatus(), refreshFileStatus(), refreshActiveGameSettings(), refreshProfiles()]);
    refreshHistory();
    toast('Status atualizado', 'success');
  });
}
