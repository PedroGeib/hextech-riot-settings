export function render() {
  return `
    <div class="page-container animate-fade-in">
      <div class="page-header flex justify-between items-center mb-6">
        <div>
          <h1 class="page-title text-cyan">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;">
              <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
            </svg>
            App Settings
          </h1>
          <p class="page-subtitle">Configure application themes, path overrides, and automation features</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Theme Selector Card -->
        <section class="card">
          <div class="card-header">
            <h3 class="card-title text-violet">LoL Regions / Themes</h3>
          </div>
          <div class="card-body">
            <p class="text-sm text-muted mb-4">Select a regional theme inspired by the League of Legends universe.</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <button class="btn btn--secondary btn--sm theme-btn" data-theme="default" style="padding: 8px; font-size: 11px;">
                Void Blue (Default)
              </button>
              <button class="btn btn--secondary btn--sm theme-btn" data-theme="hextech" style="padding: 8px; font-size: 11px;">
                Hextech (Piltover)
              </button>
              <button class="btn btn--secondary btn--sm theme-btn" data-theme="chemtech" style="padding: 8px; font-size: 11px;">
                Chemtech (Zaun)
              </button>
              <button class="btn btn--secondary btn--sm theme-btn" data-theme="void" style="padding: 8px; font-size: 11px;">
                Void Purple
              </button>
              <button class="btn btn--secondary btn--sm theme-btn" data-theme="shadowisles" style="padding: 8px; font-size: 11px;">
                Shadow Isles
              </button>
              <button class="btn btn--secondary btn--sm theme-btn" data-theme="noxus" style="padding: 8px; font-size: 11px;">
                Noxus Crimson
              </button>
              <button class="btn btn--secondary btn--sm theme-btn" data-theme="demacia" style="padding: 8px; font-size: 11px;">
                Demacia Gold
              </button>
              <button class="btn btn--secondary btn--sm theme-btn" data-theme="shurima" style="padding: 8px; font-size: 11px;">
                Shurima Desert
              </button>
              <button class="btn btn--secondary btn--sm theme-btn" data-theme="ionia" style="padding: 8px; font-size: 11px;">
                Ionia Spirit
              </button>
              <button class="btn btn--secondary btn--sm theme-btn" data-theme="freljord" style="padding: 8px; font-size: 11px;">
                Freljord Ice
              </button>
              <button class="btn btn--secondary btn--sm theme-btn" data-theme="bilgewater" style="padding: 8px; font-size: 11px; grid-column: span 2;">
                Bilgewater Serpent
              </button>
            </div>
          </div>
        </section>

        <!-- Automation & Hotkeys Card -->
        <section class="card">
          <div class="card-header">
            <h3 class="card-title text-violet">Automation & Controls</h3>
          </div>
          <div class="card-body" style="padding: 0;">
            <!-- Auto-Switcher Toggle -->
            <div class="setting-row">
              <div class="setting-label">
                <span class="setting-title">Auto-Profile Switcher</span>
                <p class="setting-desc">Auto-apply profiles when matching accounts log in.</p>
              </div>
              <input type="checkbox" id="cfg-auto-switcher" class="toggle-switch" />
            </div>

            <!-- Global Hotkeys Toggle -->
            <div class="setting-row">
              <div class="setting-label">
                <span class="setting-title">Global Hotkeys (Ctrl+Alt+1/2)</span>
                <p class="setting-desc">Apply Slot 1 or 2 instant configurations globally.</p>
              </div>
              <input type="checkbox" id="cfg-global-hotkeys" class="toggle-switch" />
            </div>

            <!-- Start with Windows -->
            <div class="setting-row">
              <div class="setting-label">
                <span class="setting-title">Launch on Startup</span>
                <p class="setting-desc">Run Hextech Riot Settings when Windows boots up.</p>
              </div>
              <input type="checkbox" id="cfg-run-startup" class="toggle-switch" />
            </div>
          </div>
        </section>
      </div>

      <!-- Path Settings Card -->
      <div class="card mt-6" style="margin-top: 24px;">
        <div class="card-header">
          <h3 class="card-title text-cyan">Riot Games Installation Path</h3>
        </div>
        <div class="card-body">
          <p class="text-sm text-muted mb-4">
            By default, RSO auto-detects your Riot Client directory. If your game is installed in a custom location, specify it below.
          </p>
          <div class="flex gap-4 items-center">
            <input type="text" id="cfg-install-path" class="input-control flex-1" placeholder="e.g. C:\\Riot Games" />
            <button id="btn-save-path" class="btn btn--primary">Save Path</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function mount() {
  // Theme management
  const applyTheme = (themeName) => {
    // Correctly strip all theme- classes
    document.body.classList.forEach(cls => {
      if (cls.startsWith('theme-')) {
        document.body.classList.remove(cls);
      }
    });

    if (themeName !== 'default' && themeName) {
      document.body.classList.add(`theme-` + themeName);
    }
    localStorage.setItem('app-theme', themeName);

    // Update active visual outline on buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
      const btnTheme = btn.getAttribute('data-theme');
      if (btnTheme === themeName) {
        btn.style.borderColor = 'var(--accent-cyan)';
        btn.style.background = 'rgba(0, 212, 255, 0.08)';
      } else {
        btn.style.borderColor = 'var(--glass-border)';
        btn.style.background = '';
      }
    });
  };

  const savedTheme = localStorage.getItem('app-theme') || 'default';
  applyTheme(savedTheme);

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const theme = e.currentTarget.getAttribute('data-theme');
      applyTheme(theme);
      if (window.showToast) window.showToast(`Theme changed to ${theme}!`, 'success');
    });
  });

  // Toggles
  const switcherCheckbox = document.getElementById('cfg-auto-switcher');
  const hotkeysCheckbox = document.getElementById('cfg-global-hotkeys');
  const startupCheckbox = document.getElementById('cfg-run-startup');

  if (switcherCheckbox) {
    const active = localStorage.getItem('app-settings-auto-switcher') !== 'false'; // default true
    switcherCheckbox.checked = active;
    switcherCheckbox.addEventListener('change', (e) => {
      localStorage.setItem('app-settings-auto-switcher', e.target.checked ? 'true' : 'false');
      if (window.showToast) window.showToast('Auto-Switcher setting updated', 'success');
    });
  }

  if (hotkeysCheckbox) {
    const active = localStorage.getItem('app-settings-global-hotkeys') !== 'false'; // default true
    hotkeysCheckbox.checked = active;
    hotkeysCheckbox.addEventListener('change', (e) => {
      localStorage.setItem('app-settings-global-hotkeys', e.target.checked ? 'true' : 'false');
      if (window.showToast) window.showToast('Global Hotkeys setting updated', 'success');
    });
  }

  if (startupCheckbox) {
    const loadStartupStatus = async () => {
      try {
        const isEnabled = await window.api.system.isAutostartEnabled();
        startupCheckbox.checked = isEnabled;
        localStorage.setItem('app-settings-startup', isEnabled ? 'true' : 'false');
      } catch (err) {
        console.warn('Could not read startup status:', err);
      }
    };
    loadStartupStatus();

    startupCheckbox.addEventListener('change', async (e) => {
      try {
        const enabled = e.target.checked;
        await window.api.system.setAutostart(enabled);
        localStorage.setItem('app-settings-startup', enabled ? 'true' : 'false');
        if (window.showToast) {
          window.showToast(enabled ? 'Inicialização automática ativada!' : 'Inicialização automática desativada!', 'success');
        }
      } catch (err) {
        if (window.showToast) window.showToast(`Erro ao alterar inicialização: ${err.message || err}`, 'error');
        startupCheckbox.checked = !e.target.checked;
      }
    });
  }

  // Path Override
  const pathInput = document.getElementById('cfg-install-path');
  const btnSavePath = document.getElementById('btn-save-path');

  const loadCurrentPath = async () => {
    try {
      const resolved = localStorage.getItem('custom-install-path') || '';
      if (pathInput) pathInput.value = resolved;
    } catch {}
  };

  loadCurrentPath();

  btnSavePath?.addEventListener('click', () => {
    if (!pathInput) return;
    const customPath = pathInput.value.trim();
    if (customPath) {
      localStorage.setItem('custom-install-path', customPath);
      if (window.showToast) window.showToast('Installation path override saved!', 'success');
    } else {
      localStorage.removeItem('custom-install-path');
      if (window.showToast) window.showToast('Reverted to default auto-detection path', 'info');
    }
  });
}
