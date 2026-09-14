export function render() {
  return `
    <div id="profiles-view" class="view-container">
      <header class="page-header">
        <h1>Profiles</h1>
        <p class="subtitle">Save, load, and apply configuration snapshots</p>
      </header>

      <section class="card mb-4">
        <h3>Save New Profile</h3>
        <div class="form-group mb-2">
          <label>Profile Name</label>
          <input type="text" id="new-profile-name" class="input-control w-full" placeholder="e.g. Optimized FPS Settings" />
        </div>
        <div class="form-group mb-4">
          <label>Targets to Include</label>
          <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
            <label><input type="checkbox" checked disabled /> game.cfg</label>
            <label><input type="checkbox" checked disabled /> PersistedSettings.json</label>
            <label><input type="checkbox" checked disabled /> LeagueClientSettings.yaml</label>
          </div>
        </div>
        <button id="btn-save-profile" class="btn btn--primary">Save Profile</button>
      </section>

      <section class="card">
        <h3>Saved Profiles</h3>
        <div id="profiles-list-container">
          <div id="profiles-empty-state" class="empty-state" style="display: none;">
            <p>No profiles saved yet.</p>
          </div>
          <div id="profiles-grid" style="display: grid; grid-template-columns: 1fr; gap: 1rem; margin-top: 1rem;">
            <!-- Profile cards go here -->
          </div>
        </div>
      </section>
    </div>
  `;
}

export function mount() {
  const loadProfiles = async () => {
    try {
      const profiles = await window.api.profiles.list();
      const grid = document.getElementById('profiles-grid');
      const emptyState = document.getElementById('profiles-empty-state');
      
      grid.innerHTML = '';
      
      if (!profiles || profiles.length === 0) {
        emptyState.style.display = 'block';
        return;
      }
      
      emptyState.style.display = 'none';

      let ddragonVersion = '14.10.1';
      try {
        const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
        const versions = await res.json();
        if (Array.isArray(versions) && versions.length > 0) {
          ddragonVersion = versions[0];
        }
      } catch (e) {
        console.warn('Failed to fetch latest DDragon version:', e);
      }

      profiles.forEach(p => {
        const d = new Date(p.createdAt);
        const dateStr = !isNaN(d.getTime()) ? d.toLocaleString() : p.createdAt;

        const card = document.createElement('div');
        card.className = 'profile-card';
        card.style.border = '1px solid #333';
        card.style.padding = '1rem';
        card.style.borderRadius = '8px';
        card.style.display = 'flex';
        card.style.justifyContent = 'space-between';
        card.style.alignItems = 'center';

        const meta = p.meta || {};
        let iconId = meta.profileIconId || 29;
        if (!meta.profileIconId && p.name === 'GaloDCalcA80kmph') {
          iconId = 6923;
        }

        card.innerHTML = `
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="none" stroke="#c89b3c" stroke-width="4.5" />
              </svg>
              <div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background: #0a1428; border: 1.5px solid #000;">
                <img src="https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/${iconId}.png" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://ddragon.leagueoflegends.com/cdn/14.10.1/img/profileicon/29.png'" />
              </div>
            </div>
            <div>
              <h4 style="margin: 0 0 0.15rem 0; font-size: 14px; font-weight: 600;">${p.name}</h4>
              <p class="text-sm text-muted" style="margin: 0; font-size: 11px;">Created: ${dateStr}${meta.summonerLevel ? ` • LVL ${meta.summonerLevel}` : ''}</p>
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn btn--secondary btn-edit-profile" data-name="${p.name}">Edit</button>
            <button class="btn btn--secondary btn-apply-profile" data-name="${p.name}">Apply</button>
            <button class="btn btn--secondary btn-delete-profile" style="color: #ff4444; border-color: #ff4444;" data-name="${p.name}">Delete</button>
          </div>
        `;

        grid.appendChild(card);
      });

      // Attach event listeners
      document.querySelectorAll('.btn-apply-profile').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const name = e.target.getAttribute('data-name');
          if (confirm(`Are you sure you want to apply the profile "${name}"? This will overwrite your current settings.`)) {
            try {
              const profileObj = await window.api.profiles.load(name);
              await window.api.profiles.applyAll(profileObj, { force: true });
              if (window.showToast) window.showToast(`Profile "${name}" applied successfully`, 'success');
            } catch (err) {
              if (window.showToast) window.showToast(err.message || err, 'error');
            }
          }
        });
      });

      document.querySelectorAll('.btn-delete-profile').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const name = e.target.getAttribute('data-name');
          if (confirm(`Are you sure you want to delete the profile "${name}"?`)) {
            try {
              await window.api.profiles.delete(name);
              if (window.showToast) window.showToast(`Profile "${name}" deleted successfully`, 'success');
              loadProfiles();
            } catch (err) {
              if (window.showToast) window.showToast(err.message || err, 'error');
            }
          }
        });
      });

      // EDIT PROFILE MODAL
      document.querySelectorAll('.btn-edit-profile').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const name = e.target.getAttribute('data-name');
          try {
            const profile = await window.api.profiles.load(name);
            openEditModal(profile);
          } catch (err) {
            if (window.showToast) window.showToast(`Error loading profile: ${err.message || err}`, 'error');
          }
        });
      });

    } catch (err) {
      console.warn('Failed to load profiles:', err);
    }
  };

  const openEditModal = (profile) => {
    const overlay = document.getElementById('modal-overlay');
    const header = document.getElementById('modal-header');
    const body = document.getElementById('modal-body');
    const footer = document.getElementById('modal-footer');

    // Make local copy of targets for temporary editing
    const editedTargets = {
      gameCfg: profile.targets.gameCfg ? JSON.parse(JSON.stringify(profile.targets.gameCfg)) : {},
      persistedSettings: profile.targets.persistedSettings ? JSON.parse(JSON.stringify(profile.targets.persistedSettings)) : {},
      clientSettings: profile.targets.clientSettings ? JSON.parse(JSON.stringify(profile.targets.clientSettings)) : {}
    };

    let activeTab = 'gameCfg';

    header.innerHTML = `<h3 style="margin:0;">Edit Profile: ${profile.name}</h3>`;

    body.innerHTML = `
      <div class="profile-edit-tabs" style="display: flex; gap: 8px; margin-bottom: 12px; border-bottom: 1px solid #333; padding-bottom: 8px;">
        <button class="btn btn--sm tab-btn active" data-tab="gameCfg" style="padding: 4px 12px;">game.cfg</button>
        <button class="btn btn--sm tab-btn" data-tab="persistedSettings" style="padding: 4px 12px;">Keybindings</button>
        <button class="btn btn--sm tab-btn" data-tab="clientSettings" style="padding: 4px 12px;">Client Settings</button>
      </div>
      <p style="font-size: 11px; margin: 0 0 8px 0; color: var(--text-secondary);">Edit settings as JSON format:</p>
      <textarea id="profile-edit-textarea" class="input-control w-full" style="height: 280px; font-family: monospace; font-size: 12px; resize: vertical; background: #070a13; color: #00d4ff; border: 1px solid #333; padding: 10px;"></textarea>
    `;

    footer.innerHTML = `
      <div style="display: flex; justify-content: space-between; width: 100%;">
        <button id="btn-restore-original" class="btn btn--secondary" style="color: #f43f5e; border-color: #f43f5e;">Restore Original</button>
        <div style="display: flex; gap: 0.5rem;">
          <button id="btn-cancel-edit" class="btn btn--secondary">Cancel</button>
          <button id="btn-save-edit" class="btn btn--primary">Save Changes</button>
        </div>
      </div>
    `;

    const textarea = document.getElementById('profile-edit-textarea');

    const updateTextarea = () => {
      textarea.value = JSON.stringify(editedTargets[activeTab], null, 2);
    };

    updateTextarea();

    // Tab switcher
    body.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Save current textarea edits first
        try {
          editedTargets[activeTab] = JSON.parse(textarea.value);
        } catch (err) {
          if (window.showToast) window.showToast(`Invalid JSON syntax in active tab. Fix it before switching.`, 'error');
          return;
        }

        body.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        activeTab = e.target.getAttribute('data-tab');
        updateTextarea();
      });
    });

    // Save handler
    document.getElementById('btn-save-edit').addEventListener('click', async () => {
      // Save active tab text
      try {
        editedTargets[activeTab] = JSON.parse(textarea.value);
      } catch (err) {
        if (window.showToast) window.showToast(`Invalid JSON syntax in active tab. Fix it before saving.`, 'error');
        return;
      }

      profile.targets = editedTargets;

      try {
        await window.api.profiles.save(profile);
        if (window.showToast) window.showToast(`Profile changes saved successfully`, 'success');
        overlay.style.display = 'none';
        loadProfiles();
      } catch (err) {
        if (window.showToast) window.showToast(`Failed to save edits: ${err.message || err}`, 'error');
      }
    });

    // Restore original handler
    document.getElementById('btn-restore-original').addEventListener('click', async () => {
      if (confirm(`Are you sure you want to restore this profile to its original configuration (at creation time)?`)) {
        try {
          await window.api.profiles.restoreOriginal(profile.name);
          if (window.showToast) window.showToast(`Profile restored to original state`, 'success');
          overlay.style.display = 'none';
          loadProfiles();
        } catch (err) {
          if (window.showToast) window.showToast(err.message || err, 'error');
        }
      }
    });

    // Cancel handler
    document.getElementById('btn-cancel-edit').addEventListener('click', () => {
      overlay.style.display = 'none';
    });

    overlay.style.display = 'flex';
  };

  document.getElementById('btn-save-profile')?.addEventListener('click', async () => {
    const input = document.getElementById('new-profile-name');
    const name = input.value.trim();
    if (!name) {
      if (window.showToast) window.showToast('Please enter a profile name', 'error');
      return;
    }

    try {
      await window.api.profiles.quickSave(name);
      if (window.showToast) window.showToast('Profile saved successfully', 'success');
      input.value = '';
      loadProfiles();
      prefillSummonerName();
    } catch (err) {
      if (window.showToast) window.showToast(err.message || err, 'error');
    }
  });

  const prefillSummonerName = async () => {
    try {
      const name = await window.api.client.getCurrentSummonerName();
      const input = document.getElementById('new-profile-name');
      if (name && input) {
        input.value = name;
      }
    } catch (err) {
      console.warn('Could not prefill summoner name:', err);
    }
  };

  loadProfiles();
  prefillSummonerName();
}
