export function render() {
  return `
    <div id="client-settings-view" class="page-container animate-fade-in">
      <div class="page-header mb-6">
        <h1 class="page-title text-cyan">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          Client Settings
        </h1>
        <p class="page-subtitle">Configure regional parameters and display language for the Riot Games Client</p>
      </div>

      <!-- Settings Card -->
      <div class="card mb-6">
        <div class="card-body" style="padding: 24px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 24px;">
            <!-- Region Selector -->
            <div class="flex flex-col">
              <label class="text-xs text-muted mb-2 uppercase font-semibold tracking-wider flex items-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                Riot Server / Region
              </label>
              <select id="client-region" class="select-control" style="height: 42px; border-radius: var(--radius-md);">
                <option value="BR">Brasil (BR)</option>
                <option value="NA">North America (NA)</option>
                <option value="EUW">Europe West (EUW)</option>
                <option value="EUNE">Europe Nordic & East (EUNE)</option>
                <option value="LAN">Latin America North (LAN)</option>
                <option value="LAS">Latin America South (LAS)</option>
                <option value="OCE">Oceania (OCE)</option>
                <option value="JP">Japan (JP)</option>
                <option value="KR">Korea (KR)</option>
                <option value="TR">Turkey (TR)</option>
                <option value="RU">Russia (RU)</option>
                <option value="PH">Philippines (PH)</option>
                <option value="SG">Singapore (SG)</option>
                <option value="TH">Thailand (TH)</option>
                <option value="TW">Taiwan (TW)</option>
                <option value="VN">Vietnam (VN)</option>
              </select>
            </div>

            <!-- Locale Selector -->
            <div class="flex flex-col">
              <label class="text-xs text-muted mb-2 uppercase font-semibold tracking-wider flex items-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                Client Language / Locale
              </label>
              <select id="client-locale" class="select-control" style="height: 42px; border-radius: var(--radius-md);">
                <option value="pt_BR">Português (Brasil) (pt_BR)</option>
                <option value="en_US">English (United States) (en_US)</option>
                <option value="es_MX">Español (México) (es_MX)</option>
                <option value="es_AR">Español (Argentina) (es_AR)</option>
                <option value="ko_KR">한국어 (Coreia) (ko_KR)</option>
                <option value="ja_JP">日本語 (Japão) (ja_JP)</option>
                <option value="zh_CN">简体中文 (China) (zh_CN)</option>
                <option value="zh_TW">繁體中文 (Taiwan) (zh_TW)</option>
                <option value="fr_FR">Français (França) (fr_FR)</option>
                <option value="de_DE">Deutsch (Alemanha) (de_DE)</option>
                <option value="it_IT">Italiano (Itália) (it_IT)</option>
                <option value="pl_PL">Polski (Polônia) (pl_PL)</option>
                <option value="ro_RO">Română (Romênia) (ro_RO)</option>
                <option value="el_GR">Eλληνικά (Grécia) (el_GR)</option>
                <option value="tr_TR">Türkçe (Turquia) (tr_TR)</option>
                <option value="ru_RU">Русский (Rússia) (ru_RU)</option>
                <option value="vi_VN">Tiếng Việt (Vietnã) (vi_VN)</option>
                <option value="th_TH">ไทย (Tailândia) (th_TH)</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end">
            <button id="client-btn-apply" class="btn btn--primary flex items-center" style="padding: 10px 24px; font-weight: 600;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              Apply Client Changes
            </button>
          </div>
        </div>
      <!-- Diagnostic Configs Card -->
      <div class="card" style="border: 1px solid rgba(255, 255, 255, 0.05); background: rgba(0,0,0,0.15);">
        <div class="card-header flex justify-between items-center py-3" id="client-raw-header" style="cursor: pointer; user-select: none;">
          <h3 class="card-title text-muted flex items-center" style="font-size: 13px; font-weight: 500;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            Advanced Config File Inspector
          </h3>
          <button id="btn-toggle-raw" class="btn btn--secondary btn--sm" style="padding: 4px 12px; font-size: 11px; height: 28px; border-color: rgba(255,255,255,0.12);">
            View Config File
          </button>
        </div>
        <div class="card-body" id="client-raw-container" style="display: none; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05);">
          <p class="text-xs text-muted mb-3" style="font-size: 11px;">This is the underlying settings file stored on your PC. You can copy the code for debugging or verification.</p>
          <div style="position: relative;">
            <button id="btn-copy-raw" class="btn btn--secondary btn--sm" style="position: absolute; right: 12px; top: 12px; font-size: 11px; z-index: 10; border-color: rgba(255,255,255,0.12); height: 28px;">
              Copy Code
            </button>
            <pre id="client-raw-preview" class="scrollbar-custom" style="background: rgba(5,7,12,0.6); border: 1px solid var(--glass-border); color: var(--text-secondary); padding: 16px; border-radius: var(--radius-md); overflow: auto; max-height: 250px; font-family: 'Consolas', 'Courier New', monospace; font-size: 11px; line-height: 1.5; white-space: pre; margin: 0;">Loading...</pre>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function mount() {
  const regionSelector = document.getElementById('client-region');
  const localeSelector = document.getElementById('client-locale');
  const rawPreview = document.getElementById('client-raw-preview');
  const btnApply = document.getElementById('client-btn-apply');
  const rawHeader = document.getElementById('client-raw-header');
  const btnToggleRaw = document.getElementById('btn-toggle-raw');
  const rawContainer = document.getElementById('client-raw-container');
  const btnCopyRaw = document.getElementById('btn-copy-raw');

  if (!regionSelector || !localeSelector || !rawPreview || !btnApply || !rawHeader || !btnToggleRaw || !rawContainer || !btnCopyRaw) return;

  let rawConfigData = null;

  const loadData = async () => {
    try {
      const { data } = await window.api.client.read();
      if (!data) return;

      rawConfigData = data;

      if (data.install && data.install.globals) {
        if (data.install.globals.region) {
          regionSelector.value = data.install.globals.region;
        }
        if (data.install.globals.locale) {
          localeSelector.value = data.install.globals.locale;
        }
      }

      rawPreview.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      rawPreview.textContent = 'Failed to load config: ' + (err.message || err);
      console.warn('Client config load error:', err);
    }
  };

  // Toggle raw preview collapse
  const toggleRaw = () => {
    if (rawContainer.style.display === 'none') {
      rawContainer.style.display = 'block';
      btnToggleRaw.textContent = 'Hide Config File';
    } else {
      rawContainer.style.display = 'none';
      btnToggleRaw.textContent = 'View Config File';
    }
  };

  rawHeader.addEventListener('click', toggleRaw);
  btnToggleRaw.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleRaw();
  });

  // Copy raw configurations code to clipboard
  btnCopyRaw.addEventListener('click', () => {
    if (!rawConfigData) return;
    navigator.clipboard.writeText(JSON.stringify(rawConfigData, null, 2));
    btnCopyRaw.textContent = 'Copied!';
    setTimeout(() => {
      btnCopyRaw.textContent = 'Copy Code';
    }, 2000);
  });

  btnApply.addEventListener('click', async () => {
    btnApply.disabled = true;
    btnApply.textContent = 'Applying...';

    try {
      const region = regionSelector.value;
      const locale = localeSelector.value;

      if (region) await window.api.client.setRegion(region);
      if (locale) await window.api.client.setLocale(locale);
      
      if (window.showToast) window.showToast('Client settings applied successfully!', 'success');
      await loadData();
    } catch (err) {
      if (window.showToast) window.showToast(`Error: ${err.message || err}`, 'error');
    } finally {
      btnApply.disabled = false;
      btnApply.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
        Apply Client Changes
      `;
    }
  });

  loadData();
}
