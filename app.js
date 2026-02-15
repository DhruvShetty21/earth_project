// app.js — AstroView (fully updated with SpaceDevs event visibility)

// ═══════════════════════════════════════════
//  GLOBAL STATE
// ═══════════════════════════════════════════
const STATE = {
    mode:   'solar',
    layers: { iss: true, disasters: true, neo: true, cme: false, launches: false },
    keys: {
        nasa:    localStorage.getItem('av_nasa')    || 'DEMO_KEY',
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

    document.getElementById('key-nasa').value    = STATE.keys.nasa !== 'DEMO_KEY' ? STATE.keys.nasa : '';
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
function toggleLayer(name, btn) {
    STATE.layers[name] = !STATE.layers[name];
    btn.classList.toggle('on', STATE.layers[name]);
    if (STATE.mode === 'earth' && GlobeView.isReady()) {
        GlobeView.setLayer(name, STATE.layers[name], _currentGlobeData());
    }
}

// ═══════════════════════════════════════════
//  MARKER CLICK → PANEL
// ═══════════════════════════════════════════
function _onMarkerClick(d) {
    if (d.type === 'iss')           _panelISS(d.raw);
    else if (d.type === 'disaster') _panelDisaster(d.raw, d.style, d.cat);
    else if (d.type === 'neo')      _panelNEO(d.raw, d.style);
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

async function _fetchLocationVisibility(lat, lng) {
    try {
        const response = await fetch(`/api/location/visibility?lat=${lat}&lon=${lng}`);
        if (!response.ok) throw new Error('Location visibility fetch failed');
        return await response.json();
    } catch (error) {
        console.warn('Location visibility error:', error);
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
    // Show skeleton loading panel immediately
    showPanel(`
        <div class="ptag earth">📍 LOCATION INTEL</div>
        <div class="ptitle loc-title">Scanning location…</div>
        <div class="psub">${lat.toFixed(4)}° ${lat>=0?'N':'S'}, ${lng.toFixed(4)}° ${lng>=0?'E':'W'}</div>
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

    // Fire all API calls in parallel
    const [
        geoName, 
        weatherData, 
        issPass, 
        spaceDevsEvents,
        spaceWeather,
        locationVisibility,
        impactRisk
    ] = await Promise.all([
        _reverseGeocode(lat, lng),
        _fetchLocationWeather(lat, lng),
        _fetchISSPass(lat, lng),
        _fetchSpaceDevsEvents(lat, lng),
        _fetchSpaceWeather(lat, lng),
        _fetchLocationVisibility(lat, lng),
        _fetchImpactRisk(lat, lng)
    ]);

    const vis = VisibilityScore.compute(weatherData);
    const neo = useNASAData.get('neo') || [];
    const hazNeo = neo.filter(a => a.is_potentially_hazardous_asteroid);
    const issNow = useNASAData.get('iss') || useISSPosition.getLastPosition();
    const nearDisaster = _findNearestDisaster(lat, lng);

    const sc = vis.score > 70 ? 'var(--green)' : vis.score > 45 ? 'var(--gold)' : 'var(--red)';
    const displayName = geoName || `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
    const coords = `${Math.abs(lat).toFixed(4)}° ${lat>=0?'N':'S'} · ${Math.abs(lng).toFixed(4)}° ${lng>=0?'E':'W'}`;

    let html = `
        <div class="ptag earth">📍 LOCATION INTEL</div>
        <div class="ptitle loc-title">${displayName}</div>
        <div class="psub" style="margin-bottom:4px">${coords}</div>`;

    // ── 1. SKY TONIGHT ──────────────────────────────────────────────────
    html += `
        <div class="div"></div>
        <div class="loc-section-head">🌌 Sky Tonight</div>`;

    if (weatherData) {
        const tempC = Math.round(weatherData.main?.temp || 0);
        const clouds = weatherData.clouds?.all ?? 0;
        const desc = _cap(weatherData.weather?.[0]?.description || '');
        html += `
        <div class="loc-sky-card" style="--sky-score:${vis.score}">
            <div class="loc-sky-score" style="color:${sc}">${vis.score}<span>/100</span></div>
            <div class="loc-sky-info">
                <div class="loc-sky-label" style="color:${sc}">${vis.label} viewing conditions</div>
                <div class="loc-sky-desc">${vis.message}</div>
                <div class="loc-sky-weather">${desc} · ${tempC}°C · ${clouds}% cloud · ${Math.round(weatherData.wind?.speed||0)} m/s wind</div>
            </div>
        </div>
        <div class="loc-moon-row">🌙 ${VisibilityScore.moonDescription(vis.moonPct / 100)}</div>`;
    } else {
        html += `
        <div class="loc-no-weather">
            <div class="loc-no-weather-icon">🌤</div>
            <div>
                <div style="font-weight:600;margin-bottom:4px">Add OpenWeather key for live sky conditions</div>
                <div style="font-size:.78rem;color:var(--muted)">Click <strong>⚙ API Keys</strong> → paste your free key from openweathermap.org → get real cloud cover, temperature, and visibility score.</div>
            </div>
        </div>`;
        html += `<div class="loc-moon-row">🌙 ${VisibilityScore.moonDescription(vis.moonPct / 100)}</div>`;
    }

    // ── 2. LOCATION VISIBILITY ANALYSIS ────────────────────────────────
    if (locationVisibility && locationVisibility.analysis) {
        html += `
        <div class="fgrid" style="margin-top:12px">
            <div class="fcard">
                <div class="flbl">Night duration</div>
                <div class="fval">${locationVisibility.analysis.night_hours}h</div>
            </div>
            <div class="fcard">
                <div class="flbl">Moon phase</div>
                <div class="fval">${locationVisibility.analysis.moon_phase?.icon || '🌑'} ${locationVisibility.analysis.moon_phase?.name || ''}</div>
            </div>
        </div>
        <div class="ibox blue">${locationVisibility.analysis.night_description}</div>`;
    }

    // ── 3. SPACE DEVS EVENTS (VISIBLE FROM THIS LOCATION) ───────────────
    if (spaceDevsEvents && spaceDevsEvents.events && spaceDevsEvents.events.length > 0) {
        html += `
        <div class="div"></div>
        <div class="loc-section-head">🚀 Events Visible From Here</div>`;
        
        // Show next 5 upcoming events
        const upcomingEvents = spaceDevsEvents.events
            .filter(e => new Date(e.date) > new Date())
            .slice(0, 5);
        
        upcomingEvents.forEach(event => {
            const eventDate = new Date(event.date);
            const dateStr = eventDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
            const timeStr = eventDate.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'UTC'
            });
            
            // Get visibility info
            const vis = event.visibility || {};
            let visibilityText = 'Check local time';
            let visibilityColor = 'var(--green)';
            
            if (vis.visibilityWindows && vis.visibilityWindows.length > 0) {
                const window = vis.visibilityWindows[0];
                if (window.start && window.end) {
                    const startTime = new Date(window.start).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        timeZone: 'UTC'
                    });
                    const endTime = new Date(window.end).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        timeZone: 'UTC'
                    });
                    visibilityText = `${startTime} - ${endTime} UTC`;
                }
            }
            
            // Determine if this is a must-see event
            const isHighlight = event.type?.name === 'EVA' || 
                               event.type?.name === 'Docking' ||
                               event.name.toLowerCase().includes('launch');
            
            html += `
            <div class="loc-event-card" style="
                background: ${isHighlight ? 'rgba(100, 150, 255, 0.15)' : 'rgba(30, 40, 60, 0.6)'};
                border-radius: 12px;
                padding: 12px;
                margin-bottom: 10px;
                border-left: 4px solid ${isHighlight ? 'var(--green)' : visibilityColor};
                transition: all 0.2s ease;
                cursor: pointer;
            " onclick="window.open('${event.url}', '_blank')">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-weight: 600; font-size: 0.9rem;">${event.name}</span>
                    <span style="font-size: 0.7rem; background: rgba(255,255,255,0.1); padding: 3px 8px; border-radius: 12px; color: var(--muted);">
                        ${event.type?.name || 'Event'}
                    </span>
                </div>
                <div style="font-size: 0.75rem; color: var(--muted); margin-bottom: 8px; line-height: 1.4;">
                    ${event.description ? event.description.substring(0, 120) + (event.description.length > 120 ? '...' : '') : 'No description available'}
                </div>
                <div style="display: flex; gap: 16px; font-size: 0.75rem; flex-wrap: wrap; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: var(--gold);">📅</span>
                        <span>${dateStr}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: var(--gold);">⏰</span>
                        <span>${timeStr} UTC</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <span style="color: var(--gold);">👁️</span>
                        <span style="color: ${visibilityColor};">${visibilityText}</span>
                    </div>
                </div>
                ${event.location ? `
                <div style="font-size: 0.7rem; color: var(--muted); margin-top: 8px; display: flex; align-items: center; gap: 4px;">
                    <span>📍</span>
                    <span>${event.location}</span>
                </div>` : ''}
                ${vis.bestViewing ? `
                <div style="font-size: 0.7rem; color: var(--muted); margin-top: 6px; background: rgba(0,0,0,0.2); padding: 6px; border-radius: 6px;">
                    <span style="color: var(--gold);">🔭</span> ${vis.bestViewing}
                </div>` : ''}
            </div>`;
        });
        
        if (spaceDevsEvents.events.length > 5) {
            html += `
            <div class="ibox blue" style="text-align: center; cursor: pointer;" onclick="window.open('https://ll.thespacedevs.com', '_blank')">
                + ${spaceDevsEvents.events.length - 5} more events visible from this location — click to see all
            </div>`;
        }
    }

    // ── 4. ISS PASS ──────────────────────────────────────────────────────
    html += `
        <div class="div"></div>
        <div class="loc-section-head">🛸 ISS Pass</div>`;

    if (issPass && issPass.response && issPass.response[0]) {
        const pass = issPass.response[0];
        const passDate = new Date(pass.risetime * 1000);
        const timeStr = passDate.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
        const dateStr = passDate.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' });
        const durMin = Math.round(pass.duration / 60);
        const canSee = vis.score > 35 && weatherData;
        
        html += `
        <div class="loc-iss-pass">
            <div class="loc-iss-time">
                <div class="loc-iss-timeval">${timeStr}</div>
                <div class="loc-iss-timedate">${dateStr}</div>
            </div>
            <div class="loc-iss-details">
                <div class="loc-iss-dur">Visible for ~${durMin} minute${durMin!==1?'s':''}</div>
                <div class="loc-iss-canSee" style="color:${canSee?'var(--green)':'var(--gold)'}">
                    ${canSee ? '✅ Conditions suitable for naked-eye viewing' : '⛅ May be obscured by cloud cover'}
                </div>
            </div>
        </div>
        <div class="ibox blue">Look for a fast, non-blinking bright dot crossing the sky. The ISS is the 3rd-brightest object in the sky.</div>`;
    } else {
        if (issNow) {
            const distKm = Math.round(Math.sqrt(Math.pow(lat-issNow.lat,2) + Math.pow(lng-issNow.lng,2)) * 111);
            html += `
            <div class="fgrid">
                <div class="fcard"><div class="flbl">Current Distance</div><div class="fval">~${distKm.toLocaleString()} km</div></div>
                <div class="fcard"><div class="flbl">ISS Altitude</div><div class="fval">408 km</div></div>
            </div>
            <div class="ibox blue">ISS is ~${distKm.toLocaleString()} km away right now. It completes a full orbit every 92 minutes.</div>`;
        }
    }

    // ── 5. SPACE WEATHER ─────────────────────────────────────────────────
    if (spaceWeather && spaceWeather.aurora) {
        html += `
        <div class="div"></div>
        <div class="loc-section-head">☀️ Space Weather</div>
        <div class="loc-sw-grid">
            <div class="loc-sw-card" style="--sw-color:${spaceWeather.aurora.color}">
                <div class="loc-sw-icon">🌌</div>
                <div class="loc-sw-label">Aurora</div>
                <div class="loc-sw-val" style="color:${spaceWeather.aurora.color}">${spaceWeather.aurora.probability}</div>
            </div>
            <div class="loc-sw-card" style="--sw-color:${spaceWeather.cme_activity?.count > 0 ? '#ff4455' : '#00ff88'}">
                <div class="loc-sw-icon">☢</div>
                <div class="loc-sw-label">CME Activity</div>
                <div class="loc-sw-val">${spaceWeather.cme_activity?.count || 0} events</div>
            </div>
        </div>
        <div class="ibox ${spaceWeather.cme_activity?.count > 0 ? 'gold' : 'green'}">${spaceWeather.summary}</div>`;
    }

    // ── 6. IMPACT RISK ─────────────────────────────────────────────────
    if (impactRisk && impactRisk.hazardous_count > 0) {
        html += `
        <div class="div"></div>
        <div class="loc-section-head">☄ NEO Watch</div>
        <div class="ibox ${impactRisk.hazardous_count > 5 ? 'red' : 'gold'}">
            ${impactRisk.hazardous_count} potentially hazardous asteroids tracked this week.
            ${impactRisk.location_risk ? `Location risk: ${impactRisk.location_risk}` : ''}
        </div>`;
    }

    // ── 7. REGION SPACE CONNECTION (NEAREST DISASTER) ───────────────────
    html += `
        <div class="div"></div>
        <div class="loc-section-head">🌍 Space-Earth Connection</div>`;

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
            ${distKm < 500
                ? `⚠️ Active ${cat.toLowerCase()} within ${distKm}km. NASA satellites monitoring.`
                : distKm < 2000
                ? `A ${cat.toLowerCase()} is ${distKm.toLocaleString()}km away.`
                : `Nearest active event is ${distKm.toLocaleString()}km away.`}
        </div>`;
    } else {
        html += `<div class="ibox green">✅ No active NASA-tracked disaster events within range.</div>`;
    }

    // Add footer with data source attribution
    html += `
        <div class="div"></div>
        <div style="font-size:0.65rem; color:var(--muted); text-align:center; padding:8px;">
            🌐 Data sources: NASA EONET, SpaceDevs, Open-Notify, OpenWeather
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
const PLANET_DATA = [
    { name:'Mercury', r:.32, orbit:8,  spd:.88, col:'#8c7853', emissive:'#1a1410', emissiveIntensity:.3, rough:.95, metal:.2,  glowCol:'#9a8870', glowOpacity:.15, emoji:'☿', dist:'77M km avg',  size:'4,879 km',   temp:'430°C / -180°C', moons:0,   desc:'Smallest planet. No atmosphere means extreme temperature swings.', why:'Mercury\'s proximity to the Sun makes it a lab for studying solar wind — same particles that cause auroras on Earth.', bumpScale:.015 },
    { name:'Venus',   r:.55, orbit:12.5,spd:.64,col:'#e8c48a', emissive:'#6a3800', emissiveIntensity:.4, rough:.65, metal:.0,  glowCol:'#ffcc44', glowOpacity:.45, emoji:'♀', dist:'261M km avg', size:'12,104 km',  temp:'465°C constant', moons:0,   desc:'Hottest planet due to a runaway CO₂ greenhouse effect.', why:'Venus is Earth\'s twin gone wrong — studying it helps model worst-case climate scenarios.', bumpScale:.008 },
    { name:'Earth',   r:.58, orbit:17, spd:.5,  col:'#1a4d7a', emissive:'#051a2e', emissiveIntensity:.5, rough:.65, metal:.2, glowCol:'#4da6ff', glowOpacity:.65, emoji:'🌍',dist:'—',           size:'12,742 km',  temp:'avg 15°C',       moons:1,   isEarth:true, desc:'The only planet confirmed to harbor life, liquid water, and a protective magnetosphere.', why:'Every satellite orbits here. Every astronaut launched from here. Every space observation aimed from here.', bumpScale:.012, specular:0x222222, shininess:15 },
    { name:'Mars',    r:.42, orbit:23.5,spd:.38, col:'#c1440e', emissive:'#3a1000', emissiveIntensity:.4, rough:.85, metal:.05, glowCol:'#ff6633', glowOpacity:.25, emoji:'♂', dist:'225M km avg', size:'6,779 km',   temp:'-63°C avg',      moons:2,   desc:'The Red Planet. Perseverance rover active now. Mars once had flowing rivers.', why:'Active missions send data daily. Mars research directly informs life-support tech for crewed missions.', bumpScale:.018 },
    { name:'Jupiter', r:1.8, orbit:37, spd:.22, col:'#c88b3a', emissive:'#2a1800', emissiveIntensity:.35, rough:.55, metal:.0,  glowCol:'#e8a050', glowOpacity:.3, emoji:'♃', dist:'778M km avg', size:'139,820 km', temp:'-110°C',          moons:95,  desc:'Largest planet. Great Red Spot storm raging 350+ years. Europa may harbor life.', why:'Jupiter\'s gravity acts as a planetary shield, deflecting comets from the inner solar system.', bumpScale:.005 },
    { name:'Saturn',  r:1.5, orbit:55, spd:.17, col:'#e6d19a', emissive:'#2a1a00', emissiveIntensity:.38,rough:.58, metal:.0,  glowCol:'#f0d880', glowOpacity:.35, emoji:'♄', dist:'1.4B km avg', size:'116,460 km', temp:'-140°C',          moons:146, hasRings:true, desc:'Ring system of ice and rock. Titan has methane lakes.', why:'Cassini orbited Saturn 13 years, transforming our understanding of ring dynamics and moon chemistry.', bumpScale:.004 },
    { name:'Uranus',  r:1.0, orbit:72, spd:.12, col:'#5eb8c4', emissive:'#002a33', emissiveIntensity:.45,rough:.48, metal:.08, glowCol:'#7dd4e8', glowOpacity:.4, emoji:'⛢', dist:'2.7B km avg', size:'50,724 km',  temp:'-195°C',          moons:28,  desc:'Ice giant tilted 98° from an ancient collision. 42-year-long seasons.', why:'Ice giants are the most common exoplanet type — studying Uranus helps understand planetary systems.', bumpScale:.003 },
    { name:'Neptune', r:.95, orbit:88, spd:.08, col:'#3a5fd8', emissive:'#000a44', emissiveIntensity:.5, rough:.52, metal:.08, glowCol:'#6688ff', glowOpacity:.42, emoji:'♆', dist:'4.4B km avg', size:'49,244 km',  temp:'-200°C',          moons:16,  desc:'Windiest planet at 2,100 km/h. 165 years per orbit. Visited once in 1989.', why:'A future Neptune orbiter would revolutionize understanding of the outer solar system.', bumpScale:.004 },
];

// Solar system rendering code (kept from original)
let _solarScene, _solarCamera, _solarRenderer, _solarPlanets = [], _solarRaf = null;
let _solarRaycaster, _solarMouse;
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
    gradient.addColorStop(0, '#fffae0');
    gradient.addColorStop(0.5, '#fff5c0');
    gradient.addColorStop(1, '#ffdd80');
    sunCtx.fillStyle = gradient;
    sunCtx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 25; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const size = 5 + Math.random() * 15;
        sunCtx.fillStyle = `rgba(200, 150, 50, ${0.3 + Math.random() * 0.3})`;
        sunCtx.beginPath();
        sunCtx.arc(x, y, size, 0, Math.PI * 2);
        sunCtx.fill();
    }
    const sunTexture = new THREE.CanvasTexture(sunCanvas);
    
    _sunMesh = new THREE.Mesh(
        new THREE.SphereGeometry(3.5, 64, 64), 
        new THREE.MeshBasicMaterial({ map: sunTexture, color: 0xfff5c0 })
    );
    _solarScene.add(_sunMesh);
    
    _sunGlowMeshes = [
        [4.0, .28, 0xffe070],
        [4.8, .18, 0xffb030],
        [6.2, .12, 0xff9920],
        [8.5, .08, 0xff7700],
        [12, .05, 0xff5500],
        [17, .03, 0xff3300]
    ].map(([r, opacity, color]) => {
        const m = new THREE.Mesh(
            new THREE.SphereGeometry(r, 32, 32), 
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending })
        );
        _solarScene.add(m); 
        return m;
    });
    
    _sunCorona = new THREE.Mesh(
        new THREE.RingGeometry(3.8, 10, 256), 
        new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: .08, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    _sunCorona.rotation.x = Math.PI/2; 
    _solarScene.add(_sunCorona);
    
    const mainLight = new THREE.PointLight(0xfff8e0, 6.0, 0);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    _solarScene.add(mainLight);
    
    const fillLight = new THREE.PointLight(0xffaa44, 1.5, 0);
    fillLight.position.set(-50, 30, -30);
    _solarScene.add(fillLight);
    
    const rimLight = new THREE.DirectionalLight(0x88aaff, 0.3);
    rimLight.position.set(-1, 0.5, -1);
    _solarScene.add(rimLight);
    
    _solarScene.add(new THREE.AmbientLight(0x1a2233, 0.4));
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

function _buildPlanets() {
    _solarPlanets = PLANET_DATA.map(p => {
        const oRing = new THREE.Mesh(new THREE.RingGeometry(p.orbit-.05,p.orbit+.05,256), new THREE.MeshBasicMaterial({color:0x334466,transparent:true,opacity:.18,side:THREE.DoubleSide}));
        oRing.rotation.x = -Math.PI/2; _solarScene.add(oRing);
        const pivot = new THREE.Group(); pivot.userData.angle = Math.random()*Math.PI*2; _solarScene.add(pivot);
        
        const diffuseTexture = _generatePlanetTexture(p, 1024);
        const bumpTexture = _generateBumpMap(p, 1024);
        
        const material = new THREE.MeshStandardMaterial({
            map: diffuseTexture,
            bumpMap: bumpTexture,
            bumpScale: p.bumpScale ?? 0.02,
            color: new THREE.Color(p.col),
            emissive: new THREE.Color(p.emissive||'#000'),
            emissiveIntensity: p.emissiveIntensity ?? 0.35,
            roughness: p.rough ?? .75,
            metalness: p.metal ?? .05,
        });
        
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 96, 96), material);
        mesh.position.x=p.orbit; mesh.receiveShadow=mesh.castShadow=true; mesh.userData.planet=p; pivot.add(mesh);
        
        if (p.hasRings) {
            const rg = new THREE.Group();
            [
                [1.45, 1.8, .55, 0xd4b87a],
                [1.82, 2.2, .48, 0xc9a860],
                [2.22, 2.6, .42, 0xb89850]
            ].forEach(([i, o, op, col]) => {
                const ringMesh = new THREE.Mesh(
                    new THREE.RingGeometry(p.r*i, p.r*o, 256), 
                    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, side: THREE.DoubleSide })
                );
                rg.add(ringMesh);
            });
            rg.rotation.x = Math.PI/3.5; 
            mesh.add(rg);
        }
        
        if (p.isEarth) {
            const clouds = new THREE.Mesh(
                new THREE.SphereGeometry(p.r*1.01, 128, 128), 
                new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 })
            );
            clouds.raycast = () => {};
            mesh.add(clouds); 
        }
        
        return { mesh, pivot, data:p };
    });
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
    canvas.addEventListener('click', e => {
        if (_moved) return;
        _solarMouse.x=(e.clientX/window.innerWidth)*2-1;
        _solarMouse.y=-(e.clientY/window.innerHeight)*2+1;
        _solarRaycaster.setFromCamera(_solarMouse,_solarCamera);
        const hits=_solarRaycaster.intersectObjects(_solarPlanets.map(p=>p.mesh), true);
        if (hits.length>0) {
            let clickedObject = hits[0].object;
            let planet = clickedObject.userData.planet;
            
            while (!planet && clickedObject.parent) {
                clickedObject = clickedObject.parent;
                planet = clickedObject.userData.planet;
            }
            
            if (planet && planet.isEarth === true) {
                goEarth();
                return;
            } else if (planet) {
                _panelPlanet(planet);
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