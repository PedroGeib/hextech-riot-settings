// Profiles page: save, apply, edit and delete configuration snapshots.

import { escapeHtml } from '../lib/html.js';
import { attachImageFallbacks } from '../lib/regalia.js';
import { crestHtml } from './shared/regalia-crest.js';
import { KEYS, readJson, writeJson } from '../lib/storage.js';
import { confirmAction, errorMessage, toast, withBusyButtons } from '../lib/ui.js';

const TARGET_TABS = [
  ['gameCfg', 'game.cfg'],
  ['persistedSettings', 'Atalhos'],
  ['clientSettings', 'Client'],
];

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value ?? '') : date.toLocaleString('pt-BR');
}

export function render() {
  return `
    <div id="profiles-view" class="view-container">
      <header class="page-header">
        <h1>Perfis</h1>
        <p class="subtitle">Salve, aplique e edite cópias das suas configurações</p>
      </header>

      <section class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Novo perfil</h3>
            <p class="card-subtitle">Guarda o game.cfg, o PersistedSettings.json e o LeagueClientSettings.yaml como estão agora.</p>
          </div>
        </div>
        <form id="save-profile-form" class="inline-form">
          <input type="text" id="new-profile-name" class="input-control input-control--grow" maxlength="100" aria-label="Nome do perfil" placeholder="ex.: FPS máximo" />
          <button type="submit" class="btn btn--primary">Salvar perfil</button>
        </form>
      </section>

      <section class="card">
        <div class="card-header"><h3 class="card-title">Perfis salvos</h3></div>
        <div id="profiles-list" class="profile-list">
          <div class="skeleton skeleton--card" style="height: 72px;"></div>
        </div>
      </section>
    </div>`;
}

function profileRowHtml(profile) {
  const meta = profile.meta ?? {};
  const name = escapeHtml(profile.name);
  const details = [
    profile.updatedAt ? `Atualizado em ${formatDate(profile.updatedAt)}` : `Criado em ${formatDate(profile.createdAt)}`,
    meta.summonerLevel ? `Nível ${meta.summonerLevel}` : null,
    meta.summonerName && meta.summonerName !== profile.name ? `de ${meta.summonerName}` : null,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(' • ');

  return `
    <div class="profile-row">
      <div class="profile-row__identity">
        <div class="profile-row__crest">
          ${crestHtml({ iconId: meta.profileIconId, level: meta.summonerLevel, regalia: meta.regalia, size: 36 })}
        </div>
        <div class="profile-row__text">
          <h4 class="profile-row__name">${name}</h4>
          <p class="profile-row__details">${details}</p>
        </div>
      </div>
      <div class="profile-row__actions">
        <button class="btn btn--secondary btn--sm" data-edit="${name}">Editar</button>
        <button class="btn btn--secondary btn--sm" data-apply="${name}">Aplicar</button>
        <button class="btn btn--danger btn--sm" data-delete="${name}">Excluir</button>
      </div>
    </div>`;
}

export function mount() {
  const root = document.getElementById('profiles-view');
  if (!root) return;
  const api = window.api;
  const list = root.querySelector('#profiles-list');
  const form = root.querySelector('#save-profile-form');
  const nameInput = root.querySelector('#new-profile-name');

  nameInput.value = window.appState?.account?.name ?? '';

  async function loadProfiles() {
    try {
      const profiles = await api.profiles.list();
      if (!root.isConnected) return;
      list.innerHTML = profiles.length
        ? profiles.map((profile) => profileRowHtml(profile)).join('')
        : '<div class="empty-state"><p>Nenhum perfil salvo ainda.</p></div>';
      attachImageFallbacks(list);
    } catch (err) {
      list.innerHTML = `<div class="empty-state"><h3>Não foi possível carregar os perfis</h3><p>${escapeHtml(errorMessage(err))}</p></div>`;
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      toast('Digite um nome para o perfil', 'error');
      nameInput.focus();
      return;
    }

    const exists = (await api.profiles.list()).some((p) => p.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      const overwrite = await confirmAction({
        title: 'Substituir perfil?',
        message: `Já existe um perfil chamado "${name}". Substituir pelas configurações atuais?`,
        confirmText: 'Substituir',
        danger: true,
      });
      if (!overwrite) return;
    }

    await withBusyButtons([form.querySelector('button[type="submit"]')], 'Salvando…', async () => {
      try {
        await api.profiles.quickSave(name);
        toast(`Perfil "${name}" salvo`, 'success');
        await loadProfiles();
      } catch (err) {
        toast(errorMessage(err), 'error');
      }
    });
  });

  list.addEventListener('click', async (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const { edit, apply, delete: remove } = button.dataset;

    if (edit !== undefined) return openEditor(edit);

    if (apply !== undefined) {
      const confirmed = await confirmAction({
        title: 'Aplicar perfil',
        message: `Aplicar "${apply}"? Suas configurações atuais recebem um backup antes, que pode ser restaurado pelo Painel.`,
        confirmText: 'Aplicar',
      });
      if (!confirmed) return;
      return withBusyButtons([button], 'Aplicando…', async () => {
        try {
          const { applied } = await api.profiles.applyAll(await api.profiles.load(apply));
          toast(`"${apply}" aplicado em ${applied.join(', ') || 'nenhum arquivo'}`, 'success');
        } catch (err) {
          toast(errorMessage(err), 'error');
        }
      });
    }

    if (remove !== undefined) {
      const confirmed = await confirmAction({
        title: 'Excluir perfil',
        message: `Excluir "${remove}"? Isso não pode ser desfeito.`,
        confirmText: 'Excluir',
        danger: true,
      });
      if (!confirmed) return;
      try {
        await api.profiles.delete(remove);
        const mappings = Object.fromEntries(Object.entries(readJson(KEYS.accountMappings, {})).filter(([, name]) => name !== remove));
        writeJson(KEYS.accountMappings, mappings);
        toast(`Perfil "${remove}" excluído`, 'success');
        await loadProfiles();
      } catch (err) {
        toast(errorMessage(err), 'error');
      }
    }
  });

  async function openEditor(name) {
    let profile;
    try {
      profile = await api.profiles.load(name);
    } catch (err) {
      toast(errorMessage(err), 'error');
      return;
    }

    const drafts = Object.fromEntries(TARGET_TABS.map(([key]) => [key, JSON.stringify(profile.targets?.[key] ?? null, null, 2)]));
    let active = TARGET_TABS[0][0];

    const modal = window.openModal({
      title: `Editar perfil: ${profile.name}`,
      wide: true,
      body: `
        <div role="tablist" class="tab-bar">
          ${TARGET_TABS.map(([key, label]) => `<button type="button" role="tab" class="btn btn--sm btn--secondary" data-tab="${key}">${escapeHtml(label)}</button>`).join('')}
        </div>
        <p class="modal-hint">Edite os valores salvos em JSON. Só este perfil muda; os arquivos do jogo ficam intactos até você aplicá-lo.</p>
        <textarea class="code-editor" spellcheck="false" aria-label="Valores do perfil em JSON"></textarea>`,
      footer: `
        <div class="modal-footer__split">
          <button class="btn btn--danger" data-action="restore" ${profile.originalTargets ? '' : 'disabled title="Este perfil não tem uma cópia original"'}>Restaurar original</button>
          <div class="card-actions">
            <button class="btn btn--secondary" data-action="cancel">Cancelar</button>
            <button class="btn btn--primary" data-action="save">Salvar alterações</button>
          </div>
        </div>`,
    });

    const textarea = modal.body.querySelector('textarea');

    const commitDraft = () => {
      try {
        JSON.parse(textarea.value);
        drafts[active] = textarea.value;
        return true;
      } catch (err) {
        const label = TARGET_TABS.find(([key]) => key === active)[1];
        toast(`JSON inválido em ${label}: ${err.message}`, 'error');
        return false;
      }
    };

    const showTab = (key) => {
      active = key;
      textarea.value = drafts[key];
      modal.body.querySelectorAll('[data-tab]').forEach((tab) => {
        const selected = tab.dataset.tab === key;
        tab.classList.toggle('btn--primary', selected);
        tab.classList.toggle('btn--secondary', !selected);
        tab.setAttribute('aria-selected', String(selected));
      });
    };
    showTab(active);

    modal.body.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-tab]');
      if (tab && tab.dataset.tab !== active && commitDraft()) showTab(tab.dataset.tab);
    }, { signal: modal.signal });

    modal.footer.addEventListener('click', async (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'cancel') modal.close();

      if (action === 'save') {
        if (!commitDraft()) return;
        const targets = Object.fromEntries(TARGET_TABS.map(([key]) => [key, JSON.parse(drafts[key])]));
        try {
          await api.profiles.save({ ...profile, targets });
          modal.close();
          toast('Alterações do perfil salvas', 'success');
          await loadProfiles();
        } catch (err) {
          toast(`Não foi possível salvar: ${errorMessage(err)}`, 'error');
        }
      }

      if (action === 'restore') {
        modal.close();
        const confirmed = await confirmAction({
          title: 'Restaurar original?',
          message: `Descartar todas as edições de "${profile.name}" e voltar às configurações de quando ele foi salvo?`,
          confirmText: 'Restaurar',
          danger: true,
        });
        if (!confirmed) return;
        try {
          await api.profiles.restoreOriginal(profile.name);
          toast('Perfil restaurado para a cópia original', 'success');
          await loadProfiles();
        } catch (err) {
          toast(errorMessage(err), 'error');
        }
      }
    }, { signal: modal.signal });
  }

  loadProfiles();
}
