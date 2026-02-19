// app.js — AstroView (fully updated with SpaceDevs event visibility)

// ═══════════════════════════════════════════
//  GLOBAL STATE
// ═══════════════════════════════════════════
const STATE = {
    mode:   'solar',
    layers: { iss: true, disasters: true, neo: true, cme: false, launches: false },
    keys: {
        nasa:    localStorage.getItem('av_nasa'),
        weather: localStorage.getItem('av_weather') || '',
        city:    localStorage.getItem('av_city')    || '',
    },
    globeBuilt: false,
    dataReady:  false,
};

// ═══════════════════════════════════════════
//  LOADING SCREEN
// ═══════════════════════════════════════════
const LOAD_MSGS = [
    'Calibrating orbital mechanics…',
    'Connecting NASA data feeds…',
    'Loading Earth textures…',
    'Fetching ISS position…',
    'Scanning near-Earth objects…',
    'Connecting to SpaceDevs event database…',
    'System ready.',
];
let _loadIdx = 0;

function _tickLoad() {
    _loadIdx++;
    const pct = (_loadIdx / LOAD_MSGS.length) * 100;
    document.getElementById('ldfill').style.width = pct + '%';
    document.getElementById('ldmsg').textContent  = LOAD_MSGS[Math.min(_loadIdx, LOAD_MSGS.length - 1)];
    if (_loadIdx < LOAD_MSGS.length) setTimeout(_tickLoad, 380 + Math.random() * 180);
    else setTimeout(_finishLoad, 400);
}

function _finishLoad() {
    const el = document.getElementById('loading');
    el.style.opacity = '0'; el.style.transition = 'opacity 0.7s ease';
    setTimeout(() => el.remove(), 750);

    document.getElementById('key-nasa').value    = STATE.keys.nasa !== STATE.keys.nasa;
    document.getElementById('key-weather').value = STATE.keys.weather;
    document.getElementById('key-city').value    = STATE.keys.city;

    _loadAllData();

    // ISS polling
    useISSPosition.start(pos => {
        useNASAData.updateISS(pos);
        document.getElementById('chip-iss').textContent =
            `ISS — ${pos.lat.toFixed(2)}°, ${pos.lng.toFixed(2)}° ${pos.live === false ? '(offline)' : '· live'}`;
        if (STATE.mode === 'earth' && GlobeView.isReady()) {
            GlobeView.updateISS(pos, _currentGlobeData());
        }
    });
}

function formatDuration(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0 sec';

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0)          return `${h}h`;
    if (m > 0 && s > 0) return `${m}m ${s}s`;
    if (m > 0)          return `${m}m`;
    return `${s}s`;
}


// ═══════════════════════════════════════════
//  DATA LOADING
// ═══════════════════════════════════════════
async function _loadAllData() {
    const data = await useNASAData.loadAll(STATE.keys);

    STATE.dataReady = true;

    const disCount = data.disasters?.length || 0;
    const neoCount = data.neo?.length       || 0;
    const hazCount = data.neo?.filter(a => a.is_potentially_hazardous_asteroid)?.length || 0;

    document.getElementById('chip-dis').textContent = `${disCount} active disaster events`;
    document.getElementById('chip-neo').textContent = `${neoCount} NEOs tracked (${hazCount} hazardous)`;

    if (STATE.mode === 'earth') {
        _updateEarthSidebarData();
    }

    if (hazCount > 0)
        _showAlert(`☄ ${hazCount} potentially hazardous asteroid(s) detected this week`);
    const crit = data.disasters?.filter(e => {
        const c = e.categories?.[0]?.title;
        return c === 'Wildfires' || c === 'Severe Storms';
    }) || [];
    if (crit.length > 0)
        setTimeout(() => _showAlert(`🔥 ${crit.length} critical events active — switch to Earth Intel Mode`), 3500);
    if (data.cme?.length > 0)
        setTimeout(() => _showAlert(`🌩 ${data.cme.length} CME(s) detected — satellite/aurora impact possible`), 7000);

    if (STATE.mode === 'earth') {
        _ensureGlobeAndRefresh();
    }
}

function _ensureGlobeAndRefresh() {
    if (!STATE.globeBuilt) {
        GlobeView.init('globeViz', _onMarkerClick, _onGlobeLocationClick);
        STATE.globeBuilt = true;
    }
    setTimeout(() => {
        GlobeView.refresh(_currentGlobeData(), STATE.layers);
    }, 200);
}

function _currentGlobeData() {
    return {
        disasters: useNASAData.get('disasters') || [],
        neo:       useNASAData.get('neo')       || [],
        cme:       useNASAData.get('cme')       || [],
        iss:       useISSPosition.getLastPosition() || useNASAData.get('iss'),
    };
}

// ═══════════════════════════════════════════
//  API KEY SAVE
// ═══════════════════════════════════════════
function saveKeys() {
    const n = document.getElementById('key-nasa').value.trim();
    const w = document.getElementById('key-weather').value.trim();
    const c = document.getElementById('key-city').value.trim();
    if (n) { STATE.keys.nasa = n;    localStorage.setItem('av_nasa', n); }
    if (w) { STATE.keys.weather = w; localStorage.setItem('av_weather', w); }
    if (c) { STATE.keys.city = c;    localStorage.setItem('av_city', c); }
    CacheMiddleware.clear();
    document.getElementById('apiModal').classList.remove('show');
    _showAlert('Keys saved — refreshing live data…', 'info');
    _loadAllData();
}

// ═══════════════════════════════════════════
//  ALERTS
// ═══════════════════════════════════════════
function _showAlert(msg, type = 'warn') {
    const el = document.createElement('div');
    el.className = `alert${type === 'info' ? ' info' : ''}`;
    el.textContent = msg;
    document.getElementById('alert-wrap').appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0'; el.style.transition = 'opacity 0.5s';
        setTimeout(() => el.remove(), 550);
    }, 6000);
}

// ═══════════════════════════════════════════
//  MODE SWITCHING
// ═══════════════════════════════════════════
function goSolar() {
    console.log('Switching to Solar System mode...');
    
    STATE.mode = 'solar';
    document.getElementById('btn-solar').classList.add('active');
    document.getElementById('btn-earth').classList.remove('active');
    document.getElementById('btn-impact').classList.remove('active');
    
    // Hide other modes
    document.getElementById('earth-wrap').classList.add('hidden');
    document.getElementById('impact-wrap').classList.add('hidden');
    
    // Show solar mode
    document.getElementById('solar-wrap').classList.remove('hidden');
    
    // Hide Earth-specific UI elements
    document.getElementById('layers').classList.remove('show');
    document.getElementById('chips').classList.remove('show');
    document.getElementById('hint').textContent = 'Click any planet to explore · Earth opens Intel Mode';
    
    closePanel();
    closeEarthSidebar();
    
    // Ensure solar animation is running
    if (!_solarRaf) {
        _solarLoop();
    }
}

function goEarth() {
    console.log('Switching to Earth Intel mode...');
    
    STATE.mode = 'earth';
    document.getElementById('btn-earth').classList.add('active');
    document.getElementById('btn-solar').classList.remove('active');
    document.getElementById('btn-impact').classList.remove('active');
    
    // Hide other modes
    document.getElementById('solar-wrap').classList.add('hidden');
    document.getElementById('impact-wrap').classList.add('hidden');
    
    // Show Earth mode
    document.getElementById('earth-wrap').classList.remove('hidden');
    
    // Show Earth-specific UI elements
    document.getElementById('layers').classList.add('show');
    document.getElementById('chips').classList.add('show');
    document.getElementById('hint').textContent = 'Click anywhere on Earth for local space intel · Click markers for live events';
    
    closePanel();
    
    // Show Earth info sidebar
    setTimeout(() => {
        document.getElementById('earth-info-sidebar').classList.add('show');
        _updateEarthSidebarData();
    }, 300);
    
    // Initialize or refresh globe
    _ensureGlobeAndRefresh();
}


function closeEarthSidebar() {
    document.getElementById('earth-info-sidebar').classList.remove('show');
}

function _updateEarthSidebarData() {
    const disasters = useNASAData.get('disasters') || [];
    const neo = useNASAData.get('neo') || [];
    
    document.getElementById('earth-disasters').textContent = disasters.length || '0';
    document.getElementById('earth-neos').textContent = neo.length || '0';
}

// ═══════════════════════════════════════════
//  LAYER TOGGLE
// ═══════════════════════════════════════════
let _launchInterval = null;

async function updateLaunchOverlay() {
    if (STATE.mode !== 'earth' || !STATE.layers.launches) return;
    
    try {
        const launches = await LaunchService.getUpcomingLaunches(20);
        if (launches && launches.length > 0) {
            GlobeView.updateLaunches(launches);
        }
    } catch (error) {
        console.error('Failed to update launch overlay:', error);
    }
}

// Add to your layer toggle function
function toggleLayer(name, btn) {
    STATE.layers[name] = !STATE.layers[name];
    btn.classList.toggle('on', STATE.layers[name]);
    
    if (STATE.mode === 'earth' && GlobeView.isReady()) {
        if (name === 'launches') {
            if (STATE.layers.launches) {
                updateLaunchOverlay();
                // Update launches every hour
                if (_launchInterval) clearInterval(_launchInterval);
                _launchInterval = setInterval(updateLaunchOverlay, 60 * 60 * 1000);
            } else {
                if (_launchInterval) {
                    clearInterval(_launchInterval);
                    _launchInterval = null;
                }
                GlobeView.clearLaunches();
            }
        }
        
        GlobeView.setLayer(name, STATE.layers[name], _currentGlobeData());
    }
}

// ═══════════════════════════════════════════
//  MARKER CLICK → PANEL
// ═══════════════════════════════════════════
// Update the _onMarkerClick function in app.js

function _onMarkerClick(d) {
    if (d.type === 'iss') {
        _panelISS(d.raw);
    } else if (d.type === 'disaster') {
        _panelDisaster(d.raw, d.style, d.cat);
    } else if (d.type === 'neo') {
        // Use NEOVisualization for detailed panel
        if (window.NEOVisualization) {
            const html = NEOVisualization.generateNEOInfoPanel(d.raw);
            showPanel(html);
        } else {
            _panelNEO(d.raw, d.style);
        }
    } else if (d.type === 'launch' && window._showLaunchDetail) {
        window._showLaunchDetail(d.raw);
    }
}

// ═══════════════════════════════════════════
//  API FETCH FUNCTIONS FOR LOCATION
// ═══════════════════════════════════════════

async function _fetchSkyEvents(lat, lng) {
    try {
        const response = await fetch(`/api/sky-tonight/events?lat=${lat}&lon=${lng}`);
        if (!response.ok) throw new Error('Sky events fetch failed');
        return await response.json();
    } catch (error) {
        console.warn('Sky events error:', error);
        return null;
    }
}

async function _fetchSpaceWeather(lat, lng) {
    try {
        const response = await fetch(`/api/space-weather/location?lat=${lat}&lon=${lng}`);
        if (!response.ok) throw new Error('Space weather fetch failed');
        return await response.json();
    } catch (error) {
        console.warn('Space weather error:', error);
        return null;
    }
}

async function _fetchImpactRisk(lat, lng) {
    try {
        const response = await fetch(`/api/impact/risk?lat=${lat}&lon=${lng}`);
        if (!response.ok) throw new Error('Impact risk fetch failed');
        return await response.json();
    } catch (error) {
        console.warn('Impact risk error:', error);
        return null;
    }
}

async function _fetchLocationVisibility(lat, lng) {
    // Computes approximate night hours + moon phase from lat/date alone.
    // No API key needed — pure astronomy math.
    try {
        const now        = new Date();
        const moonPct    = (VisibilityScore.compute(null).moonPct || 0) / 100;
        const dayOfYear  = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
        const dec        = 23.45 * Math.sin(((dayOfYear - 81) * 360 / 365) * Math.PI / 180); // solar declination
        const latRad     = lat * Math.PI / 180;
        const decRad     = dec * Math.PI / 180;

        let nightHours = 12;
        try {
            const cosHA = -Math.tan(latRad) * Math.tan(decRad);
            if      (cosHA < -1) nightHours = 0;   // polar day
            else if (cosHA >  1) nightHours = 24;  // polar night
            else nightHours = Math.round(24 - (2 / 15) * (Math.acos(cosHA) * 180 / Math.PI));
        } catch (_) { /* keep default 12 */ }

        const PHASES = [
            { icon: '🌑', name: 'New Moon',        max: 0.06 },
            { icon: '🌒', name: 'Waxing Crescent', max: 0.25 },
            { icon: '🌓', name: 'First Quarter',   max: 0.31 },
            { icon: '🌔', name: 'Waxing Gibbous',  max: 0.50 },
            { icon: '🌕', name: 'Full Moon',        max: 0.56 },
            { icon: '🌖', name: 'Waning Gibbous',  max: 0.75 },
            { icon: '🌗', name: 'Last Quarter',     max: 0.81 },
            { icon: '🌘', name: 'Waning Crescent',  max: 1.00 },
        ];
        const moonPhase = PHASES.find(p => moonPct <= p.max) || PHASES[7];

        let nightDesc = `${nightHours} hours of darkness expected tonight.`;
        if (nightHours < 6)  nightDesc += ' Short night — limited observation window.';
        if (nightHours > 14) nightDesc += ' Long night — excellent for extended observation.';

        return { analysis: { night_hours: nightHours, moon_phase: moonPhase, night_description: nightDesc } };
    } catch (err) {
        console.warn('_fetchLocationVisibility error:', err);
        return { analysis: { night_hours: 12, moon_phase: { icon: '🌑', name: 'Unknown' }, night_description: 'Night data unavailable.' } };
    }
}

async function _fetchSpaceDevsEvents(lat, lng, days = 90) {
    try {
        const response = await fetch(`/api/events/location?lat=${lat}&lon=${lng}&days=${days}`);
        if (!response.ok) throw new Error('SpaceDevs events fetch failed');
        return await response.json();
    } catch (error) {
        console.warn('SpaceDevs events error:', error);
        return null;
    }
}

// ═══════════════════════════════════════════
//  EARTH LOCATION CLICK — WITH SPACEDEVS EVENTS
// ═══════════════════════════════════════════
async function _onGlobeLocationClick(lat, lng) {
    // Show skeleton immediately
    showPanel(`
        <div class="ptag earth">📍 LOCATION INTEL</div>
        <div class="ptitle loc-title">Scanning location…</div>
        <div class="psub">${lat.toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${lng.toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}</div>
        <div class="loc-loading">
            <div class="loc-spinner-ring"></div>
            <div class="loc-spinner-msg">Querying space databases, weather & events…</div>
        </div>
        <div class="loc-skeleton-rows">
            <div class="skel-row"></div><div class="skel-row short"></div>
            <div class="skel-row"></div><div class="skel-row short"></div>
            <div class="skel-row"></div>
        </div>
    `);

    // ─────────────────────────────────────────────────────────────
    //  FIX: Exact 9-variable ↔ 9-entry Promise.all mapping
    //  Old code had 9 variables but only 6 Promise.all entries.
    // ─────────────────────────────────────────────────────────────
    const [
        geoName,             // [0]
        weatherData,         // [1]
        issPass,             // [2]
        spaceDevsEvents,     // [3]
        spaceWeather,        // [4]  ← was MISSING from old Promise.all
        locationVisibility,  // [5]  ← was MISSING + _fetchLocationVisibility was undefined
        impactRisk,          // [6]  ← was MISSING from old Promise.all
        satellitePasses,     // [7]  ← was at wrong index in old code
        nearbyLaunches       // [8]  ← was always undefined in old code
    ] = await Promise.all([
        _reverseGeocode(lat, lng),           // [0]
        _fetchLocationWeather(lat, lng),     // [1]
        _fetchISSPass(lat, lng),             // [2]
        _fetchSpaceDevsEvents(lat, lng),     // [3]
        _fetchSpaceWeather(lat, lng),        // [4]  ← ADDED
        _fetchLocationVisibility(lat, lng),  // [5]  ← ADDED (new function above)
        _fetchImpactRisk(lat, lng),          // [6]  ← ADDED
        _fetchSatellitePasses(lat, lng),     // [7]
        _fetchNearbyLaunches(lat, lng)       // [8]
    ]);

    const vis          = VisibilityScore.compute(weatherData);
    const neo          = useNASAData.get('neo') || [];
    const issNow       = useNASAData.get('iss') || useISSPosition.getLastPosition();
    const nearDisaster = _findNearestDisaster(lat, lng);
    const sc           = vis.score > 70 ? 'var(--green)' : vis.score > 45 ? 'var(--gold)' : 'var(--red)';
    const displayName  = geoName || `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
    const coords       = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`;

    let html = `
        <div class="ptag earth">📍 LOCATION INTEL</div>
        <div class="ptitle loc-title">${displayName}</div>
        <div class="psub" style="margin-bottom:4px">${coords}</div>`;

    // ── 1. SKY TONIGHT ───────────────────────────────────────────────────
    html += `<div class="div"></div><div class="loc-section-head">🌌 Sky Tonight</div>`;

    if (weatherData) {
        const tempC  = Math.round(weatherData.main?.temp || 0);
        const clouds = weatherData.clouds?.all ?? 0;
        const desc   = _cap(weatherData.weather?.[0]?.description || '');
        html += `
        <div class="loc-sky-card" style="--sky-score:${vis.score}">
            <div class="loc-sky-score" style="color:${sc}">${vis.score}<span>/100</span></div>
            <div class="loc-sky-info">
                <div class="loc-sky-label" style="color:${sc}">${vis.label} viewing conditions</div>
                <div class="loc-sky-desc">${vis.message}</div>
                <div class="loc-sky-weather">${desc} · ${tempC}°C · ${clouds}% cloud · ${Math.round(weatherData.wind?.speed || 0)} m/s wind</div>
            </div>
        </div>
        <div class="loc-moon-row">🌙 ${VisibilityScore.moonDescription(vis.moonPct / 100)}</div>`;
    } else {
        html += `
        <div class="loc-no-weather">
            <div class="loc-no-weather-icon">🌤</div>
            <div>
                <div style="font-weight:600;margin-bottom:4px">Add OpenWeather key for live sky conditions</div>
                <div style="font-size:.78rem;color:var(--muted)">Click <strong>⚙ API Keys</strong> → paste your free key from openweathermap.org</div>
            </div>
        </div>
        <div class="loc-moon-row">🌙 ${VisibilityScore.moonDescription(vis.moonPct / 100)}</div>`;
    }

    // ── 2. LOCATION VISIBILITY ANALYSIS (now populated) ──────────────────
    if (locationVisibility?.analysis) {
        const a = locationVisibility.analysis;
        html += `
        <div class="fgrid" style="margin-top:12px">
            <div class="fcard"><div class="flbl">Night duration</div><div class="fval">${a.night_hours}h</div></div>
            <div class="fcard"><div class="flbl">Moon phase</div><div class="fval">${a.moon_phase?.icon || '🌑'} ${a.moon_phase?.name || ''}</div></div>
        </div>
        <div class="ibox blue">${a.night_description}</div>`;
    }

    // ── 3. SPACE DEVS EVENTS ─────────────────────────────────────────────
    if (spaceDevsEvents?.events?.length > 0) {
        html += `<div class="div"></div><div class="loc-section-head">🚀 Events Visible From Here</div>`;
        const upcoming = spaceDevsEvents.events.filter(e => new Date(e.date) > new Date()).slice(0, 5);

        upcoming.forEach(event => {
            const ed          = new Date(event.date);
            const dateStr     = ed.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
            const timeStr     = ed.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', timeZone:'UTC' });
            const evVis       = event.visibility || {};
            const isHighlight = event.type?.name === 'EVA' || event.type?.name === 'Docking' || event.name?.toLowerCase().includes('launch');
            let visText = 'Check local time';

            if (evVis.visibilityWindows?.[0]?.start) {
                const s = new Date(evVis.visibilityWindows[0].start).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', timeZone:'UTC' });
                const e = new Date(evVis.visibilityWindows[0].end).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', timeZone:'UTC' });
                visText = `${s} – ${e} UTC`;
            }

            html += `
            <div class="loc-event-card" style="background:${isHighlight ? 'rgba(100,150,255,0.15)' : 'rgba(30,40,60,0.6)'};border-radius:12px;padding:12px;margin-bottom:10px;border-left:4px solid ${isHighlight ? 'var(--green)' : 'var(--gold)'};cursor:pointer;" onclick="window.open('${event.url || '#'}','_blank')">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <span style="font-weight:600;font-size:0.9rem;">${event.name}</span>
                    <span style="font-size:0.7rem;background:rgba(255,255,255,0.1);padding:3px 8px;border-radius:12px;color:var(--muted);">${event.type?.name || 'Event'}</span>
                </div>
                <div style="font-size:0.75rem;color:var(--muted);margin-bottom:8px;line-height:1.4;">${event.description ? event.description.substring(0, 120) + (event.description.length > 120 ? '…' : '') : 'No description available'}</div>
                <div style="display:flex;gap:16px;font-size:0.75rem;flex-wrap:wrap;">
                    <div>📅 ${dateStr}</div><div>⏰ ${timeStr} UTC</div>
                    <div style="color:var(--green);">👁️ ${visText}</div>
                </div>
                ${event.location ? `<div style="font-size:0.7rem;color:var(--muted);margin-top:8px;">📍 ${event.location}</div>` : ''}
                ${evVis.bestViewing ? `<div style="font-size:0.7rem;color:var(--muted);margin-top:6px;background:rgba(0,0,0,0.2);padding:6px;border-radius:6px;">🔭 ${evVis.bestViewing}</div>` : ''}
            </div>`;
        });

        if (spaceDevsEvents.events.length > 5) {
            html += `<div class="ibox blue" style="text-align:center;cursor:pointer;" onclick="window.open('https://ll.thespacedevs.com','_blank')">+ ${spaceDevsEvents.events.length - 5} more events — click to see all</div>`;
        }
    }

    // ── 4. ISS PASS ──────────────────────────────────────────────────────
    html += `<div class="div"></div><div class="loc-section-head">🛸 ISS Pass</div>`;

    if (issPass?.response?.[0]) {
        const pass    = issPass.response[0];
        const pd      = new Date(pass.risetime * 1000);
        const canSee  = vis.score > 35 && !!weatherData;
        html += `
        <div class="loc-iss-pass">
            <div class="loc-iss-time">
                <div class="loc-iss-timeval">${pd.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}</div>
                <div class="loc-iss-timedate">${pd.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' })}</div>
            </div>
            <div class="loc-iss-details">
                <div class="loc-iss-dur">Visible for ~${formatDuration(pass.duration)}</div>
                <div class="loc-iss-canSee" style="color:${canSee ? 'var(--green)' : 'var(--gold)'}">
                    ${canSee ? '✅ Conditions suitable for naked-eye viewing' : '⛅ May be obscured by cloud cover'}
                </div>
            </div>
        </div>
        <div class="ibox blue">Look for a fast, non-blinking bright dot crossing the sky. The ISS is the 3rd-brightest object in the sky.</div>`;
    } else if (issNow) {
        const distKm = Math.round(Math.sqrt(Math.pow(lat - issNow.lat, 2) + Math.pow(lng - issNow.lng, 2)) * 111);
        html += `
        <div class="fgrid">
            <div class="fcard"><div class="flbl">Current Distance</div><div class="fval">~${distKm.toLocaleString()} km</div></div>
            <div class="fcard"><div class="flbl">ISS Altitude</div><div class="fval">408 km</div></div>
        </div>
        <div class="ibox blue">ISS is ~${distKm.toLocaleString()} km away. It completes a full orbit every 92 minutes.</div>`;
    }

    // ── 5. SATELLITE PASSES (now actually populated) ──────────────────────
    html += `<div class="div"></div><div class="loc-section-head">🛰️ Upcoming Satellite Passes</div>`;

    html += `<div class="div"></div><div class="loc-section-head">🛰️ Upcoming Satellite Passes</div>`;

    if (satellitePasses?.length > 0) {
        satellitePasses.forEach(({ satellite, passes }) => {
            if (!passes?.length) return;

            const np       = passes[0];
            const pd       = new Date(np.startUTC * 1000);
            const score    = N2YOService.calculatePassScore(np);
            const scoreCol = score > 70 ? 'var(--green)' : score > 40 ? 'var(--gold)' : 'var(--red)';

            // Duration: endUTC - startUTC in seconds
            const durationSec = (np.endUTC || 0) - (np.startUTC || 0);
            const durationStr = formatDuration(durationSec);

            // Magnitude: N2YO returns 100000 when unknown/not applicable
            const rawMag  = np.mag;
            const magStr  = (rawMag === undefined || rawMag === null || rawMag >= 9999)
                            ? 'N/A'
                            : (typeof rawMag === 'number' ? rawMag.toFixed(1) : rawMag);

            // Flag very long durations — these are likely geostationary/high-orbit sats
            // where "duration" means something different (continuously above horizon)
            const isGEO        = durationSec > 3600 * 6; // > 6 hours = almost certainly GEO
            const durationLabel = isGEO
                ? `${durationStr} (high-orbit / always visible)`
                : `${durationStr} above horizon`;

            const dateStr = pd.toLocaleDateString([], { month: 'short', day: 'numeric' });
            const timeStr = pd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            html += `
            <div style="
                background: rgba(30,40,60,0.6);
                border-radius: 12px;
                padding: 12px;
                margin-bottom: 10px;
                border-left: 4px solid ${satellite.color || '#94a3b8'};
            ">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                    <span style="font-size:1.2rem;">${satellite.icon || '🛰️'}</span>
                    <span style="font-weight:600;">${satellite.name}</span>
                    <span style="font-size:0.7rem; background:rgba(255,255,255,0.1); padding:2px 8px; border-radius:12px;">
                        ${satellite.category}
                    </span>
                </div>

                <div style="display:flex; gap:14px; font-size:0.8rem; flex-wrap:wrap; margin-bottom:6px;">
                    <div>📅 ${dateStr} at ${timeStr}</div>
                    <div>📐 Max elevation: ${np.maxEl}°</div>
                    <div>✨ Brightness: ${magStr === 'N/A' ? '<span style="color:var(--muted)">N/A</span>' : `mag ${magStr}`}</div>
                    <div>⭐ Score: <span style="color:${scoreCol}; font-weight:600;">${score}/100</span></div>
                </div>

                <div style="
                    background: rgba(0,0,0,0.25);
                    border-radius: 8px;
                    padding: 8px 10px;
                    font-size: 0.78rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: ${isGEO ? 'var(--muted)' : 'var(--text)'};
                ">
                    <span>⏱️</span>
                    <span>Visible for <strong>${durationLabel}</strong></span>
                </div>

                <div style="font-size:0.7rem; color:var(--muted); margin-top:8px;">
                    Direction: ${np.startAzCompass} → ${np.maxAzCompass} → ${np.endAzCompass}
                </div>
            </div>`;
        });
    } else {
        html += `
        <div class="ibox blue">
            No satellite pass data available. Ensure <code>N2YO_API_KEY</code> is set
            in your <code>.env</code> file and the proxy server is running.
        </div>`;
    }

    // ── 6. NEARBY LAUNCHES (now actually populated) ───────────────────────
    if (nearbyLaunches?.length > 0) {
        html += `<div class="div"></div><div class="loc-section-head">🚀 Launches Near You</div>`;

        nearbyLaunches.forEach(launch => {
            const enhanced = launch.enhanced || {};
            const status   = enhanced.status || { color:'#94a3b8', icon:'🚀', name:'Scheduled' };
            const ld       = new Date(launch.net);
            const dateStr  = ld.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
            const timeStr  = ld.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', timeZone:'UTC' });

            html += `
            <div style="background:linear-gradient(145deg,rgba(30,40,60,0.8),rgba(20,30,50,0.9));border-radius:16px;padding:16px;margin-bottom:12px;border-left:4px solid ${status.color};border:1px solid rgba(255,255,255,0.05);cursor:pointer;" onclick="window.open('${launch.url || '#'}','_blank')">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:1.3rem;">${status.icon}</span>
                        <span style="font-weight:600;font-size:0.95rem;">${launch.name || 'Unnamed Launch'}</span>
                    </div>
                    <span style="background:${status.color}20;color:${status.color};padding:4px 10px;border-radius:20px;font-size:0.7rem;font-weight:600;">
                        ${enhanced.daysUntil > 0 ? LaunchService.formatLaunchDate(launch.net) : status.name}
                    </span>
                </div>
                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px;">
                    <div style="background:rgba(0,0,0,0.2);padding:8px;border-radius:8px;">
                        <div style="color:var(--muted);font-size:0.65rem;">🚀 ROCKET</div>
                        <div style="font-size:0.8rem;font-weight:500;">${enhanced.rocketName || launch.rocket?.configuration?.full_name || 'Unknown'}</div>
                    </div>
                    <div style="background:rgba(0,0,0,0.2);padding:8px;border-radius:8px;">
                        <div style="color:var(--muted);font-size:0.65rem;">🏢 AGENCY</div>
                        <div style="font-size:0.8rem;font-weight:500;">${enhanced.providerAbbrev || launch.launch_service_provider?.abbrev || 'Unknown'}</div>
                    </div>
                </div>
                <div style="background:rgba(0,0,0,0.2);padding:10px;border-radius:8px;font-size:0.75rem;display:flex;gap:12px;flex-wrap:wrap;">
                    <div>📅 ${dateStr}</div>
                    <div>⏰ ${timeStr} UTC</div>
                    <div>📍 ${enhanced.padName || launch.pad?.name || 'Unknown pad'}</div>
                    ${launch.distance ? `<div style="margin-left:auto;">📏 ${Math.round(launch.distance)} km away</div>` : ''}
                </div>
                ${enhanced.isSoon ? `
                <div style="margin-top:10px;background:linear-gradient(90deg,#f9731620,transparent);padding:6px 10px;border-radius:6px;font-size:0.7rem;color:#f97316;">
                    ⚠️ Launch happening soon! Check webcast for live coverage.
                </div>` : ''}
            </div>`;
        });

        html += `<div class="ibox blue" style="text-align:center;cursor:pointer;" onclick="window.open('https://launchlibrary.net','_blank')">🚀 See all upcoming launches at Launch Library</div>`;
    }

    // ── 7. SPACE WEATHER (now actually populated) ─────────────────────────
    if (spaceWeather?.aurora) {
        html += `
        <div class="div"></div>
        <div class="loc-section-head">☀️ Space Weather</div>
        <div class="loc-sw-grid">
            <div class="loc-sw-card">
                <div class="loc-sw-icon">🌌</div>
                <div class="loc-sw-label">Aurora</div>
                <div class="loc-sw-val" style="color:${spaceWeather.aurora.color}">${spaceWeather.aurora.probability}</div>
            </div>
            <div class="loc-sw-card">
                <div class="loc-sw-icon">☢</div>
                <div class="loc-sw-label">CME Activity</div>
                <div class="loc-sw-val">${spaceWeather.cme_activity?.count || 0} events</div>
            </div>
        </div>
        <div class="ibox ${spaceWeather.cme_activity?.count > 0 ? 'gold' : 'green'}">${spaceWeather.summary}</div>`;
    }

    // ── 8. IMPACT RISK (now actually populated) ───────────────────────────
    if (impactRisk?.hazardous_count > 0) {
        html += `
        <div class="div"></div>
        <div class="loc-section-head">☄ NEO Watch</div>
        <div class="ibox ${impactRisk.hazardous_count > 5 ? 'red' : 'gold'}">
            ${impactRisk.hazardous_count} potentially hazardous asteroids tracked this week.
            ${impactRisk.location_risk ? `Location risk: ${impactRisk.location_risk}` : ''}
        </div>`;
    }

    // ── 9. SPACE-EARTH CONNECTION ─────────────────────────────────────────
    html += `<div class="div"></div><div class="loc-section-head">🌍 Space-Earth Connection</div>`;

    if (nearDisaster) {
        const { event, distKm, style, cat } = nearDisaster;
        const risk = RiskCalculator.disaster(event);
        html += `
        <div class="loc-disaster-row">
            <span style="font-size:1.4rem">${style.icon}</span>
            <div style="flex:1">
                <div style="font-size:.82rem;font-weight:600;margin-bottom:3px">${event.title}</div>
                <div style="font-size:.74rem;color:var(--muted)">${cat} · ${distKm < 1000 ? `<span style="color:var(--red)">⚠️ ${distKm}km away</span>` : `${distKm.toLocaleString()}km away`}</div>
            </div>
            <div style="font-size:.7rem;color:${risk.color};font-weight:700;text-transform:uppercase">${risk.level}</div>
        </div>
        <div class="ibox ${distKm < 1000 ? 'red' : 'gold'}">
            ${distKm < 500  ? `⚠️ Active ${cat.toLowerCase()} within ${distKm}km. NASA satellites monitoring.` :
              distKm < 2000 ? `A ${cat.toLowerCase()} is ${distKm.toLocaleString()}km away.` :
                              `Nearest active event is ${distKm.toLocaleString()}km away.`}
        </div>`;
    } else {
        html += `<div class="ibox green">✅ No active NASA-tracked disaster events within range.</div>`;
    }

    html += `
        <div class="div"></div>
        <div style="font-size:0.65rem;color:var(--muted);text-align:center;padding:8px;">
            🌐 Data: NASA EONET · SpaceDevs · Open-Notify · OpenWeather · N2YO
        </div>`;

    showPanel(html);
}

// ═══════════════════════════════════════════
//  HELPER FUNCTIONS
// ═══════════════════════════════════════════

async function _reverseGeocode(lat, lng) {
    try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
            headers: { 'Accept-Language': 'en', 'User-Agent': 'AstroView/1.0' }
        });
        const j = await r.json();
        const a = j.address || {};
        return [a.city || a.town || a.village || a.county || a.state, a.country].filter(Boolean).join(', ')
               || j.display_name?.split(',').slice(0,2).join(', ') || null;
    } catch { return null; }
}

async function _fetchLocationWeather(lat, lng) {
    if (!STATE.keys.weather) return null;
    try {
        const r = await fetch(`/api/weather?lat=${lat}&lon=${lng}`);
        const j = await r.json();
        if (j.error) throw new Error(j.error);
        return j;
    } catch { return null; }
}

async function _fetchISSPass(lat, lng) {
    try {
        const r = await fetch(`/api/iss-pass?lat=${lat.toFixed(2)}&lon=${lng.toFixed(2)}`);
        const j = await r.json();
        return j;
    } catch { return null; }
}

function _findNearestDisaster(lat, lng) {
    const disasters = useNASAData.get('disasters') || [];
    let nearest = null, minDist = Infinity;
    disasters.forEach(ev => {
        const geo = ev.geometry?.[ev.geometry.length - 1];
        if (!geo?.coordinates) return;
        const [eLng, eLat] = geo.coordinates;
        const dist = Math.sqrt(Math.pow(lat - eLat, 2) + Math.pow(lng - eLng, 2)) * 111;
        if (dist < minDist) {
            minDist = dist;
            const cat   = ev.categories?.[0]?.title || 'Unknown';
            const style = Simplifier.category(cat);
            nearest = { event: ev, distKm: Math.round(dist), style, cat };
        }
    });
    return nearest;
}

function _cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

// ═══════════════════════════════════════════
//  PANEL HELPERS
// ═══════════════════════════════════════════
function showPanel(html) {
    document.getElementById('pbody').innerHTML = html;
    document.getElementById('panel').classList.add('open');
}
function closePanel() { document.getElementById('panel').classList.remove('open'); }

function _scoreBar(label, score, color) {
    return `<div class="sbar">
        <div class="sbar-row"><span>${label}</span><span style="color:${color}">${score}/100</span></div>
        <div class="strack"><div class="sfill" style="width:${score}%;background:${color}"></div></div>
    </div>`;
}

function _panelISS(raw) {
    const vis = VisibilityScore.compute(useNASAData.get('weather'));
    const sc  = vis.score > 70 ? 'var(--green)' : vis.score > 45 ? 'var(--gold)' : 'var(--red)';
    showPanel(`
        <div class="ptag iss"><span class="live-dot"></span>LIVE TRACKING</div>
        <div class="ptitle">International Space Station</div>
        <div class="psub">Orbiting at ~408 km altitude. One orbit every 92 minutes — 16 sunrises per day.</div>
        <div class="div"></div>
        <div class="fgrid">
            <div class="fcard"><div class="flbl">Latitude</div><div class="fval">${raw.lat.toFixed(4)}°</div></div>
            <div class="fcard"><div class="flbl">Longitude</div><div class="fval">${raw.lng.toFixed(4)}°</div></div>
            <div class="fcard"><div class="flbl">Altitude</div><div class="fval">~408 km</div></div>
            <div class="fcard"><div class="flbl">Speed</div><div class="fval">7.66 km/s</div></div>
            <div class="fcard"><div class="flbl">Crew</div><div class="fval">7 astronauts</div></div>
            <div class="fcard"><div class="flbl">Orbit</div><div class="fval">92 min</div></div>
        </div>
        <div class="ibox green">✅ The ISS is the 3rd-brightest object in the sky — moves fast, no blinking. Crosses the sky in ~6 minutes.</div>
        <div class="ibox blue">🔭 The ISS is a permanent lab studying space medicine, growing food in microgravity, and testing tech needed for Mars missions.</div>
        ${_scoreBar('Sky Visibility', vis.score, sc)}
        <div class="ibox ${vis.score > 60 ? 'green' : 'gold'}">${vis.message}</div>
    `);
}

function _panelDisaster(ev, style, cat) {
    const geo = ev.geometry?.[ev.geometry.length - 1];
    const [lng, lat] = geo?.coordinates || [0, 0];
    const risk = RiskCalculator.disaster(ev);
    const lastSeen = geo?.date ? new Date(geo.date).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : 'Unknown';
    showPanel(`
        <div class="ptag disaster">${style.icon} ACTIVE EVENT</div>
        <div class="ptitle">${ev.title}</div>
        <div class="psub">Detected via NASA satellite network. Category: ${cat}.</div>
        <div class="div"></div>
        <div class="fgrid">
            <div class="fcard"><div class="flbl">Category</div><div class="fval">${cat}</div></div>
            <div class="fcard"><div class="flbl">Status</div><div class="fval" style="color:${ev.closed===null?'#ff4455':'#00ff88'}">${ev.closed===null?'ONGOING':'CLOSED'}</div></div>
            <div class="fcard"><div class="flbl">Lat</div><div class="fval">${lat.toFixed(2)}°</div></div>
            <div class="fcard"><div class="flbl">Lng</div><div class="fval">${lng.toFixed(2)}°</div></div>
            <div class="fcard"><div class="flbl">Updated</div><div class="fval">${lastSeen}</div></div>
            <div class="fcard"><div class="flbl">Risk</div><div class="fval" style="color:${risk.color}">${risk.level.toUpperCase()}</div></div>
        </div>
        ${_scoreBar('Severity Score', risk.score, risk.color)}
        <div class="ibox red">⚠️ <strong>Impact:</strong> ${Simplifier.disasterImpact(cat)}</div>
        <div class="ibox blue">🛰 <strong>How space helps:</strong> ${Simplifier.disasterSpaceHelp(cat)}</div>
        <div class="ibox gold">📡 <strong>Source:</strong> NASA EONET — near real-time satellite-fed tracking.</div>
    `);
}

function _panelNEO(a, s) {
    const ca = a.close_approach_data?.[0];
    const vel = parseFloat(ca?.relative_velocity?.kilometers_per_hour || 0).toLocaleString();
    const risk = RiskCalculator.asteroid(a);
    showPanel(`
        <div class="ptag neo">☄ NEAR-EARTH OBJECT</div>
        <div class="ptitle">${a.name}</div>
        <div class="psub">Tracked by NASA CNEOS. ${s.proximity}.</div>
        <div class="div"></div>
        <div class="fgrid">
            <div class="fcard"><div class="flbl">Diameter</div><div class="fval">${s.diam} m</div></div>
            <div class="fcard"><div class="flbl">Class</div><div class="fval">${s.size}</div></div>
            <div class="fcard"><div class="flbl">Miss Dist</div><div class="fval">${s.dist} lunar</div></div>
            <div class="fcard"><div class="flbl">In km</div><div class="fval">${s.distKm}</div></div>
            <div class="fcard"><div class="flbl">Date</div><div class="fval">${ca?.close_approach_date||'Unknown'}</div></div>
            <div class="fcard"><div class="flbl">Speed</div><div class="fval">${vel} km/h</div></div>
        </div>
        ${_scoreBar('Risk Score', risk.score, risk.color)}
        <div class="ibox ${a.is_potentially_hazardous_asteroid?'red':'green'}">
            ${a.is_potentially_hazardous_asteroid
                ?`⚠️ <strong>Potentially Hazardous:</strong> Meets NASA criteria. Actively monitored — no current impact risk.`
                :`✅ <strong>No Threat:</strong> Will safely pass at ${s.dist} lunar distances (${s.distKm} km).`}
        </div>
        <div class="ibox blue">🌍 At ${s.diam}m, this would cause ${s.diam>300?'regional devastation':s.diam>100?'significant local damage':'limited local impact'} if it struck a populated area.</div>
        <div class="ibox gold">📡 <strong>Source:</strong> NASA NeoWs — real-time data from JPL.</div>
    `);
}

function _panelPlanet(p) {
    const vis  = VisibilityScore.compute(useNASAData.get('weather'));
    const apod = useNASAData.get('apod');
    const sc   = vis.score > 70 ? 'var(--green)' : vis.score > 45 ? 'var(--gold)' : 'var(--red)';
    let html = `
        <div class="ptag planet">${p.emoji} PLANET</div>
        <div class="ptitle">${p.name}</div>
        <div class="psub">${p.desc}</div>
        <div class="div"></div>
        <div class="fgrid">
            <div class="fcard"><div class="flbl">Avg Distance</div><div class="fval">${p.dist}</div></div>
            <div class="fcard"><div class="flbl">Diameter</div><div class="fval">${p.size}</div></div>
            <div class="fcard"><div class="flbl">Temperature</div><div class="fval">${p.temp}</div></div>
            <div class="fcard"><div class="flbl">Moons</div><div class="fval">${p.moons}</div></div>
        </div>
        <div class="ibox blue">🌍 <strong>Why it matters:</strong><br>${p.why}</div>`;
    if (!p.isEarth) {
        html += `${_scoreBar('Viewing Quality Tonight', vis.score, sc)}
        <div class="ibox ${vis.score>60?'green':'gold'}">${vis.message}</div>`;
    } else {
        html += `
        <div class="ibox green">🌍 You are here — the only planet confirmed to harbor life, liquid water, and a protective ozone layer, all monitored daily by satellites above.</div>
        <button class="gbtn" onclick="goEarth()">🌍 ENTER EARTH INTELLIGENCE MODE →</button>`;
    }
    if (apod) {
        html += `
        <div class="div"></div>
        <div class="section-label">✨ Today's NASA Astronomy Photo</div>
        ${apod.media_type==='image'?`<img src="${apod.url}" style="width:100%;border-radius:8px;margin-bottom:10px;border:1px solid var(--border)" onerror="this.style.display='none'"/>`:''}
        <div style="font-size:.82rem;font-weight:600;margin-bottom:6px;color:var(--text)">${apod.title}</div>
        <div style="font-size:.75rem;color:var(--muted);line-height:1.55">${(apod.explanation||'').slice(0,240)}…</div>`;
    }
    showPanel(html);
}

// ═══════════════════════════════════════════
//  SOLAR SYSTEM — CINEMATIC THREE.JS (KEPT FROM ORIGINAL)
// ═══════════════════════════════════════════
// In app.js, replace the existing PLANET_DATA with this enhanced version:

const PLANET_DATA = [
    { 
        name: 'Mercury', 
        r: .32, 
        orbit: 8,  
        spd: .88, 
        col: '#8c7853', 
        emissive: '#1a1410', 
        emissiveIntensity: .3, 
        rough: .95, 
        metal: .2,  
        glowCol: '#9a8870', 
        glowOpacity: .15, 
        emoji: '☿', 
        dist: '77M km', 
        size: '4,879 km',   
        temp: '430°C / -180°C', 
        moons: 0,   
        desc: 'Smallest planet. No atmosphere means extreme temperature swings.',
        longDesc: 'Mercury is the closest planet to the Sun and the smallest in our solar system. It has a thin atmosphere (exosphere) causing extreme temperature variations from 430°C during the day to -180°C at night.',
        why: 'Mercury\'s proximity to the Sun makes it a lab for studying solar wind — same particles that cause auroras on Earth.',
        missions: ['Mariner 10 (1974-75)', 'MESSENGER (2011-15)', 'BepiColombo (2025)'],
        facts: [
            'A day on Mercury lasts 59 Earth days',
            'It has a giant iron core making up 85% of its radius',
            'Ice exists in permanently shadowed craters at the poles'
        ],
        wikiUrl: 'https://en.wikipedia.org/wiki/Mercury_(planet)',
        nasaUrl: 'https://solarsystem.nasa.gov/planets/mercury',
        viewability: 'Hard to see - always near the Sun in the sky',
        bestTime: 'Just after sunset or before sunrise, low on horizon',
        magnitude: '-0.5 to 1.5',
        discovery: 'Known since ancient times',
        category: 'Terrestrial',
        gravity: '3.7 m/s²',
        dayLength: '59 Earth days',
        yearLength: '88 Earth days',
        atmosphere: 'Thin exosphere (sodium, potassium)'
    },
    { 
        name: 'Venus',   
        r: .55, 
        orbit: 12.5,
        spd: .64, 
        col: '#e8c48a', 
        emissive: '#6a3800', 
        emissiveIntensity: .4, 
        rough: .65, 
        metal: .0,  
        glowCol: '#ffcc44', 
        glowOpacity: .45, 
        emoji: '♀', 
        dist: '261M km', 
        size: '12,104 km',  
        temp: '465°C constant', 
        moons: 0,   
        desc: 'Hottest planet due to a runaway CO₂ greenhouse effect.',
        longDesc: 'Venus is often called Earth\'s "sister planet" due to similar size, but it has a thick toxic atmosphere that traps heat, making it the hottest planet. It spins backwards compared to most planets.',
        why: 'Venus is Earth\'s twin gone wrong — studying it helps model worst-case climate scenarios.',
        missions: ['Venera program (USSR)', 'Magellan (1990-94)', 'Venus Express (2006-14)', 'Akatsuki (2015-)'],
        facts: [
            'A day on Venus is longer than its year (243 vs 225 Earth days)',
            'Surface pressure is 90 times that of Earth',
            'It has over 1,600 volcanoes'
        ],
        wikiUrl: 'https://en.wikipedia.org/wiki/Venus',
        nasaUrl: 'https://solarsystem.nasa.gov/planets/venus',
        viewability: 'Very bright - the "evening/morning star"',
        bestTime: 'Just after sunset or before dawn',
        magnitude: '-4.6 to -3.8',
        discovery: 'Known since ancient times',
        category: 'Terrestrial',
        gravity: '8.87 m/s²',
        dayLength: '243 Earth days',
        yearLength: '225 Earth days',
        atmosphere: '96% CO₂, 3% Nitrogen, sulfuric acid clouds'
    },
    { 
        name: 'Earth',   
        r: .58, 
        orbit: 17, 
        spd: .5,  
        col: '#1a4d7a', 
        emissive: '#051a2e', 
        emissiveIntensity: .5, 
        rough: .65, 
        metal: .2, 
        glowCol: '#4da6ff', 
        glowOpacity: .65, 
        emoji: '🌍',
        dist: '149.6M km',           
        size: '12,742 km',  
        temp: 'avg 15°C',       
        moons: 1,   
        isEarth: true, 
        desc: 'The only planet confirmed to harbor life, liquid water, and a protective magnetosphere.',
        longDesc: 'Earth is our home planet and the only world known to support life. Its unique combination of atmosphere, water, and distance from the Sun creates perfect conditions for life.',
        why: 'Every satellite orbits here. Every astronaut launched from here. Every space observation aimed from here.',
        missions: ['Thousands of satellites', 'ISS', 'Landsat program', 'GOES weather satellites'],
        facts: [
            '71% of Earth\'s surface is water-covered',
            'The atmosphere extends to 10,000 km',
            'Earth is the only planet not named after a god'
        ],
        wikiUrl: 'https://en.wikipedia.org/wiki/Earth',
        nasaUrl: 'https://solarsystem.nasa.gov/planets/earth',
        viewability: 'You are here!',
        bestTime: 'Always',
        magnitude: 'N/A',
        discovery: 'Home',
        category: 'Terrestrial',
        gravity: '9.81 m/s²',
        dayLength: '24 hours',
        yearLength: '365.25 days',
        atmosphere: '78% N₂, 21% O₂, 1% other'
    },
    { 
        name: 'Mars',    
        r: .42, 
        orbit: 23.5,
        spd: .38, 
        col: '#c1440e', 
        emissive: '#3a1000', 
        emissiveIntensity: .4, 
        rough: .85, 
        metal: .05, 
        glowCol: '#ff6633', 
        glowOpacity: .25, 
        emoji: '♂', 
        dist: '225M km', 
        size: '6,779 km',   
        temp: '-63°C avg',      
        moons: 2,   
        desc: 'The Red Planet. Perseverance rover active now. Mars once had flowing rivers.',
        longDesc: 'Mars has the largest volcano in the solar system (Olympus Mons) and evidence of ancient rivers and lakes. Scientists believe it may have once harbored microbial life.',
        why: 'Active missions send data daily. Mars research directly informs life-support tech for crewed missions.',
        missions: ['Perseverance (2021-)', 'Curiosity (2012-)', 'Ingenuity helicopter', 'Mars Reconnaissance Orbiter'],
        facts: [
            'Mars has the largest dust storms in the solar system',
            'Its moons, Phobos and Deimos, are likely captured asteroids',
            'A Mars day is 24 hours 37 minutes - almost Earth-like'
        ],
        wikiUrl: 'https://en.wikipedia.org/wiki/Mars',
        nasaUrl: 'https://solarsystem.nasa.gov/planets/mars',
        viewability: 'Bright red-orange in the night sky',
        bestTime: 'During opposition (every 26 months)',
        magnitude: '-2.0 to +1.8',
        discovery: 'Known since ancient times',
        category: 'Terrestrial',
        gravity: '3.71 m/s²',
        dayLength: '24h 37m',
        yearLength: '687 Earth days',
        atmosphere: '95% CO₂, 3% N₂, 1.6% Argon'
    },
    { 
        name: 'Jupiter', 
        r: 1.8, 
        orbit: 37, 
        spd: .22, 
        col: '#c88b3a', 
        emissive: '#2a1800', 
        emissiveIntensity: .35, 
        rough: .55, 
        metal: .0,  
        glowCol: '#e8a050', 
        glowOpacity: .3, 
        emoji: '♃', 
        dist: '778M km', 
        size: '139,820 km', 
        temp: '-110°C',          
        moons: 95,  
        desc: 'Largest planet. Great Red Spot storm raging 350+ years. Europa may harbor life.',
        longDesc: 'Jupiter is 2.5 times more massive than all other planets combined. Its Great Red Spot is a storm larger than Earth that has raged for centuries.',
        why: 'Jupiter\'s gravity acts as a planetary shield, deflecting comets from the inner solar system.',
        missions: ['Juno (2016-)', 'Galileo (1995-2003)', 'Voyager flybys', 'Europa Clipper (2024)'],
        facts: [
            'Jupiter has 79 known moons - a solar system in miniature',
            'Europa may have a subsurface ocean with twice Earth\'s water',
            'Its magnetic field is 20,000 times stronger than Earth\'s'
        ],
        wikiUrl: 'https://en.wikipedia.org/wiki/Jupiter',
        nasaUrl: 'https://solarsystem.nasa.gov/planets/jupiter',
        viewability: 'Very bright - second only to Venus',
        bestTime: 'During opposition (yearly)',
        magnitude: '-2.9 to -1.6',
        discovery: 'Known since ancient times',
        category: 'Gas Giant',
        gravity: '24.79 m/s²',
        dayLength: '9h 56m',
        yearLength: '11.86 Earth years',
        atmosphere: '89% H₂, 10% He, trace gases'
    },
    { 
        name: 'Saturn',  
        r: 1.5, 
        orbit: 55, 
        spd: .17, 
        col: '#e6d19a', 
        emissive: '#2a1a00', 
        emissiveIntensity: .38,
        rough: .58, 
        metal: .0,  
        glowCol: '#f0d880', 
        glowOpacity: .35, 
        emoji: '♄', 
        dist: '1.4B km', 
        size: '116,460 km', 
        temp: '-140°C',          
        moons: 146, 
        hasRings: true, 
        desc: 'Ring system of ice and rock. Titan has methane lakes.',
        longDesc: 'Saturn\'s rings are 250,000 km wide but only 100 meters thick. Its moon Titan has liquid methane lakes and a thick atmosphere.',
        why: 'Cassini orbited Saturn 13 years, transforming our understanding of ring dynamics and moon chemistry.',
        missions: ['Cassini-Huygens (2004-17)', 'Voyager flybys', 'Pioneer 11'],
        facts: [
            'Saturn would float in water (density less than water)',
            'The rings are mostly water ice with some rock',
            'Titan has weather, seasons, and liquid on its surface'
        ],
        wikiUrl: 'https://en.wikipedia.org/wiki/Saturn',
        nasaUrl: 'https://solarsystem.nasa.gov/planets/saturn',
        viewability: 'Bright yellow-white, rings visible in telescopes',
        bestTime: 'When rings are tilted (every 15 years)',
        magnitude: '-0.5 to +1.2',
        discovery: 'Known since ancient times',
        category: 'Gas Giant',
        gravity: '10.44 m/s²',
        dayLength: '10h 42m',
        yearLength: '29.5 Earth years',
        atmosphere: '96% H₂, 3% He, trace gases'
    },
    { 
        name: 'Uranus',  
        r: 1.0, 
        orbit: 72, 
        spd: .12, 
        col: '#5eb8c4', 
        emissive: '#002a33', 
        emissiveIntensity: .45,
        rough: .48, 
        metal: .08, 
        glowCol: '#7dd4e8', 
        glowOpacity: .4, 
        emoji: '⛢', 
        dist: '2.7B km', 
        size: '50,724 km',  
        temp: '-195°C',          
        moons: 28,  
        desc: 'Ice giant tilted 98° from an ancient collision. 42-year-long seasons.',
        longDesc: 'Uranus rotates on its side, likely due to a massive impact. Its 27 moons are named after Shakespeare characters.',
        why: 'Ice giants are the most common exoplanet type — studying Uranus helps understand planetary systems.',
        missions: ['Voyager 2 (1986)', 'Future orbiter planned'],
        facts: [
            'Uranus was the first planet discovered with a telescope (1781)',
            'Its rings were discovered in 1977',
            'It radiates less heat than it receives from the Sun'
        ],
        wikiUrl: 'https://en.wikipedia.org/wiki/Uranus',
        nasaUrl: 'https://solarsystem.nasa.gov/planets/uranus',
        viewability: 'Very faint, requires binoculars',
        bestTime: 'During opposition',
        magnitude: '+5.3 to +5.9',
        discovery: 'William Herschel (1781)',
        category: 'Ice Giant',
        gravity: '8.69 m/s²',
        dayLength: '17h 14m',
        yearLength: '84 Earth years',
        atmosphere: '83% H₂, 15% He, 2% CH₄'
    },
    { 
        name: 'Neptune', 
        r: .95, 
        orbit: 88, 
        spd: .08, 
        col: '#3a5fd8', 
        emissive: '#000a44', 
        emissiveIntensity: .5, 
        rough: .52, 
        metal: .08, 
        glowCol: '#6688ff', 
        glowOpacity: .42, 
        emoji: '♆', 
        dist: '4.4B km', 
        size: '49,244 km',  
        temp: '-200°C',          
        moons: 16,  
        desc: 'Windiest planet at 2,100 km/h. 165 years per orbit. Visited once in 1989.',
        longDesc: 'Neptune has the strongest winds in the solar system, reaching 2,100 km/h. Its Great Dark Spot is a massive storm system.',
        why: 'A future Neptune orbiter would revolutionize understanding of the outer solar system.',
        missions: ['Voyager 2 (1989)', 'Future orbiter planned'],
        facts: [
            'Neptune was discovered through mathematical prediction',
            'Its moon Triton orbits backwards (retrograde orbit)',
            'It has only completed one orbit since discovery (in 2011)'
        ],
        wikiUrl: 'https://en.wikipedia.org/wiki/Neptune',
        nasaUrl: 'https://solarsystem.nasa.gov/planets/neptune',
        viewability: 'Very faint, requires telescope',
        bestTime: 'During opposition',
        magnitude: '+7.7 to +8.0',
        discovery: 'Johann Galle (1846)',
        category: 'Ice Giant',
        gravity: '11.15 m/s²',
        dayLength: '16h 6m',
        yearLength: '165 Earth years',
        atmosphere: '80% H₂, 19% He, 1% CH₄'
    },
];

// Solar system rendering code (kept from original)
let _solarScene, _solarCamera, _solarRenderer, _solarPlanets = [], _solarRaf = null;
let _solarRaycaster, _solarMouse;
let _planetGlowMeshes = [];
let _isDragging = false, _prevMX = 0, _prevMY = 0, _moved = false;
let _camTheta = 0.5, _camPhi = 0.42, _camR = 90;
let _solarClock, _sunMesh, _sunGlowMeshes = [], _sunCorona, _nebulaParticles;

function _initSolar() {
    const canvas = document.getElementById('solar-canvas');
    _solarScene    = new THREE.Scene();
    _solarCamera   = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 3000);
    _solarRaycaster = new THREE.Raycaster();
    _solarMouse    = new THREE.Vector2();
    _solarClock    = new THREE.Clock();
    _solarRenderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false });
    _solarRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    _solarRenderer.setSize(window.innerWidth, window.innerHeight);
    _solarRenderer.setClearColor(0x000005);
    _solarRenderer.shadowMap.enabled = true;
    window.addEventListener('resize', () => {
        _solarCamera.aspect = window.innerWidth / window.innerHeight;
        _solarCamera.updateProjectionMatrix();
        _solarRenderer.setSize(window.innerWidth, window.innerHeight);
    });
    _buildStarField(); _buildNebula(); _buildSun(); _buildPlanets(); _setupSolarControls(canvas);
}

// Add these helper functions after PLANET_DATA in app.js

function _getPlanetDescription(planet) {
    return `
        <div class="planet-description" style="line-height: 1.6; color: var(--text);">
            <p style="margin-bottom: 12px;">${planet.longDesc || planet.desc}</p>
            
            <div class="planet-quick-facts" style="
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin: 16px 0;
                background: rgba(0,0,0,0.2);
                border-radius: 12px;
                padding: 16px;
            ">
                <div>
                    <div style="color: var(--muted); font-size: 0.7rem;">CATEGORY</div>
                    <div style="font-weight: 600;">${planet.category || 'Unknown'}</div>
                </div>
                <div>
                    <div style="color: var(--muted); font-size: 0.7rem;">GRAVITY</div>
                    <div style="font-weight: 600;">${planet.gravity || 'Unknown'}</div>
                </div>
                <div>
                    <div style="color: var(--muted); font-size: 0.7rem;">DAY LENGTH</div>
                    <div style="font-weight: 600;">${planet.dayLength || 'Unknown'}</div>
                </div>
                <div>
                    <div style="color: var(--muted); font-size: 0.7rem;">YEAR LENGTH</div>
                    <div style="font-weight: 600;">${planet.yearLength || 'Unknown'}</div>
                </div>
            </div>
            
            <div style="margin-top: 12px;">
                <span style="color: var(--muted); font-weight: 600;">Atmosphere: </span>
                <span>${planet.atmosphere || 'No significant atmosphere'}</span>
            </div>
        </div>
    `;
}

function _getPlanetMissions(planetName) {
    const planet = PLANET_DATA.find(p => p.name === planetName);
    if (!planet || !planet.missions) return '<p>No mission data available</p>';
    
    return planet.missions.map(mission => `
        <div style="
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            background: rgba(100, 150, 255, 0.1);
            border-radius: 8px;
            margin-bottom: 8px;
            border-left: 3px solid var(--gold);
        ">
            <span style="font-size: 1.2rem;">🚀</span>
            <span style="flex: 1;">${mission}</span>
        </div>
    `).join('');
}

function _getPlanetFacts(planetName) {
    const planet = PLANET_DATA.find(p => p.name === planetName);
    return planet?.facts || [
        'No facts available',
        'Check back later for updates',
        'NASA missions are studying this planet'
    ];
}

function _getPlanetWikiUrl(planetName) {
    const planet = PLANET_DATA.find(p => p.name === planetName);
    return planet?.wikiUrl || `https://en.wikipedia.org/wiki/${planetName}`;
}

function _getPlanetNasaUrl(planetName) {
    const planet = PLANET_DATA.find(p => p.name === planetName);
    return planet?.nasaUrl || `https://solarsystem.nasa.gov/planets/${planetName.toLowerCase()}`;
}

function _getPlanetViewingInfo(planetName) {
    const planet = PLANET_DATA.find(p => p.name === planetName);
    if (!planet) return '<p>No viewing information available</p>';
    
    return `
        <div style="
            background: rgba(0,0,0,0.2);
            border-radius: 12px;
            padding: 16px;
            margin: 12px 0;
        ">
            <div style="display: grid; gap: 12px;">
                <div>
                    <span style="color: var(--muted);">Visibility:</span>
                    <span style="margin-left: 8px;">${planet.viewability || 'Visible with telescope'}</span>
                </div>
                <div>
                    <span style="color: var(--muted);">Best Time:</span>
                    <span style="margin-left: 8px;">${planet.bestTime || 'During opposition'}</span>
                </div>
                <div>
                    <span style="color: var(--muted);">Magnitude:</span>
                    <span style="margin-left: 8px;">${planet.magnitude || 'Varies'}</span>
                </div>
                <div>
                    <span style="color: var(--muted);">Discovered:</span>
                    <span style="margin-left: 8px;">${planet.discovery || 'Ancient times'}</span>
                </div>
            </div>
        </div>
    `;
}

function _buildStarField() {
    [[12000,.22,.7,0xffffff],[4000,.38,.65,0xd0e8ff],[300,.7,.9,0xffffff]].forEach(([count,size,opacity,color]) => {
        const v = []; for (let i=0;i<count;i++) v.push((Math.random()-.5)*2000,(Math.random()-.5)*2000,(Math.random()-.5)*2000);
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v,3));
        _solarScene.add(new THREE.Points(g, new THREE.PointsMaterial({color,size,transparent:true,opacity})));
    });
}

function _buildNebula() {
    const geo = new THREE.BufferGeometry(), verts=[], colors=[];
    const pal = [[.15,.1,.4],[.05,.1,.25],[.2,.05,.1],[.05,.18,.12]];
    for (let i=0;i<5000;i++) {
        const a=Math.random()*Math.PI*2, r=200+Math.random()*600, y=(Math.random()-.5)*120;
        verts.push(Math.cos(a)*r, y, Math.sin(a)*r);
        const c=pal[Math.floor(Math.random()*pal.length)]; colors.push(c[0],c[1],c[2]);
    }
    geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    _nebulaParticles = new THREE.Points(geo, new THREE.PointsMaterial({size:2.5,vertexColors:true,transparent:true,opacity:.18}));
    _solarScene.add(_nebulaParticles);
}

function _buildSun() {
    const sunCanvas = document.createElement('canvas');
    sunCanvas.width = 512; sunCanvas.height = 512;
    const sunCtx = sunCanvas.getContext('2d');
    const gradient = sunCtx.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0,   '#fffef0');
    gradient.addColorStop(0.3, '#fff8d0');
    gradient.addColorStop(0.7, '#ffdd80');
    gradient.addColorStop(1,   '#ff9910');
    sunCtx.fillStyle = gradient;
    sunCtx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 30; i++) {
        const x = Math.random() * 512, y = Math.random() * 512;
        sunCtx.fillStyle = `rgba(180,100,30,${0.25 + Math.random() * 0.3})`;
        sunCtx.beginPath(); sunCtx.arc(x, y, 5 + Math.random() * 14, 0, Math.PI * 2); sunCtx.fill();
    }
    const sunTexture = new THREE.CanvasTexture(sunCanvas);

    _sunMesh = new THREE.Mesh(
        new THREE.SphereGeometry(3.5, 64, 64),
        new THREE.MeshBasicMaterial({ map: sunTexture })
    );
    _solarScene.add(_sunMesh);

    // 8-layer corona for rich solar glow
    _sunGlowMeshes = [
        [4.2,  0.55, 0xfff5a0],
        [5.2,  0.38, 0xffdd44],
        [7.0,  0.26, 0xffb822],
        [9.5,  0.18, 0xff9910],
        [13,   0.12, 0xff7700],
        [18,   0.08, 0xff5500],
        [26,   0.05, 0xff3300],
        [38,   0.025,0xff2200],
    ].map(([r, opacity, color]) => {
        const m = new THREE.Mesh(
            new THREE.SphereGeometry(r, 32, 32),
            new THREE.MeshBasicMaterial({
                color, transparent: true, opacity,
                side: THREE.BackSide, depthWrite: false,
                blending: THREE.AdditiveBlending
            })
        );
        _solarScene.add(m);
        return m;
    });

    _sunCorona = new THREE.Mesh(
        new THREE.RingGeometry(4.0, 14, 256),
        new THREE.MeshBasicMaterial({
            color: 0xffcc44, transparent: true, opacity: 0.10,
            side: THREE.DoubleSide, depthWrite: false,
            blending: THREE.AdditiveBlending
        })
    );
    _sunCorona.rotation.x = Math.PI / 2;
    _solarScene.add(_sunCorona);

    const mainLight = new THREE.PointLight(0xfff8e0, 7.0, 0);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    _solarScene.add(mainLight);

    const fillLight = new THREE.PointLight(0xffaa44, 2.0, 0);
    fillLight.position.set(-60, 40, -40);
    _solarScene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x88aaff, 0.4);
    rimLight.position.set(-1, 0.5, -1);
    _solarScene.add(rimLight);

    _solarScene.add(new THREE.AmbientLight(0x1a2233, 0.5));
}

function _noise(x, y, seed = 0) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
}

function _fbm(x, y, octaves = 4, seed = 0) {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    for (let i = 0; i < octaves; i++) {
        value += amplitude * _noise(x * frequency, y * frequency, seed + i);
        amplitude *= 0.5;
        frequency *= 2;
    }
    return value;
}

function _generatePlanetTexture(planet, size = 1024) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    
    const baseColor = new THREE.Color(planet.col);
    
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const u = x / size;
            const v = y / size;
            const idx = (y * size + x) * 4;
            
            let r, g, b;
            
            if (planet.name === 'Earth') {
                const land = _fbm(u * 6, v * 6, 4, 0);
                const ocean = land < 0.3;
                const continent = land > 0.5;
                if (ocean) {
                    r = 0.1; g = 0.2; b = 0.5;
                } else if (continent) {
                    r = 0.2; g = 0.4; b = 0.15;
                } else {
                    r = 0.15; g = 0.3; b = 0.4;
                }
                const variation = _fbm(u * 20, v * 20, 2, 100) * 0.1;
                r = Math.max(0, Math.min(1, r + variation));
                g = Math.max(0, Math.min(1, g + variation));
                b = Math.max(0, Math.min(1, b + variation));
            } else {
                const noise = _fbm(u * 8, v * 8, 3, 0);
                r = baseColor.r * (0.8 + noise * 0.2);
                g = baseColor.g * (0.8 + noise * 0.2);
                b = baseColor.b * (0.8 + noise * 0.2);
            }
            
            data[idx] = Math.floor(r * 255);
            data[idx + 1] = Math.floor(g * 255);
            data[idx + 2] = Math.floor(b * 255);
            data[idx + 3] = 255;
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return new THREE.CanvasTexture(canvas);
}

function _generateBumpMap(planet, size = 1024) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const u = x / size;
            const v = y / size;
            const idx = (y * size + x) * 4;
            
            let height = 0;
            
            if (planet.name === 'Earth') {
                const land = _fbm(u * 6, v * 6, 4, 0);
                const mountains = _fbm(u * 20, v * 20, 2, 50);
                height = land > 0.5 ? mountains * 0.6 : mountains * 0.2;
            } else {
                height = _fbm(u * 8, v * 8, 3, 0);
            }
            
            const gray = Math.floor(height * 255);
            data[idx] = gray;
            data[idx + 1] = gray;
            data[idx + 2] = gray;
            data[idx + 3] = 255;
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    return new THREE.CanvasTexture(canvas);
}

function _addPlanetGlow(planetMesh, radius, hexColor, glowOpacity = 0.35) {
    const color = new THREE.Color(hexColor);
    const glowMeshes = [];

    // Layer 1 — tight atmospheric halo
    const halo1 = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.18, 32, 32),
        new THREE.MeshBasicMaterial({
            color, transparent: true,
            opacity: glowOpacity * 0.9,
            side: THREE.BackSide, depthWrite: false,
            blending: THREE.AdditiveBlending,
        })
    );
    planetMesh.add(halo1);
    glowMeshes.push({ mesh: halo1, baseOpacity: glowOpacity * 0.9, phase: Math.random() * Math.PI * 2, speed: 0.8 + Math.random() * 0.4 });

    // Layer 2 — medium diffuse glow
    const halo2 = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.55, 24, 24),
        new THREE.MeshBasicMaterial({
            color, transparent: true,
            opacity: glowOpacity * 0.45,
            side: THREE.BackSide, depthWrite: false,
            blending: THREE.AdditiveBlending,
        })
    );
    planetMesh.add(halo2);
    glowMeshes.push({ mesh: halo2, baseOpacity: glowOpacity * 0.45, phase: Math.random() * Math.PI * 2 + 1, speed: 0.5 + Math.random() * 0.3 });

    // Layer 3 — wide outer corona
    const halo3 = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 2.4, 24, 24),
        new THREE.MeshBasicMaterial({
            color, transparent: true,
            opacity: glowOpacity * 0.18,
            side: THREE.BackSide, depthWrite: false,
            blending: THREE.AdditiveBlending,
        })
    );
    planetMesh.add(halo3);
    glowMeshes.push({ mesh: halo3, baseOpacity: glowOpacity * 0.18, phase: Math.random() * Math.PI * 2 + 2, speed: 0.3 + Math.random() * 0.2 });

    return glowMeshes;
}

function _buildPlanets() {
    _planetGlowMeshes = [];

    _solarPlanets = PLANET_DATA.map(p => {
        // Orbit ring
        const oRing = new THREE.Mesh(
            new THREE.RingGeometry(p.orbit - 0.05, p.orbit + 0.05, 256),
            new THREE.MeshBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
        );
        oRing.rotation.x = -Math.PI / 2;
        _solarScene.add(oRing);

        const pivot = new THREE.Group();
        pivot.userData.angle = Math.random() * Math.PI * 2;
        _solarScene.add(pivot);

        const diffuseTexture = _generatePlanetTexture(p, 1024);
        const bumpTexture    = _generateBumpMap(p, 1024);

        // Material with boosted emissive for self-lit glow feel
        const material = new THREE.MeshStandardMaterial({
            map:               diffuseTexture,
            bumpMap:           bumpTexture,
            bumpScale:         p.bumpScale ?? 0.025,
            color:             new THREE.Color(p.col),
            emissive:          new THREE.Color(p.glowCol || p.emissive || '#000'),
            emissiveIntensity: (p.emissiveIntensity ?? 0.35) * 2.2,
            roughness:         p.rough ?? 0.72,
            metalness:         p.metal ?? 0.05,
        });

        const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 96, 96), material);
        mesh.position.x = p.orbit;
        mesh.receiveShadow = mesh.castShadow = true;
        mesh.userData.planet = p;
        pivot.add(mesh);

        // Per-planet colored point light — makes nearby space lit in planet's color
        const pLight = new THREE.PointLight(
            new THREE.Color(p.glowCol || p.col),
            0.7,
            p.orbit * 0.55
        );
        mesh.add(pLight);

        // Multi-layer atmospheric glow
        const glows = _addPlanetGlow(mesh, p.r, p.glowCol || p.col, p.glowOpacity ?? 0.3);
        _planetGlowMeshes.push(...glows);

        // Saturn rings — enhanced with glow overlay
        if (p.hasRings) {
            const rg = new THREE.Group();
            [
                [1.42, 1.75, 0.62, 0xe8d090],
                [1.77, 2.18, 0.52, 0xd4b870],
                [2.20, 2.65, 0.42, 0xc0a050],
                [2.67, 3.10, 0.22, 0xc8a850],
            ].forEach(([i, o, op, col]) => {
                rg.add(new THREE.Mesh(
                    new THREE.RingGeometry(p.r * i, p.r * o, 256),
                    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, side: THREE.DoubleSide })
                ));
            });
            // Soft ring glow halo
            rg.add(new THREE.Mesh(
                new THREE.RingGeometry(p.r * 1.3, p.r * 3.3, 128),
                new THREE.MeshBasicMaterial({
                    color: 0xf0d880, transparent: true, opacity: 0.09,
                    side: THREE.DoubleSide, depthWrite: false,
                    blending: THREE.AdditiveBlending
                })
            ));
            rg.rotation.x = Math.PI / 3.5;
            mesh.add(rg);
        }

        // Earth: thick atmosphere rim + clouds
        if (p.isEarth) {
            mesh.add(new THREE.Mesh(
                new THREE.SphereGeometry(p.r * 1.055, 64, 64),
                new THREE.MeshBasicMaterial({
                    color: 0x3399ff, transparent: true, opacity: 0.16,
                    side: THREE.BackSide, depthWrite: false,
                    blending: THREE.AdditiveBlending
                })
            ));
            const clouds = new THREE.Mesh(
                new THREE.SphereGeometry(p.r * 1.012, 128, 128),
                new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.13 })
            );
            clouds.raycast = () => {};
            mesh.add(clouds);
        }

        return { mesh, pivot, data: p };
    });
}


// ── REPLACEMENT 3: _solarLoop() ───────────────────────────────────────────
function _solarLoop() {
    _solarRaf = requestAnimationFrame(_solarLoop);
    const dt = _solarClock.getDelta();

    // Planets rotate + orbit
    _solarPlanets.forEach(({ pivot, mesh, data }) => {
        pivot.userData.angle += data.spd * dt * 0.25;
        pivot.rotation.y = pivot.userData.angle;
        mesh.rotation.y += 0.14 * dt;
    });

    // Animate planet glow pulsing — each layer breathes at its own rate
    const t = Date.now() * 0.001;
    _planetGlowMeshes.forEach(g => {
        const pulse = 1 + Math.sin(t * g.speed + g.phase) * 0.12;
        g.mesh.material.opacity = g.baseOpacity * pulse;
    });

    // Sun animation
    if (_sunMesh) {
        const s = 1 + Math.sin(Date.now() * 0.0018) * 0.022;
        _sunMesh.scale.set(s, s, s);
        _sunMesh.rotation.y += 0.05 * dt;

        _sunGlowMeshes.forEach((g, i) => {
            const sp = 1 + Math.sin(Date.now() * (0.0007 + i * 0.0003) + i) * 0.05;
            g.scale.set(sp, sp, sp);
        });

        if (_sunCorona) _sunCorona.rotation.z += 0.008 * dt;
    }

    if (_nebulaParticles) _nebulaParticles.rotation.y += 0.002 * dt;

    if (!_isDragging) _camTheta += 0.03 * dt;
    _solarCamera.position.x = _camR * Math.sin(_camPhi) * Math.sin(_camTheta);
    _solarCamera.position.y = _camR * Math.cos(_camPhi);
    _solarCamera.position.z = _camR * Math.sin(_camPhi) * Math.cos(_camTheta);
    _solarCamera.lookAt(0, 0, 0);

    _solarRenderer.render(_solarScene, _solarCamera);
}

function _setupSolarControls(canvas) {
    canvas.addEventListener('mousedown', e => { _isDragging=true; _moved=false; _prevMX=e.clientX; _prevMY=e.clientY; });
    window.addEventListener('mouseup', () => _isDragging=false);
    window.addEventListener('mousemove', e => {
        if (_isDragging) {
            const dx=e.clientX-_prevMX, dy=e.clientY-_prevMY;
            if (Math.abs(dx)>2||Math.abs(dy)>2) _moved=true;
            _camTheta+=dx*.0035; _camPhi=Math.max(.12,Math.min(1.55,_camPhi+dy*.0035));
            _prevMX=e.clientX; _prevMY=e.clientY;
        }
        _solarMouse.x=(e.clientX/window.innerWidth)*2-1;
        _solarMouse.y=-(e.clientY/window.innerHeight)*2+1;
        _solarRaycaster.setFromCamera(_solarMouse,_solarCamera);
        const hits=_solarRaycaster.intersectObjects(_solarPlanets.map(p=>p.mesh));
        _solarPlanets.forEach(p => { p.mesh.scale.set(1,1,1); });
        canvas.style.cursor='default';
        if (hits.length>0) { 
            hits[0].object.scale.set(1.15,1.15,1.15); 
            canvas.style.cursor='pointer'; 
        }
    });
    // In app.js, find the canvas click event listener in _setupSolarControls function
// Replace the existing click handler with this:

canvas.addEventListener('click', e => {
    if (_moved) return;
    
    _solarMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    _solarMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    _solarRaycaster.setFromCamera(_solarMouse, _solarCamera);
    
    const hits = _solarRaycaster.intersectObjects(_solarPlanets.map(p => p.mesh), true);
    
    if (hits.length > 0) {
        let clickedObject = hits[0].object;
        let planet = clickedObject.userData.planet;
        
        // Traverse up to find planet data
        while (!planet && clickedObject.parent) {
            clickedObject = clickedObject.parent;
            planet = clickedObject.userData.planet;
        }
        
        if (planet) {
            if (planet.isEarth === true) {
                // Earth goes to Earth Intel mode
                goEarth();
            } else {
                // Other planets show detailed planet panel
                _showPlanetDetailPanel(planet);
            }
        }
    }
});
    canvas.addEventListener('wheel', e => { _camR=Math.max(20,Math.min(160,_camR+e.deltaY*.09)); },{passive:true});
}

function _solarLoop() {
    _solarRaf = requestAnimationFrame(_solarLoop);
    const dt=_solarClock.getDelta();
    _solarPlanets.forEach(({pivot,mesh,data}) => {
        pivot.userData.angle+=data.spd*dt*.25; pivot.rotation.y=pivot.userData.angle;
        mesh.rotation.y+=.14*dt;
    });
    if (_sunMesh) {
        const s=1+Math.sin(Date.now()*0.002)*.018; _sunMesh.scale.set(s,s,s);
        _sunGlowMeshes.forEach((g,i) => { const sp=1+Math.sin(Date.now()*(.8+i*.3)+i)*.04; g.scale.set(sp,sp,sp); });
    }
    if (_nebulaParticles) _nebulaParticles.rotation.y+=.002*dt;
    if (!_isDragging) _camTheta+=.03*dt;
    _solarCamera.position.x=_camR*Math.sin(_camPhi)*Math.sin(_camTheta);
    _solarCamera.position.y=_camR*Math.cos(_camPhi);
    _solarCamera.position.z=_camR*Math.sin(_camPhi)*Math.cos(_camTheta);
    _solarCamera.lookAt(0,0,0);
    _solarRenderer.render(_solarScene,_solarCamera);
}

// Add this complete function to app.js
function _showPlanetDetailPanel(planet) {
    console.log('Showing planet panel for:', planet.name);
    
    // Get additional planet data
    const planetData = PLANET_DATA.find(p => p.name === planet.name) || planet;
    
    // Get visibility score from current location
    const vis = VisibilityScore.compute(useNASAData.get('weather'));
    const sc = vis.score > 70 ? 'var(--green)' : vis.score > 45 ? 'var(--gold)' : 'var(--red)';
    
    const html = `
        <div class="ptag planet">${planetData.emoji || '🪐'} PLANET</div>
        <div class="ptitle">${planetData.name}</div>
        <div class="psub">${planetData.desc || 'Click for detailed information'}</div>
        
        <div class="div"></div>
        
        <!-- Quick Stats Grid -->
        <div class="fgrid">
            <div class="fcard">
                <div class="flbl">Distance from Sun</div>
                <div class="fval">${planetData.dist || 'Varies'}</div>
            </div>
            <div class="fcard">
                <div class="flbl">Diameter</div>
                <div class="fval">${planetData.size || 'Unknown'}</div>
            </div>
            <div class="fcard">
                <div class="flbl">Temperature</div>
                <div class="fval">${planetData.temp || 'Varies'}</div>
            </div>
            <div class="fcard">
                <div class="flbl">Moons</div>
                <div class="fval">${planetData.moons || 0}</div>
            </div>
        </div>
        
        <div class="div"></div>
        
        <!-- Main Description -->
        <div class="planet-detail-content">
            ${_getPlanetDescription(planetData)}
        </div>
        
        <div class="div"></div>
        
        <!-- Viewing Information -->
        <div class="section-label">🔭 Viewing from Earth</div>
        ${_getPlanetViewingInfo(planetData.name)}
        
        <div class="div"></div>
        
        <!-- Missions Section -->
        <div class="section-label">🚀 Active & Past Missions</div>
        <div class="missions-list">
            ${_getPlanetMissions(planetData.name)}
        </div>
        
        <div class="div"></div>
        
        <!-- Visibility Tonight -->
        <div class="section-label">🌌 Visibility Tonight</div>
        ${_scoreBar('Viewing Quality', vis.score, sc)}
        <div class="ibox ${vis.score > 60 ? 'green' : 'gold'}" style="margin-bottom: 16px;">
            ${vis.message}
        </div>
        
        <!-- Fun Facts -->
        <div class="section-label">✨ Fun Facts</div>
        <ul style="
            margin: 8px 0 16px 0; 
            padding-left: 20px; 
            color: var(--muted); 
            font-size: 0.85rem;
            list-style-type: none;
        ">
            ${_getPlanetFacts(planetData.name).map(fact => `
                <li style="margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                    <span style="color: var(--gold);">•</span>
                    <span>${fact}</span>
                </li>
            `).join('')}
        </ul>
        
        <!-- Explore Buttons -->
        <div style="display: flex; gap: 10px; margin-top: 20px;">
            <button onclick="window.open('${_getPlanetNasaUrl(planetData.name)}', '_blank')" style="
                flex: 1;
                padding: 12px;
                background: linear-gradient(145deg, #1e293b, #0f172a);
                border: 1px solid #3b82f6;
                color: #3b82f6;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.2s;
            " onmouseover="this.style.background='#1e293b'; this.style.color='#60a5fa'" 
               onmouseout="this.style.background='linear-gradient(145deg, #1e293b, #0f172a)'; this.style.color='#3b82f6'">
                🚀 NASA Page
            </button>
            <button onclick="window.open('${_getPlanetWikiUrl(planetData.name)}', '_blank')" style="
                flex: 1;
                padding: 12px;
                background: linear-gradient(145deg, #1e293b, #0f172a);
                border: 1px solid #94a3b8;
                color: #94a3b8;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.2s;
            " onmouseover="this.style.background='#1e293b'; this.style.color='#cbd5e1'" 
               onmouseout="this.style.background='linear-gradient(145deg, #1e293b, #0f172a)'; this.style.color='#94a3b8'">
                📚 Wikipedia
            </button>
        </div>
        
        <!-- APOD Section (if available) -->
        ${useNASAData.get('apod') ? `
            <div class="div"></div>
            <div class="section-label">✨ Today's NASA Astronomy Picture</div>
            ${useNASAData.get('apod').media_type === 'image' ? 
                `<img src="${useNASAData.get('apod').url}" style="
                    width: 100%;
                    border-radius: 12px;
                    margin: 10px 0;
                    border: 1px solid var(--border);
                " onerror="this.style.display='none'"/>` : ''
            }
            <div style="font-size: 0.85rem; color: var(--text); font-weight: 600; margin: 8px 0;">
                ${useNASAData.get('apod').title}
            </div>
            <div style="font-size: 0.75rem; color: var(--muted); line-height: 1.5;">
                ${(useNASAData.get('apod').explanation || '').slice(0, 200)}...
            </div>
        ` : ''}
    `;
    
    showPanel(html);
}

// Update the goEarthImpact function in app.js
function goEarthImpact() {
    console.log('Switching to Earth Impact mode...');
    
    STATE.mode = 'impact';
    document.getElementById('btn-impact').classList.add('active');
    document.getElementById('btn-solar').classList.remove('active');
    document.getElementById('btn-earth').classList.remove('active');
    
    // Hide other modes
    document.getElementById('solar-wrap').classList.add('hidden');
    document.getElementById('earth-wrap').classList.add('hidden');
    
    // Hide Earth-specific UI elements
    document.getElementById('layers').classList.remove('show');
    document.getElementById('chips').classList.remove('show');
    document.getElementById('hint').textContent = 'Real-time Earth impact monitoring from NASA, NOAA, USGS';
    
    closePanel();
    closeEarthSidebar();
    
    // Show impact container
    let impactWrap = document.getElementById('impact-wrap');
    if (!impactWrap) {
        console.error('Impact wrap element not found!');
        return;
    }
    impactWrap.classList.remove('hidden');
    
    // Check if EarthImpact is defined
    if (typeof EarthImpact === 'undefined') {
        console.error('EarthImpact is not defined!');
        impactWrap.innerHTML = `
            <div class="earth-impact-container">
                <div style="color: #ef4444; padding: 40px; text-align: center;">
                    <h2>❌ Earth Impact module failed to load</h2>
                    <p>Please check that components/EarthImpact.js exists</p>
                </div>
            </div>
        `;
        return;
    }
    
    // Initialize Earth Impact if not already done
    if (!window.earthImpactInitialized) {
        try {
            EarthImpact.init();
            window.earthImpactInitialized = true;
            console.log('EarthImpact initialized successfully');
        } catch (error) {
            console.error('Failed to initialize EarthImpact:', error);
            impactWrap.innerHTML = `
                <div class="earth-impact-container">
                    <div style="color: #ef4444; padding: 40px; text-align: center;">
                        <h2>❌ Failed to initialize Earth Impact</h2>
                        <p>Error: ${error.message}</p>
                    </div>
                </div>
            `;
            return;
        }
    }
    
    // Subscribe to updates
    try {
        // Clear any existing subscription
        if (window.impactUnsubscribe) {
            window.impactUnsubscribe();
        }
        
        // Subscribe with a function that updates the UI
        window.impactUnsubscribe = EarthImpact.subscribe((state) => {
            if (typeof EarthImpactUI !== 'undefined') {
                EarthImpactUI.render('impact-wrap', state);
            } else {
                console.error('EarthImpactUI is not defined');
                impactWrap.innerHTML = `
                    <div class="earth-impact-container">
                        <div style="color: #ef4444; padding: 40px; text-align: center;">
                            <h2>❌ EarthImpactUI failed to load</h2>
                            <p>Please check that components/EarthImpactUI.js exists</p>
                        </div>
                    </div>
                `;
            }
        });
    } catch (error) {
        console.error('Failed to subscribe to EarthImpact:', error);
    }
}

// ================= CHATBOT =================

function initChatbot() {
    const chatBox = document.getElementById('chatMessages');
    const input   = document.getElementById('chatInput');
    const button  = document.getElementById('chatSend');

    button.addEventListener('click', async () => {
        const msg = input.value.trim();
        if (!msg) return;

        chatBox.innerHTML += `<div class="chat-user">🧑 ${msg}</div>`;
        input.value = '';

        chatBox.scrollTop = chatBox.scrollHeight;

        const reply = await ChatService.send(msg);

        const formatted = marked.parse(reply);

chatBox.innerHTML += `
    <div class="chat-ai">
        <div class="chat-bubble">${formatted}</div>
    </div>
`;

        chatBox.scrollTop = chatBox.scrollHeight;
    });

    const toggleBtn = document.getElementById("chatToggle");
const chatbot   = document.getElementById("chatbot");
const closeBtn  = document.getElementById("chatClose");

toggleBtn.addEventListener("click", () => {
    chatbot.classList.remove("chat-hidden");
    toggleBtn.style.display = "none";
});

closeBtn.addEventListener("click", () => {
    chatbot.classList.add("chat-hidden");
    toggleBtn.style.display = "flex";
});

}

// Initialize after page load
window.addEventListener('DOMContentLoaded', initChatbot);

async function _fetchSatellitePasses(lat, lng) {
    try {
        // 1️⃣ Get ALL satellites above this location
        const aboveData = await N2YOService.getSatellitesAbove(lat, lng, 70, 0);

        if (!aboveData || !aboveData.above) return null;

        // 2️⃣ Filter good candidates
        const candidates = aboveData.above
            .filter(sat => sat.satalt > 200)   // ignore debris
            .slice(0, 10);                     // prevent rate limit

        const passes = [];

        // 3️⃣ Get visual passes for each satellite
        for (const sat of candidates) {
            const data = await N2YOService.getVisualPasses(
                sat.satid,
                lat,
                lng,
                3,   // next 3 days
                20   // minimum elevation
            );

            if (data && data.passes && data.passes.length > 0) {
                passes.push({
                    satellite: {
                        id: sat.satid,
                        name: sat.satname,
                        category: sat.intDesignator || "Satellite",
                        icon: '🛰️',
                        color: '#94a3b8'
                    },
                    passes: data.passes
                });
            }
        }

        passes.sort((a, b) => {
            const scoreA = N2YOService.calculatePassScore(a.passes[0]);
            const scoreB = N2YOService.calculatePassScore(b.passes[0]);
            return scoreB - scoreA;
        });


        return passes;

    } catch (error) {
        console.warn('Satellite passes error:', error);
        return null;
    }
}


async function _fetchNearbyLaunches(lat, lng) {
    try {
        if (typeof LaunchService === 'undefined') {
            console.warn('LaunchService not available');
            return null;
        }
        
        // Get launches within 2000km of clicked location
        const launches = await LaunchService.getLaunchesByLocation(lat, lng, 2000);
        return launches.slice(0, 5); // Return top 5 closest launches
    } catch (error) {
        console.warn('Failed to fetch nearby launches:', error);
        return null;
    }
}
// Add this section to your HTML generation in _onGlobeLocationClick
// after the ISS Pass section:




// Make function globally available

// ── BOOT ──
_initSolar();
_solarLoop();
setTimeout(_tickLoad, 300);

// Make functions globally available
window.goSolar = goSolar;
window.goEarth = goEarth;
window.toggleLayer = toggleLayer;
window.saveKeys = saveKeys;
window.closePanel = closePanel;
window.closeEarthSidebar = closeEarthSidebar;
window.goEarthImpact = goEarthImpact;