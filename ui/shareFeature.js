// ═══════════════════════════════════════════════════════════════════════════
// SHARE FEATURE — paste this entire block into app.js
// (place it just above the "// ── BOOT ──" comment at the bottom)
// ═══════════════════════════════════════════════════════════════════════════

// ─── Share Modal Styles ───────────────────────────────────────────────────
(function _injectShareStyles() {
    if (document.getElementById('share-modal-styles')) return;
    const s = document.createElement('style');
    s.id = 'share-modal-styles';
    s.textContent = `
        /* ── Share button inside the location panel ── */
        .share-intel-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            margin-top: 14px;
            padding: 13px 16px;
            background: linear-gradient(135deg, #0f2744 0%, #07152a 100%);
            border: 1px solid rgba(77,166,255,0.4);
            border-radius: 12px;
            color: #7ab8ff;
            font-family: 'Segoe UI', sans-serif;
            font-size: 0.82rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            cursor: pointer;
            transition: all 0.22s ease;
        }
        .share-intel-btn:hover {
            background: linear-gradient(135deg, #152e56 0%, #0a1e3a 100%);
            border-color: rgba(77,166,255,0.7);
            color: #a8d0ff;
            box-shadow: 0 0 22px rgba(77,166,255,0.18);
            transform: translateY(-1px);
        }
        .share-intel-btn:active { transform: translateY(0); }

        /* ── Share modal overlay ── */
        #share-modal-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(2, 6, 18, 0.82);
            backdrop-filter: blur(6px);
            z-index: 9000;
            align-items: center;
            justify-content: center;
        }
        #share-modal-overlay.open {
            display: flex;
        }

        /* ── Share modal card ── */
        #share-modal {
            width: min(480px, calc(100vw - 32px));
            background: linear-gradient(160deg, #080f22 0%, #04080f 100%);
            border: 1px solid rgba(77,166,255,0.22);
            border-radius: 20px;
            box-shadow: 0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04) inset;
            padding: 28px 24px;
            font-family: 'Segoe UI', sans-serif;
            animation: share-modal-in 0.28s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes share-modal-in {
            from { opacity: 0; transform: scale(0.92) translateY(16px); }
            to   { opacity: 1; transform: scale(1)    translateY(0); }
        }

        .share-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        .share-modal-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 1rem;
            font-weight: 700;
            color: #c8d8f0;
        }
        .share-modal-title span:first-child { font-size: 1.3rem; }
        .share-modal-subtitle {
            font-size: 0.73rem;
            color: #3a5a80;
            margin-top: 2px;
        }
        .share-modal-close {
            background: none;
            border: none;
            color: #3a5a80;
            font-size: 1.1rem;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 8px;
            transition: color 0.2s, background 0.2s;
        }
        .share-modal-close:hover { color: #c0c8d8; background: rgba(255,255,255,0.07); }

        /* Location being shared */
        .share-location-badge {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 11px 14px;
            background: rgba(77,166,255,0.07);
            border: 1px solid rgba(77,166,255,0.15);
            border-radius: 10px;
            margin-bottom: 20px;
            font-size: 0.82rem;
            color: #7ab8ff;
        }
        .share-location-badge strong { color: #a8d0ff; }

        /* Tabs */
        .share-tabs {
            display: flex;
            gap: 6px;
            background: rgba(0,0,0,0.35);
            border-radius: 10px;
            padding: 4px;
            margin-bottom: 18px;
        }
        .share-tab {
            flex: 1;
            padding: 9px 12px;
            border: none;
            border-radius: 7px;
            background: transparent;
            color: #3a5a80;
            font-family: inherit;
            font-size: 0.78rem;
            font-weight: 600;
            cursor: pointer;
            letter-spacing: 0.04em;
            transition: all 0.2s;
        }
        .share-tab.active {
            background: rgba(77,166,255,0.16);
            color: #7ab8ff;
            box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        }

        /* Input field */
        .share-field {
            position: relative;
            margin-bottom: 14px;
        }
        .share-field label {
            display: block;
            font-size: 0.7rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            color: #3a5a80;
            text-transform: uppercase;
            margin-bottom: 6px;
        }
        .share-field input {
            width: 100%;
            box-sizing: border-box;
            padding: 12px 14px 12px 40px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(77,166,255,0.18);
            border-radius: 10px;
            color: #c8d8f0;
            font-family: inherit;
            font-size: 0.88rem;
            outline: none;
            transition: border-color 0.2s, background 0.2s;
        }
        .share-field input:focus {
            border-color: rgba(77,166,255,0.5);
            background: rgba(77,166,255,0.06);
        }
        .share-field input::placeholder { color: #1e3050; }
        .share-field-icon {
            position: absolute;
            left: 13px;
            bottom: 13px;
            font-size: 0.95rem;
            pointer-events: none;
            opacity: 0.5;
        }

        /* Content checkboxes */
        .share-content-wrap {
            margin-bottom: 16px;
        }
        .share-content-label {
            font-size: 0.7rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            color: #3a5a80;
            text-transform: uppercase;
            margin-bottom: 10px;
        }
        .share-content-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
        }
        .share-check-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(77,166,255,0.1);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.18s;
            font-size: 0.78rem;
            color: #5a7a9a;
            user-select: none;
        }
        .share-check-item:hover {
            background: rgba(77,166,255,0.07);
            border-color: rgba(77,166,255,0.2);
            color: #7a9ab8;
        }
        .share-check-item input[type="checkbox"] {
            width: 14px;
            height: 14px;
            accent-color: #4d94ff;
            cursor: pointer;
            flex-shrink: 0;
        }
        .share-check-item.checked {
            background: rgba(77,166,255,0.1);
            border-color: rgba(77,166,255,0.3);
            color: #8ab8e0;
        }

        /* Send button */
        .share-send-btn {
            width: 100%;
            padding: 13px;
            background: linear-gradient(135deg, #1a3a6e 0%, #0e2248 100%);
            border: 1px solid rgba(77,166,255,0.45);
            border-radius: 10px;
            color: #7ab8ff;
            font-family: inherit;
            font-size: 0.85rem;
            font-weight: 700;
            letter-spacing: 0.07em;
            text-transform: uppercase;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.22s;
        }
        .share-send-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, #1e4480 0%, #112a58 100%);
            border-color: rgba(77,166,255,0.7);
            color: #a8d0ff;
            box-shadow: 0 0 24px rgba(77,166,255,0.2);
        }
        .share-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Status */
        .share-status {
            margin-top: 10px;
            font-size: 0.78rem;
            text-align: center;
            min-height: 20px;
            transition: all 0.2s;
        }
        .share-status.success { color: #34d399; }
        .share-status.error   { color: #f87171; }
        .share-status.loading { color: #60a5fa; }

        /* Spinner */
        .share-spinner {
            width: 15px; height: 15px;
            border: 2px solid rgba(122,184,255,0.2);
            border-top-color: #7ab8ff;
            border-radius: 50%;
            animation: share-spin 0.7s linear infinite;
            display: inline-block;
        }
        @keyframes share-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(s);
})();

// ─── Build share modal DOM ────────────────────────────────────────────────
(function _buildShareModal() {
    if (document.getElementById('share-modal-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'share-modal-overlay';
    overlay.innerHTML = `
        <div id="share-modal" role="dialog" aria-modal="true" aria-label="Share Location Intel">
            <div class="share-modal-header">
                <div>
                    <div class="share-modal-title">
                        <span>📡</span>
                        <span>Share Location Intel</span>
                    </div>
                    <div class="share-modal-subtitle">Send this space report via Email or SMS</div>
                </div>
                <button class="share-modal-close" id="share-modal-close" aria-label="Close">✕</button>
            </div>

            <!-- Location being shared -->
            <div class="share-location-badge">
                📍 <strong id="share-location-name">—</strong>
            </div>

            <!-- Email / SMS tabs -->
            <div class="share-tabs">
                <button class="share-tab active" data-tab="email">📧 Email</button>
                <button class="share-tab" data-tab="sms">💬 SMS</button>
            </div>

            <!-- Email section -->
            <div id="share-email-section">
                <div class="share-field">
                    <label>Email address</label>
                    <span class="share-field-icon">📧</span>
                    <input type="email" id="share-email-input"
                           placeholder="you@example.com" autocomplete="email"/>
                </div>
            </div>

            <!-- SMS section -->
            <div id="share-sms-section" style="display:none">
                <div class="share-field">
                    <label>Phone number (international format)</label>
                    <span class="share-field-icon">📱</span>
                    <input type="tel" id="share-phone-input"
                           placeholder="+1 415 555 2671" autocomplete="tel"/>
                </div>
            </div>

            <!-- Content selection -->
            <div class="share-content-wrap">
                <div class="share-content-label">Include in report</div>
                <div class="share-content-grid">
                    <label class="share-check-item checked">
                        <input type="checkbox" name="share-section" value="sky" checked> 🌌 Sky Tonight
                    </label>
                    <label class="share-check-item checked">
                        <input type="checkbox" name="share-section" value="iss" checked> 🛸 ISS Pass
                    </label>
                    <label class="share-check-item checked">
                        <input type="checkbox" name="share-section" value="events" checked> 🚀 Space Events
                    </label>
                    <label class="share-check-item checked">
                        <input type="checkbox" name="share-section" value="satellites" checked> 🛰️ Satellites
                    </label>
                    <label class="share-check-item checked">
                        <input type="checkbox" name="share-section" value="launches" checked> 🔥 Launches
                    </label>
                    <label class="share-check-item checked">
                        <input type="checkbox" name="share-section" value="neo" checked> ☄️ NEO Watch
                    </label>
                </div>
            </div>

            <button class="share-send-btn" id="share-send-btn">
                <span id="share-send-icon">📡</span>
                <span id="share-send-text">SEND REPORT</span>
            </button>
            <div class="share-status" id="share-status"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.addEventListener('click', e => {
        if (e.target === overlay) _closeShareModal();
    });

    // Close button
    document.getElementById('share-modal-close').addEventListener('click', _closeShareModal);

    // Tab switching
    overlay.querySelectorAll('.share-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            overlay.querySelectorAll('.share-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const m = tab.dataset.tab;
            document.getElementById('share-email-section').style.display = m === 'email' ? '' : 'none';
            document.getElementById('share-sms-section').style.display   = m === 'sms'   ? '' : 'none';
            document.getElementById('share-status').textContent = '';
        });
    });

    // Checkbox styling
    overlay.querySelectorAll('.share-check-item input').forEach(cb => {
        cb.addEventListener('change', () => {
            cb.closest('.share-check-item').classList.toggle('checked', cb.checked);
        });
    });

    // Send button
    document.getElementById('share-send-btn').addEventListener('click', _handleShareSend);

    // Enter key
    ['share-email-input','share-phone-input'].forEach(id => {
        document.getElementById(id)?.addEventListener('keydown', e => {
            if (e.key === 'Enter') _handleShareSend();
        });
    });
})();

// ─── Share Modal State ────────────────────────────────────────────────────
let _sharePayload = null; // the structured data object from the panel

// ─── Open / Close ─────────────────────────────────────────────────────────
function _openShareModal(locationName, payload) {
    _sharePayload = payload;
    document.getElementById('share-location-name').textContent = locationName;
    document.getElementById('share-status').textContent = '';
    document.getElementById('share-email-input').value = '';
    document.getElementById('share-phone-input').value = '';
    document.getElementById('share-modal-overlay').classList.add('open');
    setTimeout(() => document.getElementById('share-email-input').focus(), 200);
}

function _closeShareModal() {
    document.getElementById('share-modal-overlay').classList.remove('open');
}

// ─── Send Handler ─────────────────────────────────────────────────────────
async function _handleShareSend() {
    const activeTab = document.querySelector('.share-tab.active')?.dataset.tab;
    const statusEl  = document.getElementById('share-status');
    const sendBtn   = document.getElementById('share-send-btn');
    const sendIcon  = document.getElementById('share-send-icon');
    const sendText  = document.getElementById('share-send-text');

    if (!_sharePayload) {
        statusEl.textContent = 'No data to send. Please re-open a location.';
        statusEl.className = 'share-status error';
        return;
    }

    // Collect selected sections
    const selectedSections = Array.from(
        document.querySelectorAll('input[name="share-section"]:checked')
    ).map(cb => cb.value);

    if (selectedSections.length === 0) {
        statusEl.textContent = 'Select at least one section to include.';
        statusEl.className = 'share-status error';
        return;
    }

    // Filter payload to only selected sections
    const filteredPayload = { ..._sharePayload };
    filteredPayload.sections = {};
    selectedSections.forEach(key => {
        if (_sharePayload.sections[key] !== undefined) {
            filteredPayload.sections[key] = _sharePayload.sections[key];
        }
    });

    // Loading state
    sendBtn.disabled = true;
    sendIcon.outerHTML = '<span id="share-send-icon" class="share-spinner"></span>';
    sendText.textContent = 'SENDING…';
    statusEl.textContent = '';
    statusEl.className = 'share-status loading';

    try {
        let endpoint, body, recipient;

        if (activeTab === 'email') {
            recipient = document.getElementById('share-email-input').value.trim();
            if (!recipient) {
                _resetShareBtn(); statusEl.textContent = 'Enter an email address.'; statusEl.className = 'share-status error'; return;
            }
            endpoint = '/api/share/email';
            body = { to: recipient, payload: filteredPayload };

        } else {
            recipient = document.getElementById('share-phone-input').value.trim();
            if (!recipient) {
                _resetShareBtn(); statusEl.textContent = 'Enter a phone number.'; statusEl.className = 'share-status error'; return;
            }
            endpoint = '/api/share/sms';
            body = { to: recipient, payload: filteredPayload };
        }

        const res  = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const json = await res.json();

        if (!res.ok) throw new Error(json.error || json.detail || 'Send failed');

        statusEl.textContent = `✅ ${json.message || 'Report sent successfully!'}`;
        statusEl.className = 'share-status success';

        // Auto-close after success
        setTimeout(_closeShareModal, 2800);

    } catch (err) {
        console.error('[Share] Error:', err);
        statusEl.textContent = `❌ ${err.message}`;
        statusEl.className = 'share-status error';
    } finally {
        _resetShareBtn();
    }
}

function _resetShareBtn() {
    const btn  = document.getElementById('share-send-btn');
    const icon = document.getElementById('share-send-icon');
    const text = document.getElementById('share-send-text');
    if (btn)  btn.disabled = false;
    if (icon) icon.outerHTML = '<span id="share-send-icon">📡</span>';
    if (text) text.textContent = 'SEND REPORT';
}

// ─── Build Share Payload from live panel data ─────────────────────────────
// Call this right after _onGlobeLocationClick finishes building the panel HTML.
// It extracts data already fetched by the location click handler.
function _buildSharePayload(locationName, coords, fetchedData) {
    const {
        weatherData,
        vis,
        issPass,
        spaceDevsEvents,
        spaceWeather,
        locationVisibility,
        impactRisk,
        satellitePasses,
        nearbyLaunches,
        nearDisaster,
    } = fetchedData || {};

    const sections = {};

    // Sky Tonight
    if (vis) {
        sections.sky = {
            score: vis.score,
            label: vis.label,
            message: vis.message,
            moon: VisibilityScore.moonDescription(vis.moonPct / 100),
            weather: weatherData
                ? `${_cap(weatherData.weather?.[0]?.description || '')} · ${Math.round(weatherData.main?.temp || 0)}°C · ${weatherData.clouds?.all ?? 0}% cloud`
                : null,
            nightHours: locationVisibility?.analysis?.night_hours ?? null,
        };
    }

    // ISS Pass
    if (issPass?.response?.[0]) {
        const pass = issPass.response[0];
        const pd   = new Date(pass.risetime * 1000);
        sections.iss = `Next pass: ${pd.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' })} at ${pd.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })} · Visible ~${formatDuration(pass.duration)}`;
    }

    // Space Events (SpaceDevs)
    if (spaceDevsEvents?.events?.length > 0) {
        sections.events = spaceDevsEvents.events
            .filter(e => new Date(e.date) > new Date())
            .slice(0, 5)
            .map(e => {
                const d = new Date(e.date);
                return `${e.name} — ${d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })} ${d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', timeZone:'UTC' })} UTC`;
            });
    }

    // Satellite Passes
    if (satellitePasses?.length > 0) {
        sections.satellites = satellitePasses.slice(0, 4).map(({ satellite, passes }) => {
            if (!passes?.length) return null;
            const p  = passes[0];
            const pd = new Date(p.startUTC * 1000);
            return `${satellite.name} — ${pd.toLocaleDateString([], { month:'short', day:'numeric' })} at ${pd.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })} · Max elev: ${p.maxEl}°`;
        }).filter(Boolean);
    }

    // Nearby Launches
    if (nearbyLaunches?.length > 0) {
        sections.launches = nearbyLaunches.slice(0, 3).map(l => {
            const d = new Date(l.net);
            return `${l.name || 'Unnamed Launch'} — ${d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })} · ${l.pad?.location?.name || ''}`;
        });
    }

    // Space Weather
    if (spaceWeather?.summary) {
        sections.spaceWeather = spaceWeather.summary;
    }

    // NEO
    if (impactRisk?.hazardous_count > 0) {
        sections.neo = `${impactRisk.hazardous_count} potentially hazardous asteroid(s) tracked this week.`;
    }

    // Disaster
    if (nearDisaster) {
        const { event, distKm, cat } = nearDisaster;
        sections.disaster = `${event.title} — ${cat} · ${distKm.toLocaleString()} km away`;
    }

    return {
        location: locationName,
        coords,
        sections,
        generatedAt: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
    };
}

// Make share functions available globally
window._openShareModal  = _openShareModal;
window._buildSharePayload = _buildSharePayload;
window._closeShareModal = _closeShareModal;