// Helper functions to flatten and unflatten objects for nested configs (like client settings)
function flattenObject(obj, prefix = '', res = {}) {
  if (!obj || typeof obj !== 'object') return res;
  for (const [key, value] of Object.entries(obj)) {
    const propName = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value, propName, res);
    } else {
      res[propName] = value;
    }
  }
  return res;
}

function unflattenObject(flatObj) {
  const result = {};
  for (const [key, value] of Object.entries(flatObj)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        current[part] = value;
      } else {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    }
  }
  return result;
}

export function render() {
  return `
    <div class="page-container animate-fade-in">
      <div class="page-header flex justify-between items-center mb-6">
        <div>
          <h1 class="page-title text-cyan">All Config Editor</h1>
          <p class="page-subtitle">Configure absolutely all settings available in the configuration files</p>
        </div>
        <div class="flex gap-2">
          <button id="btn-toggle-mode" class="btn btn--secondary flex items-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="13" y2="17"></line></svg>
            Show Raw Text
          </button>
        </div>
      </div>

      <!-- Controls Card -->
      <div class="card mb-4">
        <div class="card-body flex flex-wrap gap-4 items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="flex flex-col">
              <span class="text-xs text-muted mb-1 uppercase font-semibold tracking-wider">Select Config File</span>
              <select id="select-raw-file" class="select-control" style="width: 280px; height: 38px;">
                <option value="gameCfg">game.cfg (In-game Video / Audio)</option>
                <option value="persistedSettings">PersistedSettings.json (Keybindings & Cloud)</option>
                <option value="clientSettings">LeagueClientSettings.yaml (Riot Client)</option>
              </select>
            </div>
            <div class="flex flex-col">
              <span class="text-xs text-muted mb-1 uppercase font-semibold tracking-wider">File Status</span>
              <span class="status-badge status-badge--offline" id="file-lock-status" style="margin-top: 8px;">
                <span class="status-badge__dot"></span>
                <span class="status-badge__text">Checking...</span>
              </span>
            </div>
          </div>
          
          <div class="flex flex-col" id="search-container" style="flex: 1; max-width: 400px; min-width: 250px;">
            <span class="text-xs text-muted mb-1 uppercase font-semibold tracking-wider">Search settings</span>
            <input type="text" id="raw-configs-search" class="input-control" placeholder="Search by setting name..." style="height: 38px;" />
          </div>
        </div>
      </div>

      <!-- Interactive Editor Mode -->
      <div id="interactive-editor-container">
        <div id="interactive-form" class="flex flex-col gap-6">
          <!-- Dynamic Sections will be injected here -->
        </div>
      </div>

      <!-- Raw Text Editor Mode (Hidden by default) -->
      <div id="raw-editor-container" style="display: none;">
        <div class="card mb-4">
          <div class="card-header">
            <h2 class="card-title">Raw File View</h2>
          </div>
          <div class="card-body">
            <div style="position: relative; margin-bottom: 20px;">
              <textarea id="raw-config-textarea" class="input-control w-full" style="height: 520px; font-family: 'Consolas', 'Courier New', monospace; font-size: 13px; line-height: 1.5; padding: 16px; background-color: rgba(10, 14, 26, 0.5); border: 1px solid var(--glass-border); border-radius: var(--radius-md); color: var(--text-primary); resize: vertical; white-space: pre;" spellcheck="false"></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Bar -->
      <div class="card" style="margin-top: 24px;">
        <div class="card-body flex justify-between items-center py-4">
          <div class="text-sm text-muted" id="raw-file-path-display" style="font-family: monospace;">
            Path: Loading...
          </div>
          <button id="btn-save-configs" class="btn btn--primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            Save & Apply Settings
          </button>
        </div>
      </div>
    </div>
  `;
}

export function mount() {
  const selectFile = document.getElementById('select-raw-file');
  const searchInput = document.getElementById('raw-configs-search');
  const textarea = document.getElementById('raw-config-textarea');
  const pathDisplay = document.getElementById('raw-file-path-display');
  const lockStatus = document.getElementById('file-lock-status');
  const btnSave = document.getElementById('btn-save-configs');
  const btnToggleMode = document.getElementById('btn-toggle-mode');
  const interactiveContainer = document.getElementById('interactive-editor-container');
  const rawContainer = document.getElementById('raw-editor-container');
  const formContainer = document.getElementById('interactive-form');

  if (!selectFile || !searchInput || !textarea || !pathDisplay || !lockStatus || !btnSave || !btnToggleMode || !interactiveContainer || !rawContainer || !formContainer) return;

  let paths = {};
  let currentKey = 'gameCfg';
  let currentPath = '';
  let isRawMode = false;

  // Store loaded settings in memory
  let loadedData = null; // Can be parsed INI, JSON, or YAML representation

  const updateLockBadge = async (filePath) => {
    try {
      const isLocked = await window.api.lock.isReadOnly(filePath);
      if (isLocked) {
        lockStatus.className = 'status-badge status-badge--locked';
        lockStatus.querySelector('.status-badge__text').textContent = 'Cloud locked (Read-Only)';
      } else {
        lockStatus.className = 'status-badge status-badge--online';
        lockStatus.querySelector('.status-badge__text').textContent = 'Editable (Writeable)';
      }
    } catch {
      lockStatus.className = 'status-badge status-badge--offline';
      lockStatus.querySelector('.status-badge__text').textContent = 'Status Unknown';
    }
  };

  // Toggle Mode function
  btnToggleMode.addEventListener('click', () => {
    isRawMode = !isRawMode;
    if (isRawMode) {
      interactiveContainer.style.display = 'none';
      rawContainer.style.display = 'block';
      btnToggleMode.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        Show Interactive UI
      `;
      // Sync UI modifications back to raw text editor text area
      textarea.value = serializeCurrentState();
    } else {
      interactiveContainer.style.display = 'block';
      rawContainer.style.display = 'none';
      btnToggleMode.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="13" y2="17"></line></svg>
        Show Raw Text
      `;
      // Attempt to parse text area content and rebuild UI
      try {
        parseRawTextState(textarea.value);
        renderInteractiveForm();
      } catch (err) {
        if (window.showToast) window.showToast(`Error parsing text: ${err.message}. Reverting to raw editor.`, 'error');
        // Revert toggle
        isRawMode = true;
        interactiveContainer.style.display = 'none';
        rawContainer.style.display = 'block';
      }
    }
  });

  // Render a setting control row based on value type
  const renderSettingRow = (sectionId, keyName, value, fullKeyPath) => {
    // Determine types
    const isBool = value === '0' || value === '1' || value === 0 || value === 1 || value === 'true' || value === 'false' || typeof value === 'boolean';
    const isNumber = !isNaN(value) && value !== '' && !isBool;
    const cleanValue = isBool ? (value === '1' || value === 1 || value === 'true' || value === true) : value;

    let controlHtml = '';
    if (isBool) {
      controlHtml = `
        <input type="checkbox" class="toggle-switch setting-input-field" data-type="boolean" data-key="${fullKeyPath}" ${cleanValue ? 'checked' : ''} />
      `;
    } else if (isNumber) {
      controlHtml = `
        <input type="number" class="input-control setting-input-field" data-type="number" data-key="${fullKeyPath}" value="${value}" style="width: 120px; text-align: right;" step="any" />
      `;
    } else {
      controlHtml = `
        <input type="text" class="input-control setting-input-field" data-type="string" data-key="${fullKeyPath}" value="${value || ''}" style="width: 320px;" />
      `;
    }

    return `
      <div class="setting-row raw-setting-item-row" data-key-name="${keyName.toLowerCase()}">
        <div class="setting-label">
          <span class="setting-title" style="font-family: monospace; font-size: 13px;">${keyName}</span>
        </div>
        <div class="setting-control">
          ${controlHtml}
        </div>
      </div>
    `;
  };

  // Render the Dynamic Forms based on selected configuration file
  const renderInteractiveForm = () => {
    formContainer.innerHTML = '';
    if (!loadedData) return;

    if (currentKey === 'gameCfg') {
      // INI structure: { Section: { Key: Value } }
      for (const [section, keys] of Object.entries(loadedData)) {
        const sortedKeys = Object.entries(keys).sort((a, b) => a[0].localeCompare(b[0]));
        let rowsHtml = '';
        for (const [k, v] of sortedKeys) {
          rowsHtml += renderSettingRow(section, k, v, `${section}.${k}`);
        }

        const sectionCard = `
          <div class="card raw-section-card" data-section-name="${section.toLowerCase()}">
            <div class="card-header">
              <h3 class="card-title text-violet">[${section}]</h3>
            </div>
            <div class="card-body">
              ${rowsHtml}
            </div>
          </div>
        `;
        formContainer.insertAdjacentHTML('beforeend', sectionCard);
      }
    } else if (currentKey === 'clientSettings') {
      // YAML structure (Nested Objects)
      const flat = flattenObject(loadedData);
      
      // Let's group flattened keys by their first hierarchy (e.g. install, client)
      const groups = {};
      for (const [fullKey, val] of Object.entries(flat)) {
        const parts = fullKey.split('.');
        const groupName = parts[0];
        const displayKey = parts.slice(1).join('.');
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push({ displayKey, fullKey, val });
      }

      for (const [groupName, settings] of Object.entries(groups)) {
        settings.sort((a, b) => a.displayKey.localeCompare(b.displayKey));
        let rowsHtml = '';
        for (const item of settings) {
          rowsHtml += renderSettingRow(groupName, item.displayKey, item.val, item.fullKey);
        }

        const sectionCard = `
          <div class="card raw-section-card" data-section-name="${groupName.toLowerCase()}">
            <div class="card-header">
              <h3 class="card-title text-violet">${groupName}:</h3>
            </div>
            <div class="card-body">
              ${rowsHtml}
            </div>
          </div>
        `;
        formContainer.insertAdjacentHTML('beforeend', sectionCard);
      }
    } else if (currentKey === 'persistedSettings') {
      // JSON structure (PersistedSettings: files array)
      const files = loadedData.files || [];
      for (const fileItem of files) {
        const fileName = fileItem.name;
        const sections = fileItem.sections || [];

        for (const sec of sections) {
          const sectionName = sec.name;
          const settings = sec.settings || [];
          
          settings.sort((a, b) => a.name.localeCompare(b.name));
          let rowsHtml = '';
          for (const setting of settings) {
            // Path represents index in array to trace it back
            const fullPath = `persisted.${fileName}.${sectionName}.${setting.name}`;
            rowsHtml += renderSettingRow(sectionName, setting.name, setting.value, fullPath);
          }

          const sectionCard = `
            <div class="card raw-section-card" data-section-name="${fileName.toLowerCase()} ${sectionName.toLowerCase()}">
              <div class="card-header flex justify-between items-center">
                <h3 class="card-title text-violet">${fileName} &gt; ${sectionName}</h3>
              </div>
              <div class="card-body">
                ${rowsHtml}
              </div>
            </div>
          `;
          formContainer.insertAdjacentHTML('beforeend', sectionCard);
        }
      }
    }

    // Bind event listeners to dynamic inputs so changes update loadedData immediately
    document.querySelectorAll('.setting-input-field').forEach(input => {
      input.addEventListener('change', (e) => {
        const field = e.target;
        const keyPath = field.getAttribute('data-key');
        const type = field.getAttribute('data-type');
        
        let value;
        if (type === 'boolean') {
          const isChecked = field.checked;
          if (currentKey === 'gameCfg') {
            value = isChecked ? '1' : '0';
          } else {
            value = isChecked;
          }
        } else if (type === 'number') {
          value = field.value.indexOf('.') !== -1 ? parseFloat(field.value) : parseInt(field.value, 10);
          if (isNaN(value)) value = 0;
          if (currentKey === 'gameCfg') value = String(value);
        } else {
          value = field.value;
        }

        updateLoadedDataValue(keyPath, value);
      });
    });

    // Run filter immediately if search input has value
    applySearchFilter();
  };

  // Helper to update our in-memory data representation when values change in UI
  const updateLoadedDataValue = (keyPath, value) => {
    if (keyPath.startsWith('persisted.')) {
      // Format: persisted.fileName.sectionName.settingName
      const parts = keyPath.split('.');
      const fileName = parts[1];
      const sectionName = parts[2];
      const settingName = parts[3];

      const fileItem = loadedData.files.find(f => f.name === fileName);
      if (fileItem) {
        const secItem = fileItem.sections.find(s => s.name === sectionName);
        if (secItem) {
          const settingItem = secItem.settings.find(st => st.name === settingName);
          if (settingItem) {
            settingItem.value = String(value);
          }
        }
      }
    } else {
      // Simply update path in flat map, then unflatten
      const flat = flattenObject(loadedData);
      flat[keyPath] = value;
      loadedData = unflattenObject(flat);
    }
  };

  // Convert current in-memory structured data to raw text depending on file format
  const serializeCurrentState = () => {
    if (!loadedData) return '';
    if (currentKey === 'persistedSettings') {
      return JSON.stringify(loadedData, null, 2);
    } else if (currentKey === 'gameCfg') {
      // Create INI string representation
      let iniStr = '';
      for (const [section, keys] of Object.entries(loadedData)) {
        iniStr += `[${section}]\n`;
        for (const [k, v] of Object.entries(keys)) {
          iniStr += `${k}=${v}\n`;
        }
        iniStr += '\n';
      }
      return iniStr;
    } else if (currentKey === 'clientSettings') {
      // Re-flatten client settings
      const flat = flattenObject(loadedData);
      // We will render it as JSON since Riot Client Settings can be YAML or JSON
      return JSON.stringify(unflattenObject(flat), null, 2);
    }
    return '';
  };

  // Parse raw text and update the in-memory data representation
  const parseRawTextState = (text) => {
    if (currentKey === 'persistedSettings' || currentKey === 'clientSettings') {
      loadedData = JSON.parse(text);
    } else if (currentKey === 'gameCfg') {
      // Simple custom INI parser
      const lines = text.split('\n');
      const data = {};
      let currentSection = null;
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          currentSection = trimmed.slice(1, -1);
          data[currentSection] = {};
        } else if (currentSection && trimmed.indexOf('=') !== -1) {
          const idx = trimmed.indexOf('=');
          const k = trimmed.slice(0, idx).trim();
          const v = trimmed.slice(idx + 1).trim();
          data[currentSection][k] = v;
        }
      }
      loadedData = data;
    }
  };

  // Client-side search filtering
  const applySearchFilter = () => {
    const query = searchInput.value.toLowerCase().trim();
    
    document.querySelectorAll('.raw-section-card').forEach(card => {
      const sectionName = card.getAttribute('data-section-name');
      let visibleRows = 0;

      card.querySelectorAll('.raw-setting-item-row').forEach(row => {
        const keyName = row.getAttribute('data-key-name');
        const matches = keyName.includes(query) || sectionName.includes(query);
        row.style.display = matches ? 'flex' : 'none';
        if (matches) visibleRows++;
      });

      card.style.display = visibleRows > 0 ? 'block' : 'none';
    });
  };

  searchInput.addEventListener('input', applySearchFilter);

  const loadFile = async () => {
    currentKey = selectFile.value;
    currentPath = paths[currentKey];
    if (!currentPath) return;

    pathDisplay.textContent = `Path: ${currentPath}`;
    formContainer.innerHTML = '<div class="skeleton skeleton--card" style="height: 200px;"></div>';
    textarea.value = 'Loading file contents...';
    
    try {
      // Load raw text
      const content = await window.api.paths.readRaw(currentPath);
      textarea.value = content;
      
      // Load structured representation
      if (currentKey === 'gameCfg') {
        const res = await window.api.lol.readGameCfg();
        loadedData = res.data;
      } else if (currentKey === 'persistedSettings') {
        const res = await window.api.lol.readKeybindings();
        loadedData = res.data;
      } else if (currentKey === 'clientSettings') {
        const res = await window.api.client.read();
        loadedData = res.data;
      }

      renderInteractiveForm();
      await updateLockBadge(currentPath);
    } catch (err) {
      formContainer.innerHTML = `<div class="empty-state"><h3>Failed to Load File</h3><p>${err.message}</p></div>`;
      if (window.showToast) window.showToast('Failed to load file contents', 'error');
    }
  };

  const init = async () => {
    try {
      paths = await window.api.paths.resolve();
      await loadFile();
    } catch (err) {
      if (window.showToast) window.showToast('Failed to resolve config paths', 'error');
    }
  };

  selectFile.addEventListener('change', loadFile);

  btnSave.addEventListener('click', async () => {
    if (!currentPath) return;

    const confirmSave = confirm(`Are you sure you want to save changes to "${currentPath.split('\\').pop()}"?\nInvalid settings can corrupt game preferences.`);
    if (!confirmSave) return;

    btnSave.disabled = true;
    btnSave.textContent = 'Saving...';

    let wasLocked = false;
    try {
      // Manage read-only if locked
      wasLocked = await window.api.lock.isReadOnly(currentPath);
      if (wasLocked) {
        await window.api.lock.removeReadOnly(currentPath);
      }

      // If in raw mode, parse text value first to ensure validity
      if (isRawMode) {
        parseRawTextState(textarea.value);
      }

      // Serialize current state (either updated from UI or parsed from text)
      const contentToSave = serializeCurrentState();
      await window.api.paths.writeRaw(currentPath, contentToSave);

      if (wasLocked) {
        await window.api.lock.setReadOnly(currentPath);
      }

      if (window.showToast) window.showToast('Config file saved successfully!', 'success');
      await updateLockBadge(currentPath);
      
      // Reload UI
      renderInteractiveForm();
    } catch (err) {
      if (window.showToast) window.showToast(`Error saving: ${err.message}`, 'error');
      
      // Attempt recovery
      if (wasLocked) {
        try { await window.api.lock.setReadOnly(currentPath); } catch {}
      }
    } finally {
      btnSave.disabled = false;
      btnSave.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
        Save & Apply Settings
      `;
    }
  });

  init();
}
