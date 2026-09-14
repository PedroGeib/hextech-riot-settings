export function render() {
  return `
    <div class="page-container animate-fade-in">
      <div class="page-header flex justify-between items-center mb-6">
        <div>
          <h1 class="page-title text-cyan">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            League of Legends Settings
          </h1>
          <p class="page-subtitle">Configure standard settings or deep-dive into advanced options</p>
        </div>
        <button id="lol-btn-save-top" class="btn btn--primary flex items-center" style="padding: 10px 20px; font-weight: 600;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          Save & Apply
        </button>
      </div>

      <!-- Controls & Comparison Bar -->
      <div class="card mb-4">
        <div class="card-body flex flex-wrap gap-4 items-center justify-between">
          <div class="flex items-center gap-4 flex-wrap">
            <div class="flex flex-col">
              <span class="text-xs text-muted mb-1 uppercase font-semibold tracking-wider">Profile to Edit (Target)</span>
              <select id="lol-edit-profile" class="select-control" style="width: 250px; height: 38px;">
                <option value="">[Active Config] (Current Game Files)</option>
              </select>
            </div>
            <div class="flex flex-col">
              <span class="text-xs text-muted mb-1 uppercase font-semibold tracking-wider">Compare with Profile</span>
              <select id="lol-compare-profile" class="select-control" style="width: 250px; height: 38px;">
                <option value="">None (Edit Only)</option>
              </select>
            </div>
            <button id="lol-btn-sync-all" class="btn btn--secondary flex items-center" style="display: none; height: 38px; margin-top: 18px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M17 2.1l4 4-4 4M3 22v-6h6M21 2v6h-6M7 21.9l-4-4 4-4"/></svg>
              Sync All Differences
            </button>
          </div>
        </div>
      </div>

      <!-- ─── STANDARD SETTINGS SECTION ─── -->
      <div id="lol-standard-settings">
        <!-- Keyboard Mapper Card -->
        <div class="card mb-4">
          <div class="card-header">
            <h3 class="card-title text-violet">Interactive Keymapper</h3>
          </div>
          <div class="card-body">
            <p class="text-sm text-muted mb-4">Click a key to view its binding and rebind it dynamically.</p>
            
            <div class="visual-keyboard" style="display: flex; flex-direction: column; gap: 6px; width: 100%; max-width: 480px; margin: 0 auto; background: rgba(0,0,0,0.2); padding: 12px; border-radius: var(--radius-lg); border: 1px solid var(--glass-border);">
              <!-- Row 1: 1-7 -->
              <div style="display: flex; gap: 6px; justify-content: center;">
                <button class="kbd-key btn" data-key="1" style="width: 36px; height: 36px; padding: 0; font-family: monospace; font-size: 13px;">1</button>
                <button class="kbd-key btn" data-key="2" style="width: 36px; height: 36px; padding: 0; font-family: monospace; font-size: 13px;">2</button>
                <button class="kbd-key btn" data-key="3" style="width: 36px; height: 36px; padding: 0; font-family: monospace; font-size: 13px;">3</button>
                <button class="kbd-key btn" data-key="4" style="width: 36px; height: 36px; padding: 0; font-family: monospace; font-size: 13px;">4</button>
                <button class="kbd-key btn" data-key="5" style="width: 36px; height: 36px; padding: 0; font-family: monospace; font-size: 13px;">5</button>
                <button class="kbd-key btn" data-key="6" style="width: 36px; height: 36px; padding: 0; font-family: monospace; font-size: 13px;">6</button>
                <button class="kbd-key btn" data-key="7" style="width: 36px; height: 36px; padding: 0; font-family: monospace; font-size: 13px;">7</button>
              </div>
              <!-- Row 2: QWER -->
              <div style="display: flex; gap: 6px; justify-content: center;">
                <button class="kbd-key btn" data-key="Q" style="width: 36px; height: 36px; padding: 0; font-family: monospace; font-size: 13px; font-weight: 600; color: var(--accent-cyan); border-color: var(--accent-cyan);">Q</button>
                <button class="kbd-key btn" data-key="W" style="width: 36px; height: 36px; padding: 0; font-family: monospace; font-size: 13px; font-weight: 600; color: var(--accent-cyan); border-color: var(--accent-cyan);">W</button>
                <button class="kbd-key btn" data-key="E" style="width: 36px; height: 36px; padding: 0; font-family: monospace; font-size: 13px; font-weight: 600; color: var(--accent-cyan); border-color: var(--accent-cyan);">E</button>
                <button class="kbd-key btn" data-key="R" style="width: 36px; height: 36px; padding: 0; font-family: monospace; font-size: 13px; font-weight: 600; color: var(--accent-cyan); border-color: var(--accent-cyan);">R</button>
              </div>
              <!-- Row 3: ASDF -->
              <div style="display: flex; gap: 6px; justify-content: center;">
                <button class="kbd-key btn" data-key="A" style="width: 36px; height: 36px; padding: 0; font-family: monospace; font-size: 13px;">A</button>
                <button class="kbd-key btn" data-key="S" style="width: 36px; height: 36px; padding: 0; font-family: monospace; font-size: 13px;">S</button>
                <button class="kbd-key btn" data-key="D" style="width: 36px; height: 36px; padding: 0; font-family: monospace; font-size: 13px; font-weight: 600; color: var(--accent-cyan); border-color: var(--accent-cyan);">D</button>
                <button class="kbd-key btn" data-key="F" style="width: 36px; height: 36px; padding: 0; font-family: monospace; font-size: 13px; font-weight: 600; color: var(--accent-cyan); border-color: var(--accent-cyan);">F</button>
              </div>
              <!-- Row 4: Space -->
              <div style="display: flex; gap: 6px; justify-content: center;">
                <button class="kbd-key btn" data-key="Space" style="width: 120px; height: 36px; padding: 0; font-family: monospace; font-size: 11px;">Space</button>
              </div>
            </div>

            <!-- Key Info Box -->
            <div id="keymapper-info-box" style="margin-top: 16px; background: rgba(255,255,255,0.02); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--glass-border); display: none; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div>
                <span style="color: var(--text-muted); font-size: 11px;">Selected Key:</span>
                <kbd id="keymapper-selected-key" style="background: var(--bg-tertiary); color: var(--accent-cyan); padding: 3px 8px; border-radius: 4px; font-family: monospace; font-weight: bold; margin-left: 4px; border: 1px solid var(--glass-border);"></kbd>
                <span style="color: var(--text-muted); font-size: 11px; margin-left: 12px;">Bound To:</span>
                <span id="keymapper-bound-action" class="font-semibold text-emerald" style="margin-left: 4px;"></span>
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <select id="keymapper-action-select" class="select-control" style="height: 32px; font-size: 12px; width: 180px;"></select>
                <button id="btn-keymapper-rebind" class="btn btn--primary btn--sm" style="padding: 4px 10px; font-size: 11px; height: 32px;">Rebind</button>
              </div>
            </div>
          </div>
        </div>
        <!-- Video Card -->
        <div class="card mb-4" id="lol-card-video">
          <div class="card-header">
            <h3 class="card-title text-violet">Video & Display</h3>
          </div>
          <div class="card-body" style="padding: 0;">
            <!-- Resolution row -->
            <div class="setting-row" id="row-lol-res">
              <div class="setting-label">
                <span class="setting-title">Screen Resolution</span>
                <p class="setting-desc">Set width and height of the game window.</p>
              </div>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2">
                  <input type="number" id="lol-res-width" class="input-control" style="width: 90px; text-align: center;" placeholder="Width" />
                  <span class="text-muted">x</span>
                  <input type="number" id="lol-res-height" class="input-control" style="width: 90px; text-align: center;" placeholder="Height" />
                </div>
                <div class="std-compare-badge" data-key="gameCfg.General.Width"></div>
              </div>
            </div>

            <!-- Window Mode row -->
            <div class="setting-row" id="row-lol-mode">
              <div class="setting-label">
                <span class="setting-title">Window Mode</span>
                <p class="setting-desc">Toggle Fullscreen, Borderless, or Windowed mode.</p>
              </div>
              <div class="flex items-center gap-4">
                <select id="lol-window-mode" class="select-control" style="width: 150px;">
                  <option value="0">Fullscreen</option>
                  <option value="1">Windowed</option>
                  <option value="2">Borderless</option>
                </select>
                <div class="std-compare-badge" data-key="gameCfg.General.WindowMode"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Audio Card -->
        <div class="card mb-4" id="lol-card-audio">
          <div class="card-header">
            <h3 class="card-title text-violet">Audio & Sound</h3>
          </div>
          <div class="card-body" style="padding: 0;">
            <!-- Master Volume -->
            <div class="setting-row" id="row-lol-master-vol">
              <div class="setting-label">
                <span class="setting-title">Master Volume</span>
                <p class="setting-desc">Adjust the overall volume of all game sounds.</p>
              </div>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2" style="width: 200px;">
                  <input type="range" id="lol-master-vol" class="slider-control flex-1" min="0" max="100" />
                  <span id="lol-master-vol-val" class="font-mono text-xs text-cyan" style="width: 25px; text-align: right;">50</span>
                </div>
                <div class="std-compare-badge" data-key="gameCfg.Volume.MasterVolume"></div>
              </div>
            </div>

            <!-- Music Volume -->
            <div class="setting-row" id="row-lol-music-vol">
              <div class="setting-label">
                <span class="setting-title">Music Volume</span>
                <p class="setting-desc">Set background game music volume.</p>
              </div>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2" style="width: 200px;">
                  <input type="range" id="lol-music-vol" class="slider-control flex-1" min="0" max="100" />
                  <span id="lol-music-vol-val" class="font-mono text-xs text-cyan" style="width: 25px; text-align: right;">50</span>
                </div>
                <div class="std-compare-badge" data-key="gameCfg.Volume.MusicVolume"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- HUD Card -->
        <div class="card mb-4" id="lol-card-hud">
          <div class="card-header">
            <h3 class="card-title text-violet">Interface & HUD</h3>
          </div>
          <div class="card-body" style="padding: 0;">
            <!-- Minimap Scale -->
            <div class="setting-row" id="row-lol-minimap-scale">
              <div class="setting-label">
                <span class="setting-title">Minimap Scale</span>
                <p class="setting-desc">Scale the in-game radar HUD.</p>
              </div>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2" style="width: 200px;">
                  <input type="range" id="lol-minimap-scale" class="slider-control flex-1" min="0.5" max="3.0" step="0.1" />
                  <span id="lol-minimap-scale-val" class="font-mono text-xs text-cyan" style="width: 25px; text-align: right;">1.0</span>
                </div>
                <div class="std-compare-badge" data-key="gameCfg.HUD.MinimapScale"></div>
              </div>
            </div>

            <!-- Flip Minimap -->
            <div class="setting-row" id="row-lol-flip-minimap">
              <div class="setting-label">
                <span class="setting-title">Flip Minimap position</span>
                <p class="setting-desc">Move the minimap to the bottom-left corner of the screen.</p>
              </div>
              <div class="flex items-center gap-4">
                <input type="checkbox" id="lol-flip-minimap" class="toggle-switch" />
                <div class="std-compare-badge" data-key="gameCfg.HUD.FlipMiniMap"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── ADVANCED/ADDITIONAL SETTINGS SECTION ─── -->
      <div class="card mb-4">
        <div class="card-header">
          <h2 class="card-title text-cyan">Advanced & Additional Settings</h2>
        </div>
        <div class="card-body py-2">
          <div class="flex flex-col mb-4">
            <span class="text-xs text-muted mb-1 uppercase font-semibold tracking-wider">Search Advanced Options</span>
            <input type="text" id="lol-settings-search" class="input-control" placeholder="Search setting keys (e.g. GraphicQuality, ChatScale)..." style="height: 38px;" />
          </div>
        </div>
      </div>

      <!-- Dynamic Advanced Options -->
      <div id="lol-settings-container" class="flex flex-col gap-6">
        <!-- Advanced Settings injected dynamically -->
      </div>

      <!-- Footer Bar -->
      <div class="card" style="margin-top: 24px;">
        <div class="card-body flex justify-between items-center py-4">
          <div class="text-sm text-muted">
            League of Legends Config Folder
          </div>
          <button id="lol-btn-save" class="btn btn--primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            Save & Apply Settings
          </button>
        </div>
      </div>
    </div>
  `;
}

export function mount() {
  const editSelect = document.getElementById('lol-edit-profile');
  const compareSelect = document.getElementById('lol-compare-profile');
  const btnSyncAll = document.getElementById('lol-btn-sync-all');
  const searchInput = document.getElementById('lol-settings-search');
  const container = document.getElementById('lol-settings-container');
  const btnSave = document.getElementById('lol-btn-save');
  const btnSaveTop = document.getElementById('lol-btn-save-top');

  // Standard input DOM elements
  const resWidth = document.getElementById('lol-res-width');
  const resHeight = document.getElementById('lol-res-height');
  const windowMode = document.getElementById('lol-window-mode');
  const masterVol = document.getElementById('lol-master-vol');
  const masterVolVal = document.getElementById('lol-master-vol-val');
  const musicVol = document.getElementById('lol-music-vol');
  const musicVolVal = document.getElementById('lol-music-vol-val');
  const minimapScale = document.getElementById('lol-minimap-scale');
  const minimapScaleVal = document.getElementById('lol-minimap-scale-val');
  const flipMinimap = document.getElementById('lol-flip-minimap');

  if (!compareSelect || !btnSyncAll || !searchInput || !container || !btnSave || !btnSaveTop) return;

  // Active configurations in memory
  let activeIni = {};
  let activeJson = {};

  // Comparison profile in memory
  let compareProfile = null;

  // Flat maps
  let activeFlat = {};
  let compareFlat = {};

  // List of standard keys to exclude from the dynamic Advanced Settings display
  const STANDARD_KEYS = new Set([
    'gameCfg.General.Width',
    'gameCfg.General.Height',
    'gameCfg.General.WindowMode',
    'gameCfg.Volume.MasterVolume',
    'gameCfg.Volume.MusicVolume',
    'gameCfg.HUD.MinimapScale',
    'gameCfg.HUD.FlipMiniMap'
  ]);

  const loadProfilesDropdown = async () => {
    try {
      const list = await window.api.profiles.list();
      
      const curEditVal = editSelect.value;
      editSelect.innerHTML = '<option value="">[Active Config] (Current Game Files)</option>';
      list.forEach(p => {
        editSelect.insertAdjacentHTML('beforeend', `<option value="${p.name}">${p.name}</option>`);
      });
      editSelect.value = curEditVal;

      const curCompareVal = compareSelect.value;
      compareSelect.innerHTML = '<option value="">None (Edit Only)</option>';
      list.forEach(p => {
        compareSelect.insertAdjacentHTML('beforeend', `<option value="${p.name}">${p.name}</option>`);
      });
      compareSelect.value = curCompareVal;
    } catch (err) {
      console.warn('Failed to load profiles:', err);
    }
  };

  const syncSlider = (slider, valDisplay) => {
    if (slider && valDisplay) {
      slider.addEventListener('input', (e) => {
        valDisplay.textContent = e.target.value;
      });
    }
  };

  syncSlider(masterVol, masterVolVal);
  syncSlider(musicVol, musicVolVal);
  syncSlider(minimapScale, minimapScaleVal);

  const loadActiveConfigs = async () => {
    try {
      container.innerHTML = '<div class="skeleton skeleton--card" style="height: 150px;"></div>';
      
      const targetName = editSelect.value;
      if (!targetName) {
        const iniRes = await window.api.lol.readGameCfg();
        activeIni = iniRes.data || {};
        const jsonRes = await window.api.lol.readKeybindings();
        activeJson = jsonRes.data || {};
      } else {
        const profileObj = await window.api.profiles.load(targetName);
        activeIni = profileObj.targets.gameCfg || {};
        activeJson = profileObj.targets.persistedSettings || {};
      }

      buildFlatMaps();
      bindStandardControls();
      renderAdvancedSettings();

      // Update save button text based on edit target
      if (btnSave) {
        if (targetName) {
          btnSave.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            Save Profile Changes
          `;
        } else {
          btnSave.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            Save & Apply Settings
          `;
        }
      }
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><h3>Config File Error</h3><p>${err.message}</p></div>`;
    }
  };

  const mapSettingToDisplayName = (name) => {
    const mappings = {
      evtCastSpell1: "Cast Spell 1 (Q)",
      evtCastSpell2: "Cast Spell 2 (W)",
      evtCastSpell3: "Cast Spell 3 (E)",
      evtCastSpell4: "Cast Spell 4 (R)",
      evtCastAvatarSpell1: "Summoner Spell 1 (D)",
      evtCastAvatarSpell2: "Summoner Spell 2 (F)",
      evtUseItem1: "Use Item 1",
      evtUseItem2: "Use Item 2",
      evtUseItem3: "Use Item 3",
      evtUseItem4: "Use Item 4",
      evtUseItem5: "Use Item 5",
      evtUseItem6: "Use Item 6",
      evtUseVisionItem: "Use Ward (7)",
      evtCameraCenter: "Center Camera",
      evtPlayerStopPosition: "Stop Action (S)",
      evtPlayerAttackMove: "Attack Move (A)",
    };
    return mappings[name] || name;
  };

  const getBindingForKey = (keyName) => {
    const queryVal = `[${keyName.toLowerCase()}]`;
    const files = activeJson.files || [];
    for (const f of files) {
      const sections = f.sections || [];
      for (const sec of sections) {
        const settings = sec.settings || [];
        for (const setting of settings) {
          if (String(setting.value).toLowerCase() === queryVal) {
            return {
              fileName: f.name,
              sectionName: sec.name,
              settingName: setting.name,
              displayName: mapSettingToDisplayName(setting.name)
            };
          }
        }
      }
    }
    return null;
  };

  const populateActionSelect = () => {
    const select = document.getElementById('keymapper-action-select');
    if (!select) return;
    select.innerHTML = `
      <option value="evtCastSpell1">Cast Spell 1 (Q)</option>
      <option value="evtCastSpell2">Cast Spell 2 (W)</option>
      <option value="evtCastSpell3">Cast Spell 3 (E)</option>
      <option value="evtCastSpell4">Cast Spell 4 (R)</option>
      <option value="evtCastAvatarSpell1">Summoner Spell 1 (D)</option>
      <option value="evtCastAvatarSpell2">Summoner Spell 2 (F)</option>
      <option value="evtUseItem1">Use Item 1</option>
      <option value="evtUseItem2">Use Item 2</option>
      <option value="evtUseItem3">Use Item 3</option>
      <option value="evtUseItem4">Use Item 4</option>
      <option value="evtUseItem5">Use Item 5</option>
      <option value="evtUseItem6">Use Item 6</option>
      <option value="evtUseVisionItem">Use Ward (7)</option>
      <option value="evtCameraCenter">Center Camera</option>
      <option value="evtPlayerStopPosition">Stop Action (S)</option>
      <option value="evtPlayerAttackMove">Attack Move (A)</option>
    `;
  };

  let selectedKeyName = null;

  const initKeymapper = () => {
    populateActionSelect();

    document.querySelectorAll('.kbd-key').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.kbd-key').forEach(b => {
          b.style.borderColor = '';
          b.style.background = '';
        });
        e.target.style.borderColor = 'var(--accent-cyan)';
        e.target.style.background = 'rgba(0, 212, 255, 0.05)';

        const key = e.target.getAttribute('data-key');
        selectedKeyName = key;

        const infoBox = document.getElementById('keymapper-info-box');
        const selectedKeyEl = document.getElementById('keymapper-selected-key');
        const boundActionEl = document.getElementById('keymapper-bound-action');
        const select = document.getElementById('keymapper-action-select');

        if (infoBox && selectedKeyEl && boundActionEl && select) {
          selectedKeyEl.textContent = key;
          const binding = getBindingForKey(key);
          if (binding) {
            boundActionEl.textContent = binding.displayName;
            boundActionEl.className = 'font-semibold text-emerald';
            select.value = binding.settingName;
          } else {
            boundActionEl.textContent = 'None (Unbound)';
            boundActionEl.className = 'font-semibold text-muted';
          }
          infoBox.style.display = 'flex';
        }
      });
    });

    document.getElementById('btn-keymapper-rebind')?.addEventListener('click', () => {
      if (!selectedKeyName) return;
      const select = document.getElementById('keymapper-action-select');
      const actionName = select.value;

      const files = activeJson.files || [];
      for (const f of files) {
        for (const sec of f.sections || []) {
          for (const setting of sec.settings || []) {
            if (String(setting.value).toLowerCase() === `[${selectedKeyName.toLowerCase()}]`) {
              setting.value = '';
            }
          }
        }
      }

      let bound = false;
      for (const f of files) {
        if (f.name === 'input.ini') {
          for (const sec of f.sections || []) {
            if (sec.name === 'Input') {
              let setting = sec.settings.find(s => s.name === actionName);
              if (!setting) {
                setting = { name: actionName, value: '' };
                sec.settings.push(setting);
              }
              setting.value = `[${selectedKeyName.toLowerCase()}]`;
              bound = true;
              break;
            }
          }
        }
      }

      if (bound) {
        buildFlatMaps();
        renderSettings();
        if (window.showToast) window.showToast(`Bound key "${selectedKeyName}" to "${mapSettingToDisplayName(actionName)}"!`, 'success');
        const activeKeyBtn = document.querySelector(`.kbd-key[data-key="${selectedKeyName}"]`);
        if (activeKeyBtn) activeKeyBtn.click();
      } else {
        if (window.showToast) window.showToast(`Failed to bind key: input.ini not found`, 'error');
      }
    });
  };

  const bindStandardControls = () => {
    if (activeIni.General) {
      resWidth.value = activeIni.General.Width || '';
      resHeight.value = activeIni.General.Height || '';
      windowMode.value = activeIni.General.WindowMode !== undefined ? activeIni.General.WindowMode : '1';
    }
    if (activeIni.Volume) {
      const mv = activeIni.Volume.MasterVolume !== undefined ? Math.round(parseFloat(activeIni.Volume.MasterVolume) * 100) : 50;
      masterVol.value = mv;
      masterVolVal.textContent = mv;

      const muv = activeIni.Volume.MusicVolume !== undefined ? Math.round(parseFloat(activeIni.Volume.MusicVolume) * 100) : 50;
      musicVol.value = muv;
      musicVolVal.textContent = muv;
    }
    if (activeIni.HUD) {
      const ms = activeIni.HUD.MinimapScale !== undefined ? parseFloat(activeIni.HUD.MinimapScale) : 1.0;
      minimapScale.value = ms;
      minimapScaleVal.textContent = ms.toFixed(1);

      flipMinimap.checked = activeIni.HUD.FlipMiniMap === '1' || activeIni.HUD.FlipMiniMap === 1;
    }
  };

  const updateStandardLocalState = () => {
    if (!activeIni.General) activeIni.General = {};
    if (!activeIni.Volume) activeIni.Volume = {};
    if (!activeIni.HUD) activeIni.HUD = {};

    activeIni.General.Width = String(resWidth.value);
    activeIni.General.Height = String(resHeight.value);
    activeIni.General.WindowMode = String(windowMode.value);
    activeIni.Volume.MasterVolume = String((parseInt(masterVol.value) / 100).toFixed(4));
    activeIni.Volume.MusicVolume = String((parseInt(musicVol.value) / 100).toFixed(4));
    activeIni.HUD.MinimapScale = String(parseFloat(minimapScale.value).toFixed(4));
    activeIni.HUD.FlipMiniMap = flipMinimap.checked ? '1' : '0';
  };

  const buildFlatMaps = () => {
    activeFlat = {};

    // Flatten INI
    for (const [section, keys] of Object.entries(activeIni)) {
      if (section.startsWith('TFT') || section.includes('Cherry') || section.includes('Strawberry')) continue;
      for (const [k, v] of Object.entries(keys)) {
        activeFlat[`gameCfg.${section}.${k}`] = v;
      }
    }

    // Flatten JSON
    const files = activeJson.files || [];
    for (const f of files) {
      if (f.name.startsWith('TFT')) continue;
      const sections = f.sections || [];
      for (const sec of sections) {
        if (sec.name.startsWith('TFT')) continue;
        const settings = sec.settings || [];
        for (const setting of settings) {
          activeFlat[`persisted.${f.name}.${sec.name}.${setting.name}`] = setting.value;
        }
      }
    }

    // Flatten Compare Profile
    compareFlat = {};
    if (compareProfile && compareProfile.targets) {
      const targets = compareProfile.targets;

      if (targets.gameCfg) {
        for (const [section, keys] of Object.entries(targets.gameCfg)) {
          if (section.startsWith('TFT') || section.includes('Cherry')) continue;
          for (const [k, v] of Object.entries(keys)) {
            compareFlat[`gameCfg.${section}.${k}`] = v;
          }
        }
      }

      if (targets.persistedSettings) {
        const files = targets.persistedSettings.files || [];
        for (const f of files) {
          if (f.name.startsWith('TFT')) continue;
          const sections = f.sections || [];
          for (const sec of sections) {
            if (sec.name.startsWith('TFT')) continue;
            const settings = sec.settings || [];
            for (const setting of settings) {
              compareFlat[`persisted.${f.name}.${sec.name}.${setting.name}`] = setting.value;
            }
          }
        }
      }
    }
  };

  const renderStandardCompareBadges = () => {
    let diffCount = 0;

    document.querySelectorAll('.std-compare-badge').forEach(badgeEl => {
      const key = badgeEl.getAttribute('data-key');
      let activeVal = activeFlat[key];

      // Format comparisons properly (e.g. Volumes need rounding, boolean check)
      if (key.includes('Volume')) {
        activeVal = String(Math.round(parseFloat(activeVal) * 100));
      } else if (key.includes('Scale')) {
        activeVal = String(parseFloat(activeVal).toFixed(1));
      }

      const rawCompareVal = compareFlat[key];
      let compareVal = rawCompareVal;

      if (compareVal !== undefined) {
        if (key.includes('Volume')) {
          compareVal = String(Math.round(parseFloat(compareVal) * 100));
        } else if (key.includes('Scale')) {
          compareVal = String(parseFloat(compareVal).toFixed(1));
        }

        const isDifferent = String(activeVal) !== String(compareVal);
        if (isDifferent) diffCount++;

        // Add class to parent row
        const row = badgeEl.closest('.setting-row');
        if (row) {
          row.classList.toggle('setting-row--diff', isDifferent);
        }

        const displayCompareVal = compareVal === '1' ? 'ON' : (compareVal === '0' ? 'OFF' : compareVal);

        badgeEl.innerHTML = `
          <div class="comparison-badge flex items-center gap-2" style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); padding: 4px 10px; border-radius: var(--radius-sm);">
            <span class="text-xs text-muted" style="font-size: 10px; text-transform: uppercase;">Profile:</span>
            <span class="font-mono text-xs ${isDifferent ? 'text-amber font-semibold' : 'text-emerald'}">${displayCompareVal}</span>
            ${isDifferent ? `
              <button class="btn btn--secondary btn--sm btn-copy-std-compare" data-key="${key}" data-val="${rawCompareVal}" title="Copy to Active" style="padding: 2px 6px; font-size: 10px; margin-left: 4px;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </button>
            ` : ''}
          </div>
        `;
      } else {
        badgeEl.innerHTML = '';
        const row = badgeEl.closest('.setting-row');
        if (row) row.classList.remove('setting-row--diff');
      }
    });

    // Setup standard copy actions
    document.querySelectorAll('.btn-copy-std-compare').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.btn-copy-std-compare');
        const key = targetBtn.getAttribute('data-key');
        const val = targetBtn.getAttribute('data-val');

        updateLocalConfigValue(key, val);
        buildFlatMaps();
        bindStandardControls();
        renderSettings();
      });
    });

    return diffCount;
  };

  const parseFlatKey = (flatKey) => {
    const parts = flatKey.split('.');
    const source = parts[0];
    
    if (source === 'gameCfg') {
      return {
        source,
        fileName: 'game.cfg',
        sectionName: parts[1] || '',
        keyName: parts[2] || ''
      };
    } else if (source === 'persisted') {
      const ext = parts[2];
      if (ext === 'cfg' || ext === 'json' || ext === 'yaml') {
        return {
          source,
          fileName: `${parts[1]}.${ext}`,
          sectionName: parts[3] || '',
          keyName: parts[4] || ''
        };
      } else {
        return {
          source,
          fileName: parts[1] || '',
          sectionName: parts[2] || '',
          keyName: parts[3] || ''
        };
      }
    }
    return null;
  };

  const renderAdvancedSettings = () => {
    container.innerHTML = '';

    // Group active keys by UI Category
    const categories = {
      'Advanced Interface & HUD': {},
      'Advanced Keybindings & Inputs': {},
      'Advanced Audio & Sound': {},
      'Advanced Graphics & Engine': {},
      'Additional Settings': {},
    };

    for (const [flatKey, value] of Object.entries(activeFlat)) {
      if (STANDARD_KEYS.has(flatKey)) continue;

      const info = parseFlatKey(flatKey);
      if (!info) continue;

      const source = info.source;
      const keyName = info.keyName;
      const sectionName = info.sectionName;
      const fileName = info.fileName;

      let category = 'Additional Settings';

      if (source === 'gameCfg') {
        if (sectionName === 'General' || sectionName === 'Performance' || sectionName === 'ColorPalette') {
          category = 'Advanced Graphics & Engine';
        } else if (sectionName === 'Volume') {
          category = 'Advanced Audio & Sound';
        } else if (sectionName === 'HUD' || sectionName === 'Chat' || sectionName === 'LossOfControl' || sectionName === 'ItemShop' || sectionName === 'FloatingText') {
          category = 'Advanced Interface & HUD';
        }
      } else if (source === 'persisted') {
        category = 'Advanced Keybindings & Inputs';
      }

      const displaySectionName = source === 'persisted' ? `${fileName} > ${sectionName}` : sectionName;

      if (!categories[category][displaySectionName]) {
        categories[category][displaySectionName] = [];
      }
      categories[category][displaySectionName].push({ keyName, flatKey, value });
    }

    let advancedDiffCount = 0;

    for (const [catName, sections] of Object.entries(categories)) {
      const sectionKeys = Object.keys(sections);
      if (sectionKeys.length === 0) continue;

      let sectionCardsHtml = '';

      for (const sectionName of sectionKeys.sort()) {
        const settings = sections[sectionName];
        settings.sort((a, b) => a.keyName.localeCompare(b.keyName));

        let rowsHtml = '';
        for (const item of settings) {
          const flatKey = item.flatKey;
          const activeVal = item.value;
          
          const compareVal = compareFlat[flatKey];
          const isComparing = compareProfile !== null && compareVal !== undefined;
          const isDifferent = isComparing && String(activeVal) !== String(compareVal);

          if (isDifferent) advancedDiffCount++;

          const isBool = activeVal === '0' || activeVal === '1' || activeVal === 0 || activeVal === 1 || activeVal === 'true' || activeVal === 'false' || typeof activeVal === 'boolean';
          const isNumber = !isNaN(activeVal) && activeVal !== '' && !isBool;
          const cleanValue = isBool ? (activeVal === '1' || activeVal === 1 || activeVal === 'true' || activeVal === true) : activeVal;

          let controlHtml = '';
          if (isBool) {
            // FIXED toggle switch rendering to match index.css class requirements
            controlHtml = `
              <input type="checkbox" class="toggle-switch setting-input-field" data-type="boolean" data-key="${flatKey}" ${cleanValue ? 'checked' : ''} />
            `;
          } else if (isNumber) {
            controlHtml = `
              <input type="number" class="input-control setting-input-field" data-type="number" data-key="${flatKey}" value="${activeVal}" style="width: 100px; text-align: right;" step="any" />
            `;
          } else {
            controlHtml = `
              <input type="text" class="input-control setting-input-field" data-type="string" data-key="${flatKey}" value="${activeVal || ''}" style="width: 250px;" />
            `;
          }

          let compareHtml = '';
          if (isComparing) {
            const displayCompareVal = compareVal === '1' ? 'ON' : (compareVal === '0' ? 'OFF' : compareVal);
            compareHtml = `
              <div class="comparison-badge flex items-center gap-2" style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); padding: 4px 10px; border-radius: var(--radius-sm);">
                <span class="text-xs text-muted" style="font-size: 10px; text-transform: uppercase;">Profile:</span>
                <span class="font-mono text-xs ${isDifferent ? 'text-amber font-semibold' : 'text-emerald'}">${displayCompareVal}</span>
                ${isDifferent ? `
                  <button class="btn btn--secondary btn--sm btn-copy-compare" data-key="${flatKey}" data-val="${compareVal}" title="Copy to Active" style="padding: 2px 6px; font-size: 10px; margin-left: 4px;">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  </button>
                ` : ''}
              </div>
            `;
          }

          rowsHtml += `
            <div class="setting-row lol-setting-item-row ${isDifferent ? 'setting-row--diff' : ''}" data-key-name="${item.keyName.toLowerCase()}" style="height: auto; min-height: 48px; padding: 10px 0;">
              <div class="setting-label" style="flex: 1;">
                <span class="setting-title" style="font-family: monospace; font-size: 13px;">${item.keyName}</span>
                <span class="text-xs text-muted" style="font-size: 10px; font-family: monospace; opacity: 0.7;">${sectionName}</span>
              </div>
              <div class="flex items-center gap-4">
                ${controlHtml}
                ${compareHtml}
              </div>
            </div>
          `;
        }

        sectionCardsHtml += `
          <div class="card mb-4 lol-section-card" data-section-name="${sectionName.toLowerCase()}" style="margin-bottom: 16px;">
            <div class="card-header py-2" style="border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 12px;">
              <h4 class="card-title text-violet" style="font-size: 14px;">${sectionName}</h4>
            </div>
            <div class="card-body" style="padding: 0;">
              ${rowsHtml}
            </div>
          </div>
        `;
      }

      const categoryBlock = `
        <div class="lol-category-block" data-category-name="${catName.toLowerCase()}">
          <h3 class="section-title text-cyan" style="font-size: 15px; margin-bottom: 12px; margin-top: 8px; border-bottom: 1px solid rgba(0, 212, 255, 0.15); padding-bottom: 6px;">${catName}</h3>
          ${sectionCardsHtml}
        </div>
      `;
      container.insertAdjacentHTML('beforeend', categoryBlock);
    }

    // Bind event listeners to input changes
    document.querySelectorAll('#lol-settings-container .setting-input-field').forEach(input => {
      input.addEventListener('change', (e) => {
        const field = e.target;
        const flatKey = field.getAttribute('data-key');
        const type = field.getAttribute('data-type');

        let val;
        if (type === 'boolean') {
          val = field.checked ? '1' : '0';
        } else {
          val = String(field.value);
        }

        updateLocalConfigValue(flatKey, val);
        buildFlatMaps();
        renderSettings();
      });
    });

    // Bind copy comparison buttons
    document.querySelectorAll('.btn-copy-compare').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.btn-copy-compare');
        const key = targetBtn.getAttribute('data-key');
        const val = targetBtn.getAttribute('data-val');

        updateLocalConfigValue(key, val);
        buildFlatMaps();
        renderSettings();
      });
    });

    applySearchFilter();
    return advancedDiffCount;
  };

  const renderSettings = () => {
    const stdDiff = renderStandardCompareBadges();
    const advDiff = renderAdvancedSettings();
    const totalDiff = stdDiff + advDiff;

    // Toggle Sync All Button
    if (compareProfile && totalDiff > 0) {
      btnSyncAll.style.display = 'inline-flex';
      btnSyncAll.textContent = `Sync All Differences (${totalDiff})`;
    } else {
      btnSyncAll.style.display = 'none';
    }
  };

  const updateLocalConfigValue = (flatKey, val) => {
    const info = parseFlatKey(flatKey);
    if (!info) return;

    const source = info.source;
    if (source === 'gameCfg') {
      const section = info.sectionName;
      const key = info.keyName;
      if (!activeIni[section]) activeIni[section] = {};
      activeIni[section][key] = String(val);
    } else if (source === 'persisted') {
      const fileName = info.fileName;
      const sectionName = info.sectionName;
      const settingName = info.keyName;

      const fileItem = activeJson.files.find(f => f.name === fileName);
      if (fileItem) {
        const secItem = fileItem.sections.find(s => s.name === sectionName);
        if (secItem) {
          const settingItem = secItem.settings.find(st => st.name === settingName);
          if (settingItem) {
            settingItem.value = String(val);
          }
        }
      }
    }
  };

  // Bind Standard Fields Input Listeners
  const onStandardFieldChange = () => {
    updateStandardLocalState();
    buildFlatMaps();
    renderSettings();
  };

  [resWidth, resHeight, windowMode, masterVol, musicVol, minimapScale, flipMinimap].forEach(ctrl => {
    ctrl.addEventListener('change', onStandardFieldChange);
  });

  const applySearchFilter = () => {
    const query = searchInput.value.toLowerCase().trim();
    
    document.querySelectorAll('.lol-category-block').forEach(catBlock => {
      let visibleCards = 0;

      catBlock.querySelectorAll('.lol-section-card').forEach(card => {
        const sectionName = card.getAttribute('data-section-name');
        let visibleRows = 0;

        card.querySelectorAll('.lol-setting-item-row').forEach(row => {
          const keyName = row.getAttribute('data-key-name');
          const matches = keyName.includes(query) || sectionName.includes(query);
          row.style.display = matches ? 'flex' : 'none';
          if (matches) visibleRows++;
        });

        card.style.display = visibleRows > 0 ? 'block' : 'none';
        if (visibleRows > 0) visibleCards++;
      });

      catBlock.style.display = visibleCards > 0 ? 'block' : 'none';
    });
  };

  searchInput.addEventListener('input', applySearchFilter);

  // Sync All Differences Click
  btnSyncAll.addEventListener('click', () => {
    if (!compareProfile) return;
    
    const confirmSync = confirm(`Sync all setting differences from "${compareProfile.name}" into your active configuration?`);
    if (!confirmSync) return;

    for (const [flatKey, compareVal] of Object.entries(compareFlat)) {
      if (activeFlat[flatKey] !== undefined && String(activeFlat[flatKey]) !== String(compareVal)) {
        updateLocalConfigValue(flatKey, compareVal);
      }
    }

    buildFlatMaps();
    bindStandardControls();
    renderSettings();
    if (window.showToast) window.showToast('All differences synchronized!', 'success');
  });

  // Profile Compare Select change
  compareSelect.addEventListener('change', async () => {
    const profileName = compareSelect.value;
    if (!profileName) {
      compareProfile = null;
    } else {
      try {
        compareProfile = await window.api.profiles.load(profileName);
      } catch (err) {
        if (window.showToast) window.showToast('Failed to load profile: ' + err.message, 'error');
        compareSelect.value = '';
        compareProfile = null;
      }
    }
    buildFlatMaps();
    renderSettings();
  });

  // Profile Edit Select change
  editSelect.addEventListener('change', async () => {
    if (editSelect.value && editSelect.value === compareSelect.value) {
      compareSelect.value = '';
      compareProfile = null;
    }
    await loadActiveConfigs();
  });

  // Save changes
  const performSave = async () => {
    btnSave.disabled = true;
    if (btnSaveTop) btnSaveTop.disabled = true;
    const targetName = editSelect.value;
    const loadingText = targetName ? 'Saving Profile...' : 'Saving Configs...';
    btnSave.textContent = loadingText;
    if (btnSaveTop) btnSaveTop.textContent = loadingText;

    try {
      updateStandardLocalState();
      
      if (!targetName) {
        await window.api.lol.updateSettings(activeIni);
        await window.api.lol.updateKeybindings(activeJson, { force: true });
        if (window.showToast) window.showToast('League of Legends active configurations saved and applied!', 'success');
      } else {
        const profileObj = await window.api.profiles.load(targetName);
        profileObj.targets.gameCfg = activeIni;
        profileObj.targets.persistedSettings = activeJson;
        await window.api.profiles.save(profileObj);
        if (window.showToast) window.showToast(`Profile "${targetName}" saved successfully!`, 'success');
      }
      
      await loadActiveConfigs();
    } catch (err) {
      if (window.showToast) window.showToast(`Error saving: ${err.message || err}`, 'error');
    } finally {
      btnSave.disabled = false;
      if (btnSaveTop) btnSaveTop.disabled = false;
      
      const defaultText = targetName ? 'Save Profile Changes' : 'Save & Apply Settings';
      btnSave.textContent = defaultText;
      if (btnSaveTop) btnSaveTop.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
        Save & Apply
      `;
    }
  };

  btnSave.addEventListener('click', performSave);
  btnSaveTop.addEventListener('click', performSave);

  // Initial load sequences
  const init = async () => {
    await loadProfilesDropdown();
    await loadActiveConfigs();
    initKeymapper();
  };

  init();
}
