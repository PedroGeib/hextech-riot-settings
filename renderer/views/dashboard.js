// renderer/views/dashboard.js
//
// Dashboard view. Splits cleanly into:
//   - render() : pure HTML template
//   - mount()  : wires up data fetching, event handlers and refreshes
//
// Module-level state keeps the refresh interval across mount/unmount cycles.

const FALLBACK_PROFILE_ICON = 29;          // ddragon default icon id
const ACTIVE_ACCOUNT_REFRESH_MS = 10_000;  // status strip refresh cadence
const DD_CDN_FALLBACK = '14.10.1';

let refreshInterval = null;

// ─── render() ────────────────────────────────────────────────────────────────

export function render() {
  return `
    <div id="dashboard-view" class="view-container">
      <header class="page-header" style="margin-bottom: 12px;">
        <h1 style="font-size: 26px;">Dashboard</h1>
        <p class="subtitle" style="font-size: 13px;">Monitor and manage your Riot Games configuration</p>
      </header>

      <!-- ═══ ACTIVE ACCOUNT (compact strip) ═══ -->
      <section class="dashboard-status-strip" aria-label="Active account status">
        <div class="dashboard-status-strip__avatar" id="strip-avatar"></div>

        <div class="dashboard-status-strip__item">
          <span class="dashboard-status-strip__label">Active Account</span>
          <span class="dashboard-status-strip__value" id="strip-account-name">Detecting…</span>
          <span class="dashboard-status-strip__level" id="strip-account-level" style="display:none;"></span>
        </div>

        <div class="dashboard-status-strip__item">
          <span class="dashboard-status-strip__label">Client Status</span>
          <span class="dashboard-status-strip__value" id="strip-client-status">
            <span class="status-badge status-badge--offline" id="strip-client-badge">Offline</span>
            <span class="dashboard-status-strip__detail" id="strip-client-detail"></span>
          </span>
        </div>

        <div class="dashboard-status-strip__item dashboard-status-strip__item--lock">
          <span class="dashboard-status-strip__label">Cloud Sync Lock</span>
          <span class="dashboard-status-strip__value" id="strip-lock">
            <span class="status-badge status-badge--offline" id="strip-lock-badge">—</span>
          </span>
        </div>

        <div class="dashboard-status-strip__action">
          <button id="btn-toggle-lock" class="btn btn--secondary btn--sm" style="display:none;">Toggle Lock</button>
        </div>

        <div class="dashboard-status-strip__files">
          <span class="dashboard-status-strip__label" style="margin-bottom: 6px;">Config Files</span>
          <div class="dashboard-status-strip__file-list" id="strip-config-files">
            <span class="text-xs text-muted">Checking…</span>
          </div>
        </div>
      </section>

      <!-- ═══ CUSTOM PROFILES (cards acima de tudo) ═══ -->
      <section class="card" style="margin-top: 18px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <h3 style="font-size: 16px; margin: 0;">🎴 Custom Profiles</h3>
          <div style="display:flex;gap:8px;">
            <button id="btn-refresh-profiles" class="btn btn--secondary btn--sm">Refresh</button>
            <button id="btn-quick-save" class="btn btn--primary btn--sm">Save Current</button>
          </div>
        </div>
        <div class="dashboard-profiles-grid" id="dashboard-profiles-grid"></div>
      </section>

      <!-- ═══ ACTIVE GAME SETTINGS ═══ -->
      <section class="card dashboard-summary-card" style="margin-top: 18px;">
        <h3 style="font-size: 16px;">⚙️ Active Game Settings</h3>
        <div id="active-settings-summary-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin-top: 16px;">
          ${summaryItem('summary-resolution', 'RESOLUTION')}
          ${summaryItem('summary-windowmode', 'WINDOW MODE')}
          ${summaryItem('summary-volume', 'MASTER VOLUME')}
          ${summaryItem('summary-language', 'CLIENT LANGUAGE')}
          ${summaryItemFiles('summary-files-status', 'CONFIG FILES STATUS')}
        </div>
      </section>

      <!-- ═══ QUICK SLOTS ═══ -->
      <section class="card dashboard-slots-section" style="margin-top: 18px;">
        <h3 style="font-size: 16px;">💾 Quick Save Slots</h3>
        <div class="dashboard-slots-grid">
          ${slotCard(1)}
          ${slotCard(2)}
        </div>
      </section>

      <!-- ═══ BACKUP TIMELINE ═══ -->
      <section class="card" style="margin-top: 18px;">
        <h3 style="font-size: 16px;">📜 Backup Timeline</h3>
        <div id="change-history-timeline" style="display: flex; flex-direction: column; gap: 10px; margin-top: 12px;">
          <p class="text-sm text-muted">Loading history...</p>
        </div>
      </section>

      <!-- ═══ QUICK ACTIONS ═══ -->
      <section class="card quick-actions" style="margin-top: 18px; margin-bottom: 0;">
        <h3 style="font-size: 16px;">⚡ Quick Actions</h3>
        <div style="display: flex; gap: 1rem; margin-top: 1rem; flex-wrap: wrap;">
          <button id="btn-optimize-fps" class="btn btn--secondary" style="color: var(--accent-cyan); border-color: var(--accent-cyan);">Optimize FPS</button>
          <button id="btn-unlock-all" class="btn btn--secondary">Unlock All Files</button>
          <button id="btn-refresh-status" class="btn btn--secondary">Refresh Status</button>
        </div>
      </section>
    </div>
  `;
}

// Tiny HTML helpers used inside the template above.

function summaryItem(id, label) {
  return `
    <div class="summary-item" style="background: rgba(255,255,255,0.03); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--glass-border); display: flex; flex-direction: column; min-width: 120px;">
      <span style="font-size: 9px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">${label}</span>
      <span id="${id}" style="font-size: 15px; font-weight: 700; color: var(--accent-cyan); font-family: monospace; margin-top: 4px; line-height: 1.2;">Loading...</span>
    </div>
  `;
}

function summaryItemFiles(id, label) {
  return `
    <div class="summary-item" style="background: rgba(255,255,255,0.03); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--glass-border); display: flex; flex-direction: column; min-width: 160px;">
      <span style="font-size: 9px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">${label}</span>
      <div id="${id}" style="font-size: 10px; margin-top: 4px; display: flex; gap: 5px; flex-wrap: wrap;">
        <span class="text-xs text-muted">Loading...</span>
      </div>
    </div>
  `;
}

function slotCard(idx) {
  return `
    <div class="dashboard-slot-card">
      <div>
        <h4 style="font-weight: 600; color: var(--accent-cyan);">Slot ${idx}</h4>
        <p class="text-sm text-muted" id="slot-${idx}-status" style="margin: 0.5rem 0 1rem 0;">Empty</p>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <button id="btn-save-slot-${idx}" class="btn btn--primary btn--sm">Save Current</button>
        <button id="btn-apply-slot-${idx}" class="btn btn--secondary btn--sm" style="display: none;">Apply</button>
      </div>
    </div>
  `;
}

// ─── mount() ─────────────────────────────────────────────────────────────────

export async function mount() {
  // Clear any prior interval (mounting twice without unmount can happen in dev).
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }

  const ddragonVersion = await fetchDdragonVersion();
  bindStaticHandlers();
  await refreshAll(ddragonVersion);
  refreshInterval = setInterval(() => refreshAll(ddragonVersion), ACTIVE_ACCOUNT_REFRESH_MS);
}

// ─── data fetchers ───────────────────────────────────────────────────────────

async function fetchDdragonVersion() {
  try {
    const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    if (!res.ok) return DD_CDN_FALLBACK;
    const versions = await res.json();
    return Array.isArray(versions) && versions.length > 0 ? versions[0] : DD_CDN_FALLBACK;
  } catch {
    return DD_CDN_FALLBACK;
  }
}

async function refreshAll(ddragonVersion) {
  await Promise.allSettled([
    refreshStatusStrip(ddragonVersion),
    refreshActiveGameSettings(),
    refreshSlots(),
    refreshProfilesGrid(ddragonVersion),
    refreshChangeHistory()
  ]);

  // Auto profile switcher / auto-backup logic — relies on the active account
  // being known, so we run it after the status strip finished.
  try {
    await runAutoProfileLogic();
  } catch (err) {
    console.warn('Auto profile switcher/backup check failed:', err);
  }
}

// ─── status strip ────────────────────────────────────────────────────────────

async function refreshStatusStrip(ddragonVersion) {
  const nameEl = document.getElementById('strip-account-name');
  const levelEl = document.getElementById('strip-account-level');
  const avatarEl = document.getElementById('strip-avatar');
  const toggleBtn = document.getElementById('btn-toggle-lock');
  if (!nameEl || !levelEl || !avatarEl) return;

  let profile = null;
  try {
    profile = await window.api.client.getCurrentSummonerProfile();
  } catch (err) {
    console.warn('Could not read active account:', err);
  }

  if (profile && profile.name) {
    nameEl.textContent = profile.name;
    nameEl.classList.remove('animate-pulse');
    const lvl = profile.summonerLevel;
    if (lvl && lvl > 0) {
      levelEl.textContent = `LVL ${lvl}`;
      levelEl.style.display = 'inline-block';
    } else {
      levelEl.style.display = 'none';
    }
    const iconId = profile.profileIconId || FALLBACK_PROFILE_ICON;
    avatarEl.innerHTML = `<img src="https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/${iconId}.png" alt="" onerror="this.style.display='none'" />`;
  } else {
    nameEl.textContent = 'Not Logged In';
    nameEl.classList.remove('animate-pulse');
    levelEl.style.display = 'none';
    avatarEl.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    `;
  }

  // Client status badge
  try {
    const isRunning = await window.api.status.isClientRunning();
    const badge = document.getElementById('strip-client-badge');
    if (badge) {
      badge.className = isRunning ? 'status-badge status-badge--online' : 'status-badge status-badge--offline';
      badge.textContent = isRunning ? 'Running' : 'Offline';
    }
    if (isRunning) {
      const procs = await window.api.status.getRunningProcesses();
      const detail = document.getElementById('strip-client-detail');
      if (detail) detail.textContent = procs.length ? procs.join(', ') : '';
    } else {
      const detail = document.getElementById('strip-client-detail');
      if (detail) detail.textContent = '';
    }
  } catch (err) {
    console.warn('client status refresh failed:', err);
  }

  // Lock badge + toggle button visibility
  try {
    const paths = await window.api.paths.resolve();
    if (paths && paths.persistedSettings) {
      const isLocked = await window.api.lock.isReadOnly(paths.persistedSettings);
      const lockBadge = document.getElementById('strip-lock-badge');
      if (lockBadge) {
        lockBadge.className = isLocked ? 'status-badge status-badge--locked' : 'status-badge status-badge--offline';
        lockBadge.textContent = isLocked ? 'Locked (Read-only)' : 'Unlocked';
      }
      if (toggleBtn) toggleBtn.style.display = 'inline-flex';
    } else if (toggleBtn) {
      toggleBtn.style.display = 'none';
    }

    // Config files list
    const listEl = document.getElementById('strip-config-files');
    if (listEl && paths) {
      listEl.innerHTML = `
        <span style="color: ${paths.gameCfg ? 'var(--accent-emerald)' : 'var(--accent-rose)'}; font-weight: 500;">game.cfg</span>
        <span style="color: var(--glass-border)">|</span>
        <span style="color: ${paths.persistedSettings ? 'var(--accent-emerald)' : 'var(--accent-rose)'}; font-weight: 500;">PersistedSettings</span>
        <span style="color: var(--glass-border)">|</span>
        <span style="color: ${paths.clientSettings ? 'var(--accent-emerald)' : 'var(--accent-rose)'}; font-weight: 500;">ClientSettings</span>
      `;
    }
  } catch (err) {
    console.warn('lock/config files refresh failed:', err);
  }
}

// ─── active game settings summary ────────────────────────────────────────────

async function refreshActiveGameSettings() {
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  try {
    const { data: gameCfg } = await window.api.lol.readGameCfg();
    const resolution = `${gameCfg?.General?.Width || '?'}x${gameCfg?.General?.Height || '?'}`;
    setText('summary-resolution', resolution);

    const fullscreen = String(gameCfg?.General?.Fullscreen || '0');
    const modeMap = { '0': 'Windowed', '1': 'Fullscreen', '2': 'Borderless' };
    setText('summary-windowmode', modeMap[fullscreen] || 'Unknown');

    const volumePct = Math.round((Number(gameCfg?.General?.MasterVolume ?? 0)) * 100);
    setText('summary-volume', `${volumePct}%`);

    const { data: clientData } = await window.api.client.read();
    const lang = clientData?.install?.globals?.locale || 'unknown';
    setText('summary-language', lang);

    const filesEl = document.getElementById('summary-files-status');
    if (filesEl) {
      const paths = await window.api.paths.resolve();
      filesEl.innerHTML = `
        <span style="color: ${paths.gameCfg ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">game.cfg</span>
        <span style="color: var(--glass-border)">|</span>
        <span style="color: ${paths.persistedSettings ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">PersistedSettings</span>
        <span style="color: var(--glass-border)">|</span>
        <span style="color: ${paths.clientSettings ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">ClientSettings</span>
      `;
    }
  } catch (err) {
    console.warn('active settings refresh failed:', err);
  }
}

// ─── quick slots ─────────────────────────────────────────────────────────────

async function refreshSlots() {
  try {
    const profiles = await window.api.profiles.list();
    for (const idx of [1, 2]) {
      const slotName = `Slot_${idx}`;
      const profile = profiles.find(p => p.name === slotName);
      const statusEl = document.getElementById(`slot-${idx}-status`);
      const applyBtn = document.getElementById(`btn-apply-slot-${idx}`);
      if (!statusEl || !applyBtn) continue;

      if (profile) {
        const d = new Date(profile.createdAt);
        statusEl.textContent = `Saved: ${!isNaN(d.getTime()) ? d.toLocaleString() : 'Yes'}`;
        applyBtn.style.display = 'inline-flex';
      } else {
        statusEl.textContent = 'Empty';
        applyBtn.style.display = 'none';
      }
    }
  } catch (err) {
    console.warn('slots refresh failed:', err);
  }
}

// ─── custom profiles grid ────────────────────────────────────────────────────

function getProfileAssets(profileName, meta, activeProfile, ddragonVersion) {
  const nameLower = (profileName || '').toLowerCase().trim();
  const activeNameLower = (activeProfile?.name || '').toLowerCase().trim();
  const metaSummonerLower = (meta?.summonerName || '').toLowerCase().trim();

  const isMatchingActive = activeProfile && activeProfile.name && (
    nameLower === activeNameLower ||
    (metaSummonerLower && metaSummonerLower === activeNameLower)
  );

  const isSynced = Boolean(meta?.profileIconId || (isMatchingActive && activeProfile?.profileIconId));

  let iconId = meta?.profileIconId || (isMatchingActive ? activeProfile?.profileIconId : null);
  let level = meta?.summonerLevel || (isMatchingActive ? activeProfile?.summonerLevel : null);

  let iconUrl;
  if (isSynced && iconId) {
    iconUrl = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion || '14.10.1'}/img/profileicon/${iconId}.png`;
  } else {
    iconUrl = 'assets/lol-profile/profile_unranked.png';
  }

  let displayLevel = isSynced && level ? level : '—';
  let splashUrl = isSynced ? (meta?.regalia?.bannerUrl || meta?.splashUrl || '') : '';

  return { iconId, level: displayLevel, iconUrl, splashUrl, isSynced };
}

async function refreshProfilesGrid(ddragonVersion) {
  const grid = document.getElementById('dashboard-profiles-grid');
  if (!grid) return;
  grid.innerHTML = '';

  let profiles = [];
  try {
    const all = await window.api.profiles.list();
    profiles = all.filter(p => p.name !== 'Slot_1' && p.name !== 'Slot_2');
  } catch (err) {
    console.warn('Failed to list profiles:', err);
  }

  if (profiles.length === 0) {
    grid.innerHTML = '<p class="text-sm text-muted" style="grid-column: 1 / -1;">No custom profiles saved yet.</p>';
    return;
  }

  let activeProfile = null;
  try {
    activeProfile = await window.api.client.getCurrentSummonerProfile();
  } catch (err) {
    console.warn('Failed to fetch active summoner for card rendering:', err);
  }

  const mappings = JSON.parse(localStorage.getItem('account-profile-mappings') || '{}');

  // Dynamic live sync: Auto-update saved profile metadata ONLY when profile name strictly equals active account name
  if (activeProfile && activeProfile.name && activeProfile.profileIconId) {
    for (const profile of profiles) {
      const isSameName = profile.name.toLowerCase().trim() === activeProfile.name.toLowerCase().trim();
      if (isSameName) {
        const meta = profile.meta || {};
        if (meta.profileIconId !== activeProfile.profileIconId || meta.summonerLevel !== activeProfile.summonerLevel) {
          meta.profileIconId = activeProfile.profileIconId;
          meta.summonerLevel = activeProfile.summonerLevel;
          meta.summonerName = activeProfile.name;
          profile.meta = meta;
          try {
            await window.api.profiles.updateProfile(profile.name, profile);
          } catch (e) {
            console.warn('Auto-sync profile meta save error:', e);
          }
        }
      }
    }
  }

  for (const profile of profiles) {
    const card = buildProfileCard(profile, mappings, ddragonVersion, activeProfile);
    grid.appendChild(card);
  }

  bindProfileCardHandlers();
}

function buildProfileCard(profile, mappings, ddragonVersion, activeProfile) {
  const card = document.createElement('div');
  card.className = 'profile-card lol-profile-card';
  card.dataset.profileName = profile.name;

  const meta = profile.meta || {};
  const d = new Date(profile.createdAt);
  const dateStr = !isNaN(d.getTime()) ? d.toLocaleString() : profile.createdAt;

  const assets = getProfileAssets(profile.name, meta, activeProfile, ddragonVersion);
  const iconUrl = assets.iconUrl;
  const level = assets.level;
  const frameUrl = assets.splashUrl;
  const frameStyle = frameUrl
    ? `background-image: linear-gradient(180deg, rgba(10,14,24,0.2) 0%, rgba(10,14,24,0.85) 100%), url('${frameUrl}');`
    : `background: linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(10,14,24,0.95) 100%);`;

  const activeSummonerName = activeProfile?.name || '';
  const isLinked = Object.entries(mappings).some(([acc, prof]) => prof === profile.name && acc === activeSummonerName);
  let boundAccount = null;
  for (const [acc, prof] of Object.entries(mappings)) {
    if (prof === profile.name) { boundAccount = acc; break; }
  }

  card.innerHTML = `
    <div class="lol-profile-card__frame" style="${frameStyle}" aria-hidden="true"></div>
    <div class="lol-profile-card__topline">
      <span class="lol-profile-card__flag" title="Brasil">🇧🇷</span>
      <span class="lol-profile-card__created">${dateStr}</span>
    </div>
    <div class="lol-profile-card__identity">
      <div class="lol-profile-card__crest-wrapper">
        <img class="lol-profile-card__moldura-img" src="assets/lol-profile/profile_emblem_hover.png" alt="" aria-hidden="true" />
        <div class="lol-profile-card__avatar">
          <img src="${iconUrl}" alt="" onerror="this.src='assets/lol-profile/profile_unranked.png'" />
        </div>
        <span class="lol-profile-card__level">${level}</span>
      </div>
      <h4 class="lol-profile-card__name">${profile.name}</h4>
      <p class="lol-profile-card__meta">Custom profile${boundAccount ? ` · Linked to ${boundAccount}` : ''}</p>
    </div>
    <div class="lol-profile-card__actions">
      ${boundAccount
        ? `<span class="lol-profile-card__linked">Linked <span class="btn-unlink-dash-profile" data-name="${profile.name}">×</span></span>`
        : `<button class="btn btn--secondary btn--sm btn-link-dash-profile" data-name="${profile.name}">Link Active</button>`}
      <button class="btn btn--primary btn--sm btn-apply-dash-profile" data-name="${profile.name}">Apply</button>
    </div>
  `;
  return card;
}

function bindProfileCardHandlers() {
  const grid = document.getElementById('dashboard-profiles-grid');
  if (!grid) return;

  grid.querySelectorAll('.btn-link-dash-profile').forEach(btn => {
    btn.addEventListener('click', async e => {
      const profileName = e.target.getAttribute('data-name');
      const activeNameEl = document.getElementById('strip-account-name');
      const activeName = activeNameEl ? activeNameEl.textContent : '';
      if (!activeName || activeName === 'Detecting…' || activeName === 'Not Logged In') {
        if (window.showToast) window.showToast('Please log into League of Legends client first!', 'error');
        return;
      }
      const current = JSON.parse(localStorage.getItem('account-profile-mappings') || '{}');
      current[activeName] = profileName;
      localStorage.setItem('account-profile-mappings', JSON.stringify(current));
      if (window.showToast) window.showToast(`Linked account "${activeName}" to profile "${profileName}"!`, 'success');
      refreshAll(DD_CDN_FALLBACK);
    });
  });

  grid.querySelectorAll('.btn-unlink-dash-profile').forEach(btn => {
    btn.addEventListener('click', e => {
      const profileName = e.target.getAttribute('data-name');
      const current = JSON.parse(localStorage.getItem('account-profile-mappings') || '{}');
      for (const [acc, prof] of Object.entries(current)) {
        if (prof === profileName) delete current[acc];
      }
      localStorage.setItem('account-profile-mappings', JSON.stringify(current));
      if (window.showToast) window.showToast('Profile unlinked successfully', 'info');
      refreshAll(DD_CDN_FALLBACK);
    });
  });

  grid.querySelectorAll('.btn-apply-dash-profile').forEach(btn => {
    btn.addEventListener('click', async e => {
      const name = e.target.getAttribute('data-name');
      try {
        const profileObj = await window.api.profiles.load(name);
        await window.api.profiles.applyAll(profileObj, { force: true });
        if (window.showToast) window.showToast(`Profile "${name}" applied instantly!`, 'success');
      } catch (err) {
        if (window.showToast) window.showToast(err.message, 'error');
      }
    });
  });
}

// ─── change history timeline ─────────────────────────────────────────────────

function refreshChangeHistory() {
  try {
    const historyList = window.api.history.list();
    const container = document.getElementById('change-history-timeline');
    if (!container) return;
    container.innerHTML = '';
    if (historyList.length === 0) {
      container.innerHTML = '<p class="text-sm text-muted" style="margin: 0;">No history states saved yet. States are saved automatically before making changes.</p>';
      return;
    }
    for (const h of historyList) {
      const d = new Date(h.timestamp);
      const dateStr = !isNaN(d.getTime()) ? `${d.toLocaleTimeString()} ${d.toLocaleDateString()}` : h.timestamp;
      const row = document.createElement('div');
      row.style.cssText = 'background: rgba(255,255,255,0.02); border: 1px solid var(--glass-border); border-radius: var(--radius-md); padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 12px;';
      row.innerHTML = `
        <div style="display: flex; flex-direction: column;">
          <span style="font-weight: 600; color: var(--accent-cyan);">${h.description}</span>
          <span style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">${dateStr}</span>
        </div>
        <button class="btn btn--secondary btn--sm btn-rollback-history" data-timestamp="${h.timestamp}" style="padding: 4px 8px; font-size: 11px;">Rollback</button>
      `;
      container.appendChild(row);
    }
    container.querySelectorAll('.btn-rollback-history').forEach(btn => {
      btn.addEventListener('click', async e => {
        const ts = e.target.getAttribute('data-timestamp');
        if (!confirm('Are you sure you want to rollback your settings to this state?')) return;
        try {
          await window.api.history.rollback(ts);
          if (window.showToast) window.showToast('Rollback successful!', 'success');
          refreshAll(DD_CDN_FALLBACK);
        } catch (err) {
          if (window.showToast) window.showToast(err.message, 'error');
        }
      });
    });
  } catch (err) {
    console.warn('history refresh failed:', err);
  }
}

// ─── auto profile switcher / auto backup ─────────────────────────────────────

async function runAutoProfileLogic() {
  const nameEl = document.getElementById('strip-account-name');
  const activeSummoner = nameEl ? nameEl.textContent : '';
  if (!activeSummoner || activeSummoner === 'Detecting…' || activeSummoner === 'Not Logged In') return;

  const switcherEnabled = localStorage.getItem('app-settings-auto-switcher') !== 'false';
  if (switcherEnabled) {
    const mappings = JSON.parse(localStorage.getItem('account-profile-mappings') || '{}');
    const boundProfileName = mappings[activeSummoner];
    if (boundProfileName) {
      const lastAutoApplied = localStorage.getItem('last-auto-applied-combination');
      const combinationKey = `${activeSummoner}:${boundProfileName}`;
      if (lastAutoApplied !== combinationKey) {
        const profileObj = await window.api.profiles.load(boundProfileName);
        await window.api.profiles.applyAll(profileObj);
        localStorage.setItem('last-auto-applied-combination', combinationKey);
        if (window.showToast) {
          window.showToast(`Auto Switcher: Applied "${boundProfileName}" for account "${activeSummoner}"!`, 'success');
        }
      }
    }
  }

  // Auto backup: if no profile for this summoner exists, create one.
  const profiles = await window.api.profiles.list();
  const matches = profiles.filter(p => {
    const nameMatches = p.name.toLowerCase() === activeSummoner.toLowerCase() ||
                        p.name.toLowerCase().startsWith(activeSummoner.toLowerCase() + '_');
    const metaMatches = p.meta && p.meta.summonerName && p.meta.summonerName.toLowerCase() === activeSummoner.toLowerCase();
    return nameMatches || metaMatches;
  });

  if (matches.length === 0) {
    const key = `autosaved-summoner-${activeSummoner}`;
    if (!localStorage.getItem(key)) {
      await window.api.profiles.quickSave(activeSummoner);
      localStorage.setItem(key, 'true');
      if (window.showToast) {
        window.showToast(`Nova conta detectada! Perfil salvo automaticamente como "${activeSummoner}"!`, 'success');
      }
    }
  } else {
    // Existing account: if newest snapshot is older than 30 days, create a dated backup.
    let latest = new Date(0);
    for (const p of matches) {
      const dt = new Date(p.createdAt);
      if (dt > latest) latest = dt;
    }
    const diffDays = (Date.now() - latest.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 30) {
      const today = new Date().toISOString().split('T')[0];
      const backupName = `${activeSummoner}_${today}`;
      await window.api.profiles.quickSave(backupName);
      if (window.showToast) {
        window.showToast(`Backup periódico (+30 dias): Nova versão salva como "${backupName}"!`, 'success');
      }
    }
  }
}

// ─── static event handlers ───────────────────────────────────────────────────

function bindStaticHandlers() {
  // Quick save slots
  for (const idx of [1, 2]) {
    document.getElementById(`btn-save-slot-${idx}`)?.addEventListener('click', async () => {
      try {
        await window.api.profiles.quickSave(`Slot_${idx}`);
        if (window.showToast) window.showToast(`Settings saved to Slot ${idx}!`, 'success');
        refreshAll(DD_CDN_FALLBACK);
      } catch (err) {
        if (window.showToast) window.showToast(err.message, 'error');
      }
    });
    document.getElementById(`btn-apply-slot-${idx}`)?.addEventListener('click', async () => {
      try {
        const profile = await window.api.profiles.load(`Slot_${idx}`);
        await window.api.profiles.applyAll(profile, { force: true });
        if (window.showToast) window.showToast(`Slot ${idx} settings applied instantly!`, 'success');
      } catch (err) {
        if (window.showToast) window.showToast(err.message, 'error');
      }
    });
  }

  document.getElementById('btn-refresh-profiles')?.addEventListener('click', () => {
    refreshAll(DD_CDN_FALLBACK);
  });

  document.getElementById('btn-optimize-fps')?.addEventListener('click', async () => {
    try {
      if (!confirm('Optimize game settings for maximum FPS and minimal latency? This will disable shadows, decrease effect quality, and cap framerate.')) return;
      await window.api.history.saveSnapshot('Before FPS Optimization');
      const patch = {
        General: { AntiAliasing: '0', ShadowsEnabled: '0', EffectsQuality: '0', EnvironmentQuality: '0', CharacterQuality: '1', PredictMovement: '1' },
        Performance: { ShadowsEnabled: '0', EffectsQuality: '0', EnvironmentQuality: '0', CharacterQuality: '1' }
      };
      await window.api.lol.updateSettings(patch);
      if (window.showToast) window.showToast('Game configurations optimized for maximum FPS!', 'success');
      refreshActiveGameSettings();
    } catch (err) {
      if (window.showToast) window.showToast(`Optimization failed: ${err.message}`, 'error');
    }
  });

  document.getElementById('btn-refresh-status')?.addEventListener('click', () => {
    refreshAll(DD_CDN_FALLBACK);
    if (window.showToast) window.showToast('Status refreshed', 'success');
  });

  document.getElementById('btn-toggle-lock')?.addEventListener('click', async () => {
    try {
      const paths = await window.api.paths.resolve();
      if (!paths || !paths.persistedSettings) throw new Error('PersistedSettings not found');
      const isLocked = await window.api.lock.isReadOnly(paths.persistedSettings);
      if (isLocked) {
        await window.api.lock.removeReadOnly(paths.persistedSettings);
        if (window.showToast) window.showToast('File unlocked', 'success');
      } else {
        await window.api.lock.setReadOnly(paths.persistedSettings);
        if (window.showToast) window.showToast('File locked', 'success');
      }
      refreshStatusStrip(DD_CDN_FALLBACK);
    } catch (err) {
      if (window.showToast) window.showToast(err.message, 'error');
    }
  });

  document.getElementById('btn-unlock-all')?.addEventListener('click', async () => {
    try {
      const paths = await window.api.paths.resolve();
      if (paths?.persistedSettings) await window.api.lock.removeReadOnly(paths.persistedSettings);
      if (paths?.gameCfg) await window.api.lock.removeReadOnly(paths.gameCfg);
      if (paths?.clientSettings) await window.api.lock.removeReadOnly(paths.clientSettings);
      if (window.showToast) window.showToast('All files unlocked', 'success');
      refreshStatusStrip(DD_CDN_FALLBACK);
    } catch (err) {
      if (window.showToast) window.showToast(err.message, 'error');
    }
  });

  document.getElementById('btn-quick-save')?.addEventListener('click', openSaveModal);
}

// ─── save modal ──────────────────────────────────────────────────────────────

async function openSaveModal() {
  let suggested = '';
  try {
    suggested = (await window.api.client.getCurrentSummonerName()) || '';
  } catch { /* fall back to empty */ }

  const overlay = document.getElementById('modal-overlay');
  const header = document.getElementById('modal-header');
  const body = document.getElementById('modal-body');
  const footer = document.getElementById('modal-footer');
  if (!overlay || !header || !body || !footer) return;

  header.innerHTML = '<h3>Save Current Profile</h3>';
  body.innerHTML = `
    <div class="form-group" style="margin-bottom: 0;">
      <label>Profile Name</label>
      <input type="text" id="prompt-profile-name" class="input-control w-full" placeholder="e.g. Pro Settings" style="max-width: 100%;" value="${suggested}" />
    </div>
  `;
  footer.innerHTML = `
    <button class="btn btn--secondary" id="prompt-cancel">Cancel</button>
    <button class="btn btn--primary" id="prompt-confirm">Save</button>
  `;

  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('modal-overlay--visible'));

  const close = () => {
    overlay.classList.remove('modal-overlay--visible');
    setTimeout(() => { overlay.style.display = 'none'; }, 200);
  };

  document.getElementById('prompt-cancel').onclick = close;
  document.getElementById('prompt-confirm').onclick = async () => {
    const name = document.getElementById('prompt-profile-name').value.trim();
    close();
    if (!name) {
      if (window.showToast) window.showToast('Profile name cannot be empty', 'error');
      return;
    }
    try {
      await window.api.profiles.quickSave(name);
      if (window.showToast) window.showToast('Profile saved successfully', 'success');
      refreshAll(DD_CDN_FALLBACK);
    } catch (err) {
      if (window.showToast) window.showToast(err.message, 'error');
    }
  };
}
