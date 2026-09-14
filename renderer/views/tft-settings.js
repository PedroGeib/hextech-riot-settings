export function render() {
  return `
    <div class="page-container animate-fade-in">
      <div class="page-header flex justify-between items-center mb-6">
        <div>
          <h1 class="page-title text-cyan">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"/><line x1="12" y1="22" x2="12" y2="15.5"/><polyline points="22,8.5 12,15.5 2,8.5"/></svg>
            Teamfight Tactics Settings
          </h1>
          <p class="page-subtitle">Configure TFT specific options or manage all general settings</p>
        </div>
      </div>

      <!-- Controls & Comparison Bar -->
      <div class="card mb-4">
        <div class="card-body flex flex-wrap gap-4 items-center justify-between">
          <div class="flex items-center gap-4 flex-wrap">
            <div class="flex flex-col">
              <span class="text-xs text-muted mb-1 uppercase font-semibold tracking-wider">Profile to Edit (Target)</span>
              <select id="tft-edit-profile" class="select-control" style="width: 250px; height: 38px;">
                <option value="">[Active Config] (Current Game Files)</option>
              </select>
            </div>
            <div class="flex flex-col">
              <span class="text-xs text-muted mb-1 uppercase font-semibold tracking-wider">Compare with Profile</span>
              <select id="tft-compare-profile" class="select-control" style="width: 250px; height: 38px;">
                <option value="">None (Edit Only)</option>
              </select>
            </div>
            <button id="tft-btn-sync-all" class="btn btn--secondary flex items-center" style="display: none; height: 38px; margin-top: 18px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M17 2.1l4 4-4 4M3 22v-6h6M21 2v6h-6M7 21.9l-4-4 4-4"/></svg>
              Sync All Differences
            </button>
          </div>
        </div>
      </div>

      <!-- ─── STANDARD SETTINGS SECTION ─── -->
      <div id="tft-standard-settings">
        <!-- Performance & Display -->
        <div class="card mb-4" id="tft-card-performance">
          <div class="card-header">
            <h3 class="card-title text-violet">Performance & Video</h3>
          </div>
          <div class="card-body" style="padding: 0;">
            <!-- Resolution row -->
            <div class="setting-row" id="row-tft-res">
              <div class="setting-label">
                <span class="setting-title">Screen Resolution</span>
                <p class="setting-desc">Set width and height of the game window.</p>
              </div>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2">
                  <input type="number" id="tft-res-width" class="input-control" style="width: 90px; text-align: center;" placeholder="Width" />
                  <span class="text-muted">x</span>
                  <input type="number" id="tft-res-height" class="input-control" style="width: 90px; text-align: center;" placeholder="Height" />
                </div>
                <div class="std-compare-badge" data-key="gameCfg.General.Width"></div>
              </div>
            </div>

            <!-- FPS Cap Row -->
            <div class="setting-row" id="row-tft-fps-cap" style="height: auto; min-height: 60px;">
              <div class="setting-label" style="flex: 1;">
                <span class="setting-title">FPS Cap</span>
                <p class="setting-desc">Limit your game framerate for performance stability.</p>
              </div>
              <div class="flex items-center gap-4" style="flex-wrap: wrap; justify-content: flex-end;">
                <div class="flex items-center gap-2" style="width: 220px;">
                  <input type="range" id="tft-fps-cap" class="slider-control flex-1" min="30" max="360" step="1" />
                  <span id="tft-fps-cap-val" class="font-mono text-xs text-cyan" style="width: 25px; text-align: right;">60</span>
                </div>
                <div class="fps-presets flex gap-1">
                  <button class="btn btn--secondary btn--sm preset-fps-btn" data-fps="60" style="padding: 2px 6px; font-size: 10px;">60</button>
                  <button class="btn btn--secondary btn--sm preset-fps-btn" data-fps="120" style="padding: 2px 6px; font-size: 10px;">120</button>
                  <button class="btn btn--secondary btn--sm preset-fps-btn" data-fps="144" style="padding: 2px 6px; font-size: 10px;">144</button>
                  <button class="btn btn--secondary btn--sm preset-fps-btn" data-fps="165" style="padding: 2px 6px; font-size: 10px;">165</button>
                  <button class="btn btn--secondary btn--sm preset-fps-btn" data-fps="240" style="padding: 2px 6px; font-size: 10px;">240</button>
                </div>
                <div class="std-compare-badge" data-key="gameCfg.Performance.MaxFPS"></div>
              </div>
            </div>

            <!-- Frame Cap Type -->
            <div class="setting-row" id="row-tft-frame-cap-type">
              <div class="setting-label">
                <span class="setting-title">Wait for Vertical Sync (V-Sync)</span>
                <p class="setting-desc">Locks framerate to monitor refresh rate to prevent screen tearing.</p>
              </div>
              <div class="flex items-center gap-4">
                <input type="checkbox" id="tft-frame-cap-type" class="toggle-switch" />
                <div class="std-compare-badge" data-key="gameCfg.Performance.FrameCapType"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Audio Card -->
        <div class="card mb-4" id="tft-card-audio">
          <div class="card-header">
            <h3 class="card-title text-violet">TFT Audio & Sound</h3>
          </div>
          <div class="card-body" style="padding: 0;">
            <!-- Master Volume -->
            <div class="setting-row" id="row-tft-master-vol">
              <div class="setting-label">
                <span class="setting-title">Master Volume</span>
                <p class="setting-desc">Adjust the overall volume of all game sounds.</p>
              </div>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2" style="width: 200px;">
                  <input type="range" id="tft-master-vol" class="slider-control flex-1" min="0" max="100" />
                  <span id="tft-master-vol-val" class="font-mono text-xs text-cyan" style="width: 25px; text-align: right;">50</span>
                </div>
                <div class="std-compare-badge" data-key="gameCfg.Volume.MasterVolume"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- HUD Card -->
        <div class="card mb-4" id="tft-card-hud">
          <div class="card-header">
            <h3 class="card-title text-violet">TFT HUD Settings</h3>
          </div>
          <div class="card-body" style="padding: 0;">
            <!-- Minimap Scale -->
            <div class="setting-row" id="row-tft-minimap-scale">
              <div class="setting-label">
                <span class="setting-title">Minimap Scale</span>
                <p class="setting-desc">Scale the in-game radar HUD.</p>
              </div>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2" style="width: 200px;">
                  <input type="range" id="tft-minimap-scale" class="slider-control flex-1" min="0.5" max="3.0" step="0.1" />
                  <span id="tft-minimap-scale-val" class="font-mono text-xs text-cyan" style="width: 25px; text-align: right;">1.0</span>
                </div>
                <div class="std-compare-badge" data-key="gameCfg.HUD.MinimapScale"></div>
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
            <input type="text" id="tft-settings-search" class="input-control" placeholder="Search setting keys (e.g. ChatScale, TFTChat)..." style="height: 38px;" />
          </div>
        </div>
      </div>

      <!-- Dynamic Advanced Options -->
      <div id="tft-settings-container" class="flex flex-col gap-6">
        <!-- Advanced Settings injected dynamically -->
      </div>

      <!-- Footer Bar -->
      <div class="card" style="margin-top: 24px;">
        <div class="card-body flex justify-between items-center py-4">
          <div class="text-sm text-muted">
            Teamfight Tactics Config Folder
          </div>
          <button id="tft-btn-save" class="btn btn--primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            Save & Apply Settings
          </button>
        </div>
      </div>
    </div>
  `;
}

export function mount() {
  const compareSelect = document.getElementById('tft-compare-profile');
  const btnSyncAll = document.getElementById('tft-btn-sync-all');
  const searchInput = document.getElementById('tft-settings-search');
  const container = document.getElementById('tft-settings-container');
  const btnSave = document.getElementById('tft-btn-save');

  // Standard inputs
  const resWidth = document.getElementById('tft-res-width');
  const resHeight = document.getElementById('tft-res-height');
  const fpsCap = document.getElementById('tft-fps-cap');
  const fpsCapVal = document.getElementById('tft-fps-cap-val');
  const frameCapType = document.getElementById('tft-frame-cap-type');
  const masterVol = document.getElementById('tft-master-vol');
  const masterVolVal = document.getElementById('tft-master-vol-val');
  const minimapScale = document.getElementById('tft-minimap-scale');
  const minimapScaleVal = document.getElementById('tft-minimap-scale-val');

  if (!compareSelect || !btnSyncAll || !searchInput || !container || !btnSave) return;

  // Active configurations in memory
  let activeIni = {};
  let activeJson = {};

  // Comparison profile in memory
  let compareProfile = null;

  // Flat maps
  let activeFlat = {};
  let compareFlat = {};

  // Standard keys to exclude from Advanced options list
  const STANDARD_KEYS = new Set([
    'gameCfg.General.Width',
    'gameCfg.General.Height',
    'gameCfg.Performance.MaxFPS',
    'gameCfg.Performance.FrameCapType',
    'gameCfg.Volume.MasterVolume',
    'gameCfg.HUD.MinimapScale'
  ]);

  const loadProfilesDropdown = async () => {
    try {
      const list = await window.api.profiles.list();
      compareSelect.innerHTML = '<option value="">None (Edit Only)</option>';
      list.forEach(p => {
        compareSelect.insertAdjacentHTML('beforeend', `<option value="${p.name}">${p.name}</option>`);
      });
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

  syncSlider(fpsCap, fpsCapVal);
  syncSlider(masterVol, masterVolVal);
  syncSlider(minimapScale, minimapScaleVal);

  // FPS Presets
  document.querySelectorAll('.preset-fps-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const val = e.target.dataset.fps;
      fpsCap.value = val;
      fpsCapVal.textContent = val;
      onStandardFieldChange();
    });
  });

  const loadActiveConfigs = async () => {
    try {
      container.innerHTML = '<div class="skeleton skeleton--card" style="height: 150px;"></div>';
      
      const iniRes = await window.api.tft.readGameCfg();
      activeIni = iniRes.data || {};
      
      const jsonRes = await window.api.lol.readKeybindings();
      activeJson = jsonRes.data || {};

      buildFlatMaps();
      bindStandardControls();
      renderAdvancedSettings();
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><h3>Config File Error</h3><p>${err.message}</p></div>`;
    }
  };

  const bindStandardControls = () => {
    if (activeIni.General) {
      resWidth.value = activeIni.General.Width || '';
      resHeight.value = activeIni.General.Height || '';
    }
    if (activeIni.Performance) {
      fpsCap.value = activeIni.Performance.MaxFPS || '60';
      fpsCapVal.textContent = fpsCap.value;
      frameCapType.checked = activeIni.Performance.FrameCapType === '1' || activeIni.Performance.FrameCapType === 1;
    }
    if (activeIni.Volume) {
      const mv = activeIni.Volume.MasterVolume !== undefined ? Math.round(parseFloat(activeIni.Volume.MasterVolume) * 100) : 50;
      masterVol.value = mv;
      masterVolVal.textContent = mv;
    }
    if (activeIni.HUD) {
      const ms = activeIni.HUD.MinimapScale !== undefined ? parseFloat(activeIni.HUD.MinimapScale) : 1.0;
      minimapScale.value = ms;
      minimapScaleVal.textContent = ms.toFixed(1);
    }
  };

  const updateStandardLocalState = () => {
    if (!activeIni.General) activeIni.General = {};
    if (!activeIni.Performance) activeIni.Performance = {};
    if (!activeIni.Volume) activeIni.Volume = {};
    if (!activeIni.HUD) activeIni.HUD = {};

    activeIni.General.Width = String(resWidth.value);
    activeIni.General.Height = String(resHeight.value);
    activeIni.Performance.MaxFPS = String(fpsCap.value);
    activeIni.Performance.FrameCapType = frameCapType.checked ? '1' : '0';
    activeIni.Volume.MasterVolume = String((parseInt(masterVol.value) / 100).toFixed(4));
    activeIni.HUD.MinimapScale = String(parseFloat(minimapScale.value).toFixed(4));
  };

  const buildFlatMaps = () => {
    activeFlat = {};

    // Flatten game.cfg
    for (const [section, keys] of Object.entries(activeIni)) {
      const isTftSection = section.startsWith('TFT') || section.includes('Cherry') || section.includes('Strawberry') || 
                           section === 'Volume' || section === 'Performance' || section === 'General';
      if (!isTftSection) continue;
      for (const [k, v] of Object.entries(keys)) {
        activeFlat[`gameCfg.${section}.${k}`] = v;
      }
    }

    // Flatten keybindings
    const files = activeJson.files || [];
    for (const f of files) {
      const sections = f.sections || [];
      for (const sec of sections) {
        const isTftSection = sec.name.startsWith('TFT') || f.name.startsWith('TFT') || f.name === 'Input.ini';
        if (!isTftSection) continue;
        const settings = sec.settings || [];
        for (const setting of settings) {
          activeFlat[`persisted.${f.name}.${sec.name}.${setting.name}`] = setting.value;
        }
      }
    }

    // Flatten comparison profile
    compareFlat = {};
    if (compareProfile && compareProfile.targets) {
      const targets = compareProfile.targets;

      if (targets.gameCfg) {
        for (const [section, keys] of Object.entries(targets.gameCfg)) {
          const isTftSection = section.startsWith('TFT') || section.includes('Cherry') || section.includes('Strawberry') || 
                               section === 'Volume' || section === 'Performance' || section === 'General';
          if (!isTftSection) continue;
          for (const [k, v] of Object.entries(keys)) {
            compareFlat[`gameCfg.${section}.${k}`] = v;
          }
        }
      }

      if (targets.persistedSettings) {
        const files = targets.persistedSettings.files || [];
        for (const f of files) {
          const sections = f.sections || [];
          for (const sec of sections) {
            const isTftSection = sec.name.startsWith('TFT') || f.name.startsWith('TFT') || f.name === 'Input.ini';
            if (!isTftSection) continue;
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

    // Copy action listeners
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
      'Advanced TFT HUD & Chat': {},
      'Advanced TFT Controls': {},
      'Advanced TFT Audio': {},
      'Advanced TFT Engine': {},
      'TFT Additional Options': {},
    };

    for (const [flatKey, value] of Object.entries(activeFlat)) {
      if (STANDARD_KEYS.has(flatKey)) continue;

      const info = parseFlatKey(flatKey);
      if (!info) continue;

      const source = info.source;
      const keyName = info.keyName;
      const sectionName = info.sectionName;
      const fileName = info.fileName;

      let category = 'TFT Additional Options';

      if (source === 'gameCfg') {
        if (sectionName === 'General' || sectionName === 'Performance') {
          category = 'Advanced TFT Engine';
        } else if (sectionName === 'Volume') {
          category = 'Advanced TFT Audio';
        } else if (sectionName.startsWith('TFT') || sectionName === 'HUD' || sectionName === 'Chat' || sectionName === 'LossOfControl') {
          category = 'Advanced TFT HUD & Chat';
        }
      } else if (source === 'persisted') {
        category = 'Advanced TFT Controls';
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
            // FIXED toggle switch rendering
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
            <div class="setting-row tft-setting-item-row ${isDifferent ? 'setting-row--diff' : ''}" data-key-name="${item.keyName.toLowerCase()}" style="height: auto; min-height: 48px; padding: 10px 0;">
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
          <div class="card mb-4 tft-section-card" data-section-name="${sectionName.toLowerCase()}" style="margin-bottom: 16px;">
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
        <div class="tft-category-block" data-category-name="${catName.toLowerCase()}">
          <h3 class="section-title text-cyan" style="font-size: 15px; margin-bottom: 12px; margin-top: 8px; border-bottom: 1px solid rgba(0, 212, 255, 0.15); padding-bottom: 6px;">${catName}</h3>
          ${sectionCardsHtml}
        </div>
      `;
      container.insertAdjacentHTML('beforeend', categoryBlock);
    }

    // Input changes
    document.querySelectorAll('#tft-settings-container .setting-input-field').forEach(input => {
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

    // Copy compare buttons
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

  const onStandardFieldChange = () => {
    updateStandardLocalState();
    buildFlatMaps();
    renderSettings();
  };

  [resWidth, resHeight, fpsCap, frameCapType, masterVol, minimapScale].forEach(ctrl => {
    ctrl.addEventListener('change', onStandardFieldChange);
  });

  const applySearchFilter = () => {
    const query = searchInput.value.toLowerCase().trim();
    
    document.querySelectorAll('.tft-category-block').forEach(catBlock => {
      let visibleCards = 0;

      catBlock.querySelectorAll('.tft-section-card').forEach(card => {
        const sectionName = card.getAttribute('data-section-name');
        let visibleRows = 0;

        card.querySelectorAll('.tft-setting-item-row').forEach(row => {
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

  // Save changes
  btnSave.addEventListener('click', async () => {
    btnSave.disabled = true;
    btnSave.textContent = 'Saving...';

    try {
      updateStandardLocalState();
      
      // Save game.cfg
      await window.api.tft.updateSettings(activeIni);

      // Save PersistedSettings (keybindings are shared)
      await window.api.lol.updateKeybindings(activeJson, { force: true });

      if (window.showToast) window.showToast('Teamfight Tactics configurations saved and applied!', 'success');
      
      await loadActiveConfigs();
    } catch (err) {
      if (window.showToast) window.showToast(`Error saving: ${err.message}`, 'error');
    } finally {
      btnSave.disabled = false;
      btnSave.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
        Save & Apply Settings
      `;
    }
  });

  // Initial load sequences
  const init = async () => {
    await loadProfilesDropdown();
    await loadActiveConfigs();
  };

  init();
}
