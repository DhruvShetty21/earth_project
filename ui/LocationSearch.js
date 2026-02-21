// ui/LocationSearch.js  (v2 — globe pin + reverse geocoding)
// ─────────────────────────────────────────────────────────────────────────────
// Features:
//   • Visual pulsing pin on globe for every selected location
//   • Lat/lng tab auto-reverse-geocodes → shows real place name
//   • plantPin(lat,lng,label) is PUBLIC — call it from app.js on globe click too
// ─────────────────────────────────────────────────────────────────────────────

const LocationSearch = (() => {
    let _isOpen    = false;
    let _isLoading = false;
    let _currentPin = null;

    // ─── init ────────────────────────────────────────────────────────────────
    function init() {
        _injectStyles();
        _buildPanel();
        _bindEvents();
        console.log('[LocationSearch] v2 initialized');
    }

    // ─── styles ──────────────────────────────────────────────────────────────
    function _injectStyles() {
        if (document.getElementById('location-search-styles')) return;
        const s = document.createElement('style');
        s.id = 'location-search-styles';
        s.textContent = `
            /* ── Toggle Button ── */
            #loc-search-btn {
                position: fixed;
                bottom: 28px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1200;
                display: none;
                align-items: center;
                gap: 8px;
                padding: 11px 22px;
                background: linear-gradient(135deg, rgba(14,22,44,0.96) 0%, rgba(8,14,30,0.98) 100%);
                border: 1px solid rgba(77,166,255,0.35);
                border-radius: 50px;
                color: #a8c8ff;
                font-family: 'Segoe UI', sans-serif;
                font-size: 0.82rem;
                font-weight: 600;
                letter-spacing: 0.06em;
                cursor: pointer;
                box-shadow: 0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(77,166,255,0.1) inset;
                transition: all 0.25s ease;
                white-space: nowrap;
            }
            #loc-search-btn:hover {
                border-color: rgba(77,166,255,0.65);
                color: #d0e8ff;
                box-shadow: 0 6px 30px rgba(0,0,0,0.6), 0 0 18px rgba(77,166,255,0.15);
                transform: translateX(-50%) translateY(-2px);
            }
            #loc-search-btn.earth-active { display: flex; }

            /* ── Panel ── */
            #loc-search-panel {
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%) translateY(20px);
                z-index: 1200;
                width: min(440px, calc(100vw - 40px));
                background: linear-gradient(160deg, rgba(10,18,38,0.97) 0%, rgba(6,12,28,0.99) 100%);
                border: 1px solid rgba(77,166,255,0.2);
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset;
                padding: 20px;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.28s ease, transform 0.28s cubic-bezier(0.34,1.56,0.64,1);
                font-family: 'Segoe UI', sans-serif;
            }
            #loc-search-panel.open {
                opacity: 1;
                pointer-events: all;
                transform: translateX(-50%) translateY(0);
            }

            .lsp-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 14px;
            }
            .lsp-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 0.78rem;
                font-weight: 700;
                letter-spacing: 0.1em;
                color: #6ea8ff;
                text-transform: uppercase;
            }
            .lsp-close {
                background: none;
                border: none;
                color: #4a5568;
                font-size: 1rem;
                cursor: pointer;
                padding: 2px 6px;
                border-radius: 6px;
                transition: color 0.2s, background 0.2s;
            }
            .lsp-close:hover { color: #a0aec0; background: rgba(255,255,255,0.06); }

            /* Active pin badge */
            #lsp-active-pin {
                display: none;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: rgba(0,220,120,0.07);
                border: 1px solid rgba(0,220,120,0.2);
                border-radius: 10px;
                margin-bottom: 12px;
                font-size: 0.76rem;
                color: #34d399;
            }
            #lsp-active-pin.visible { display: flex; }
            .pin-dot {
                width: 8px; height: 8px;
                border-radius: 50%;
                background: #34d399;
                box-shadow: 0 0 6px #34d399;
                flex-shrink: 0;
                animation: lsp-pulse-dot 1.4s ease-in-out infinite;
            }
            @keyframes lsp-pulse-dot {
                0%,100% { opacity: 1; transform: scale(1); }
                50%     { opacity: 0.5; transform: scale(0.55); }
            }
            .pin-name { flex: 1; color: #a8e8c8; font-weight: 500; }
            .pin-coords { font-size: 0.68rem; color: #4a7060; }
            .pin-clear {
                margin-left: auto;
                background: none;
                border: none;
                color: #3a5550;
                cursor: pointer;
                font-size: 0.8rem;
                padding: 0 2px;
                transition: color 0.2s;
            }
            .pin-clear:hover { color: #f87171; }

            /* Tabs */
            .lsp-tabs {
                display: flex;
                gap: 6px;
                margin-bottom: 14px;
                background: rgba(0,0,0,0.3);
                border-radius: 10px;
                padding: 4px;
            }
            .lsp-tab {
                flex: 1;
                padding: 7px 10px;
                border: none;
                border-radius: 7px;
                background: transparent;
                color: #4a6080;
                font-family: inherit;
                font-size: 0.75rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                letter-spacing: 0.04em;
            }
            .lsp-tab.active {
                background: rgba(77,166,255,0.15);
                color: #7ab8ff;
                box-shadow: 0 1px 4px rgba(0,0,0,0.3);
            }

            /* Inputs */
            .lsp-field {
                position: relative;
                margin-bottom: 10px;
            }
            .lsp-field input {
                width: 100%;
                box-sizing: border-box;
                padding: 11px 14px 11px 38px;
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(77,166,255,0.15);
                border-radius: 10px;
                color: #c8d8f0;
                font-family: inherit;
                font-size: 0.85rem;
                outline: none;
                transition: border-color 0.2s, background 0.2s;
            }
            .lsp-field input:focus {
                border-color: rgba(77,166,255,0.45);
                background: rgba(77,166,255,0.06);
            }
            .lsp-field input::placeholder { color: #2e4060; }
            .lsp-field-icon {
                position: absolute;
                left: 12px;
                top: 50%;
                transform: translateY(-50%);
                font-size: 0.9rem;
                pointer-events: none;
                opacity: 0.5;
            }

            .lsp-coord-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin-bottom: 10px;
            }

            /* Reverse geocode preview */
            .lsp-geo-preview {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: rgba(77,166,255,0.07);
                border: 1px solid rgba(77,166,255,0.15);
                border-radius: 8px;
                font-size: 0.76rem;
                color: #7ab8ff;
                margin-bottom: 10px;
                min-height: 34px;
                transition: opacity 0.2s;
            }
            .lsp-geo-preview.hidden { opacity: 0; pointer-events: none; }
            .lsp-geo-preview-text { flex: 1; color: #a8c8f0; }

            /* Submit */
            .lsp-submit {
                width: 100%;
                padding: 12px;
                background: linear-gradient(135deg, #1a3a6e 0%, #0e2248 100%);
                border: 1px solid rgba(77,166,255,0.4);
                border-radius: 10px;
                color: #7ab8ff;
                font-family: inherit;
                font-size: 0.82rem;
                font-weight: 700;
                letter-spacing: 0.08em;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: all 0.22s;
                text-transform: uppercase;
                margin-top: 4px;
            }
            .lsp-submit:hover:not(:disabled) {
                background: linear-gradient(135deg, #1e4480 0%, #112a58 100%);
                border-color: rgba(77,166,255,0.65);
                color: #a8d0ff;
                box-shadow: 0 0 20px rgba(77,166,255,0.15);
            }
            .lsp-submit:disabled { opacity: 0.5; cursor: not-allowed; }

            /* Status */
            .lsp-status {
                font-size: 0.74rem;
                text-align: center;
                margin-top: 8px;
                min-height: 18px;
            }
            .lsp-status.error { color: #f87171; }
            .lsp-status.info  { color: #60a5fa; }
            .lsp-status.ok    { color: #34d399; }

            /* Recent */
            .lsp-recent {
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid rgba(255,255,255,0.05);
            }
            .lsp-recent-label {
                font-size: 0.65rem;
                letter-spacing: 0.08em;
                color: #2e4060;
                text-transform: uppercase;
                margin-bottom: 8px;
                font-weight: 600;
            }
            .lsp-recent-chips { display: flex; flex-wrap: wrap; gap: 6px; }
            .lsp-recent-chip {
                padding: 4px 10px;
                background: rgba(77,166,255,0.07);
                border: 1px solid rgba(77,166,255,0.12);
                border-radius: 20px;
                font-size: 0.72rem;
                color: #4a6888;
                cursor: pointer;
                transition: all 0.18s;
            }
            .lsp-recent-chip:hover {
                background: rgba(77,166,255,0.14);
                border-color: rgba(77,166,255,0.28);
                color: #7ab8ff;
            }

            @keyframes lsp-spin { to { transform: rotate(360deg); } }
            .lsp-spinner {
                width: 14px; height: 14px;
                border: 2px solid rgba(122,184,255,0.2);
                border-top-color: #7ab8ff;
                border-radius: 50%;
                animation: lsp-spin 0.7s linear infinite;
                display: inline-block;
            }
            .lsp-geo-spinner {
                width: 12px; height: 12px;
                border: 2px solid rgba(122,184,255,0.2);
                border-top-color: #7ab8ff;
                border-radius: 50%;
                animation: lsp-spin 0.7s linear infinite;
                display: inline-block;
                flex-shrink: 0;
            }
        `;
        document.head.appendChild(s);
    }

    // ─── DOM ─────────────────────────────────────────────────────────────────
    function _buildPanel() {
        const btn = document.createElement('button');
        btn.id = 'loc-search-btn';
        btn.innerHTML = `<span>🔍</span> Search Location`;
        document.body.appendChild(btn);

        const panel = document.createElement('div');
        panel.id = 'loc-search-panel';
        panel.innerHTML = `
            <div class="lsp-header">
                <div class="lsp-title"><span>📍</span><span>Location Intel Search</span></div>
                <button class="lsp-close" id="lsp-close-btn">✕</button>
            </div>

            <!-- Active pin indicator -->
            <div id="lsp-active-pin">
                <div class="pin-dot"></div>
                <div style="flex:1;min-width:0">
                    <div class="pin-name" id="lsp-pin-name">No location pinned</div>
                    <div class="pin-coords" id="lsp-pin-coords"></div>
                </div>
                <button class="pin-clear" id="lsp-pin-clear" title="Clear pin">✕</button>
            </div>

            <div class="lsp-tabs">
                <button class="lsp-tab active" data-tab="city">🏙 City Name</button>
                <button class="lsp-tab" data-tab="coords">🌐 Coordinates</button>
            </div>

            <!-- City tab -->
            <div id="lsp-city-section">
                <div class="lsp-field">
                    <span class="lsp-field-icon">🏙</span>
                    <input type="text" id="lsp-city-input"
                           placeholder="e.g. Mumbai, Tokyo, New York…"
                           autocomplete="off"/>
                </div>
            </div>

            <!-- Coords tab -->
            <div id="lsp-coords-section" style="display:none">
                <div class="lsp-coord-row">
                    <div class="lsp-field">
                        <span class="lsp-field-icon">↕</span>
                        <input type="number" id="lsp-lat-input"
                               placeholder="Latitude" min="-90" max="90" step="0.0001"/>
                    </div>
                    <div class="lsp-field">
                        <span class="lsp-field-icon">↔</span>
                        <input type="number" id="lsp-lng-input"
                               placeholder="Longitude" min="-180" max="180" step="0.0001"/>
                    </div>
                </div>
                <!-- Live reverse-geocode preview -->
                <div class="lsp-geo-preview hidden" id="lsp-geo-preview">
                    <span>🗺</span>
                    <span class="lsp-geo-preview-text" id="lsp-geo-text">Enter coordinates above</span>
                </div>
            </div>

            <button class="lsp-submit" id="lsp-submit-btn">
                <span id="lsp-submit-icon">🚀</span>
                <span id="lsp-submit-text">EXPLORE LOCATION</span>
            </button>
            <div class="lsp-status" id="lsp-status"></div>

            <div class="lsp-recent" id="lsp-recent" style="display:none">
                <div class="lsp-recent-label">Recent searches</div>
                <div class="lsp-recent-chips" id="lsp-recent-chips"></div>
            </div>
        `;
        document.body.appendChild(panel);
    }

    // ─── events ───────────────────────────────────────────────────────────────
    let _revDebounce = null;

    function _bindEvents() {
        document.getElementById('loc-search-btn').addEventListener('click', _toggle);
        document.getElementById('lsp-close-btn').addEventListener('click', _close);
        document.getElementById('lsp-pin-clear').addEventListener('click', clearPin);
        document.getElementById('lsp-submit-btn').addEventListener('click', _handleSubmit);

        // Outside-click to close
        document.addEventListener('click', e => {
            const p = document.getElementById('loc-search-panel');
            const b = document.getElementById('loc-search-btn');
            if (_isOpen && p && !p.contains(e.target) && e.target !== b) _close();
        });

        // Tab switching
        document.querySelectorAll('.lsp-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.lsp-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const m = tab.dataset.tab;
                document.getElementById('lsp-city-section').style.display   = m === 'city'   ? '' : 'none';
                document.getElementById('lsp-coords-section').style.display = m === 'coords' ? '' : 'none';
                _setStatus('');
            });
        });

        // Enter key on all inputs
        ['lsp-city-input','lsp-lat-input','lsp-lng-input'].forEach(id =>
            document.getElementById(id)?.addEventListener('keydown', e => {
                if (e.key === 'Enter') _handleSubmit();
            })
        );

        // Live reverse-geocode as user types coords
        ['lsp-lat-input','lsp-lng-input'].forEach(id =>
            document.getElementById(id)?.addEventListener('input', () => {
                clearTimeout(_revDebounce);
                _revDebounce = setTimeout(_liveReverseGeocode, 650);
            })
        );

        _renderRecent();
    }

    // Live reverse-geocode preview while typing coordinates
    async function _liveReverseGeocode() {
        const lat = parseFloat(document.getElementById('lsp-lat-input').value);
        const lng = parseFloat(document.getElementById('lsp-lng-input').value);
        const preview  = document.getElementById('lsp-geo-preview');
        const preText  = document.getElementById('lsp-geo-text');
        if (!preview || !preText) return;

        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            preview.classList.add('hidden');
            return;
        }
        preview.classList.remove('hidden');
        preText.innerHTML = `<span class="lsp-geo-spinner"></span>&nbsp;Resolving…`;

        const name = await _reverseGeocode(lat, lng);
        preText.textContent = name || `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
    }

    // ─── submit ───────────────────────────────────────────────────────────────
    async function _handleSubmit() {
        if (_isLoading) return;
        const tab = document.querySelector('.lsp-tab.active')?.dataset.tab;
        let lat, lng, label;

        if (tab === 'city') {
            const city = document.getElementById('lsp-city-input').value.trim();
            if (!city) { _setStatus('Please enter a city name.', 'error'); return; }
            _setLoading(true);
            _setStatus('Geocoding…', 'info');
            const res = await _geocodeCity(city);
            if (!res) {
                _setStatus(`Could not find "${city}". Try a different spelling.`, 'error');
                _setLoading(false);
                return;
            }
            ({ lat, lng, label } = res);
        } else {
            lat = parseFloat(document.getElementById('lsp-lat-input').value);
            lng = parseFloat(document.getElementById('lsp-lng-input').value);
            if (isNaN(lat) || isNaN(lng))  { _setStatus('Enter valid coordinates.', 'error'); return; }
            if (lat < -90  || lat > 90)    { _setStatus('Latitude: −90 to 90.', 'error'); return; }
            if (lng < -180 || lng > 180)   { _setStatus('Longitude: −180 to 180.', 'error'); return; }
            _setLoading(true);
            _setStatus('Resolving place name…', 'info');
            // Always reverse-geocode so we show a real name instead of raw numbers
            const name = await _reverseGeocode(lat, lng);
            label = name || `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
        }

        _setStatus(`Loading intel for ${label}…`, 'info');
        try {
            _flyGlobeTo(lat, lng);
            plantPin(lat, lng, label);

            if (typeof window._onGlobeLocationClick === 'function') {
                window._onGlobeLocationClick(lat, lng);
            }
            if (window.LiveDataManager) LiveDataManager.updateLocationData(lat, lng);

            _saveRecent(label, lat, lng);
            _renderRecent();
            _setStatus(`✅ ${label}`, 'ok');
            setTimeout(_close, 1400);
        } catch (err) {
            console.error('[LocationSearch]', err);
            _setStatus('Something went wrong. Try again.', 'error');
        }
        _setLoading(false);
    }

    // ─── geocoding ────────────────────────────────────────────────────────────
    async function _geocodeCity(city) {
        try {
            const r = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
                { headers: { 'Accept-Language': 'en', 'User-Agent': 'AstroView/1.0' } }
            );
            const j = await r.json();
            if (!j?.[0]) return null;
            return {
                lat:   parseFloat(j[0].lat),
                lng:   parseFloat(j[0].lon),
                label: j[0].display_name.split(',').slice(0, 2).join(',').trim()
            };
        } catch { return null; }
    }

    async function _reverseGeocode(lat, lng) {
        try {
            const r = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
                { headers: { 'Accept-Language': 'en', 'User-Agent': 'AstroView/1.0' } }
            );
            const j = await r.json();
            const a = j.address || {};
            return [a.city || a.town || a.village || a.county || a.state, a.country]
                .filter(Boolean).join(', ')
                || j.display_name?.split(',').slice(0, 2).join(', ') || null;
        } catch { return null; }
    }

    // ─── globe camera ─────────────────────────────────────────────────────────
    function _flyGlobeTo(lat, lng) {
        try {
            if (window.GlobeView?.isReady()) {
                const g = GlobeView._getGlobeInstance?.();
                if (g?.pointOfView) { g.pointOfView({ lat, lng, altitude: 1.8 }, 1200); return; }
            }
        } catch (e) { console.warn('[LocationSearch] camera fly:', e); }
    }

    // ─── globe pin (PUBLIC) ───────────────────────────────────────────────────
    /**
     * Plant a glowing pin on the globe.
     * Called from search submit AND from app.js _onGlobeLocationClick (globe click).
     *
     * @param {number} lat
     * @param {number} lng
     * @param {string} label   Display name (city / "lat, lng" / reverse-geocoded)
     */
    function plantPin(lat, lng, label) {
        _currentPin = { lat, lng, label };

        // Update badge inside panel
        const badge  = document.getElementById('lsp-active-pin');
        const name   = document.getElementById('lsp-pin-name');
        const coords = document.getElementById('lsp-pin-coords');
        if (badge) {
            if (name)   name.textContent   = label || `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
            if (coords) coords.textContent = `${lat.toFixed(4)}°  ${lng.toFixed(4)}°`;
            badge.classList.add('visible');
        }

        // Tell GlobeView to draw the pin
        if (window.GlobeView?.isReady()) {
            GlobeView.setLocationPin({ lat, lng, label });
        }
    }

    function clearPin() {
        _currentPin = null;
        document.getElementById('lsp-active-pin')?.classList.remove('visible');
        if (window.GlobeView?.isReady()) GlobeView.setLocationPin(null);
    }

    // ─── loading helpers ──────────────────────────────────────────────────────
    function _setLoading(on) {
        _isLoading = on;
        const btn  = document.getElementById('lsp-submit-btn');
        const icon = document.getElementById('lsp-submit-icon');
        const text = document.getElementById('lsp-submit-text');
        if (!btn) return;
        btn.disabled = on;
        if (on) {
            if (icon) icon.outerHTML = '<span id="lsp-submit-icon" class="lsp-spinner"></span>';
            if (text) text.textContent = 'LOADING…';
        } else {
            const el = document.getElementById('lsp-submit-icon');
            if (el)   el.outerHTML   = '<span id="lsp-submit-icon">🚀</span>';
            if (text) text.textContent = 'EXPLORE LOCATION';
        }
    }

    function _setStatus(msg, type = '') {
        const el = document.getElementById('lsp-status');
        if (el) { el.textContent = msg; el.className = `lsp-status ${type}`; }
    }

    // ─── recent searches ──────────────────────────────────────────────────────
    function _saveRecent(label, lat, lng) {
        try {
            let r = JSON.parse(localStorage.getItem('av_recent_locations') || '[]');
            r = r.filter(x => x.label !== label);
            r.unshift({ label, lat, lng });
            localStorage.setItem('av_recent_locations', JSON.stringify(r.slice(0, 6)));
        } catch (_) {}
    }

    function _renderRecent() {
        let recent = [];
        try { recent = JSON.parse(localStorage.getItem('av_recent_locations') || '[]'); } catch {}
        const wrap  = document.getElementById('lsp-recent');
        const chips = document.getElementById('lsp-recent-chips');
        if (!wrap || !chips) return;
        if (!recent.length) { wrap.style.display = 'none'; return; }
        wrap.style.display = '';
        chips.innerHTML = recent.map(r => `
            <div class="lsp-recent-chip"
                 data-lat="${r.lat}" data-lng="${r.lng}" data-label="${r.label}">
                📍 ${r.label}
            </div>`).join('');
        chips.querySelectorAll('.lsp-recent-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const lat   = parseFloat(chip.dataset.lat);
                const lng   = parseFloat(chip.dataset.lng);
                const label = chip.dataset.label;
                _flyGlobeTo(lat, lng);
                plantPin(lat, lng, label);
                if (window._onGlobeLocationClick) window._onGlobeLocationClick(lat, lng);
                if (window.LiveDataManager) LiveDataManager.updateLocationData(lat, lng);
                _close();
            });
        });
    }

    // ─── open / close ─────────────────────────────────────────────────────────
    function _toggle() { if (_isOpen) _close(); else _open(); }

    function _open() {
        _isOpen = true;
        document.getElementById('loc-search-panel')?.classList.add('open');
        _renderRecent();
        setTimeout(() => document.getElementById('lsp-city-input')?.focus(), 220);
    }

    function _close() {
        _isOpen = false;
        document.getElementById('loc-search-panel')?.classList.remove('open');
        _setStatus('');
    }

    // ─── earth mode ───────────────────────────────────────────────────────────
    function showForEarth() {
        document.getElementById('loc-search-btn')?.classList.add('earth-active');
    }
    function hideForEarth() {
        document.getElementById('loc-search-btn')?.classList.remove('earth-active');
        _close();
    }

    return { init, showForEarth, hideForEarth, plantPin, clearPin };
})();

window.LocationSearch = LocationSearch;