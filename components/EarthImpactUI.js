// components/EarthImpactUI.js
// Enhanced Earth Impact Dashboard — 4 modules: Climate · Disasters · Agriculture · Environment
// Aesthetic: High-density data ops / mission-control dark terminal with vivid accent glows

const EarthImpactUI = (() => {

    // ── Colour tokens ────────────────────────────────────────────────────────
    const C = {
        bg0:    '#050810',
        bg1:    '#0a0f1e',
        bg2:    '#0f1628',
        bg3:    '#151d35',
        border: '#1e2a45',
        borderBright: '#2a3d60',
        text:   '#e2e8f8',
        muted:  '#6b7fa8',
        dim:    '#3a4a6a',
        climate: '#38bdf8',   // sky-blue
        disaster:'#f87171',  // red
        agri:   '#4ade80',    // green
        env:    '#a78bfa',    // violet
        gold:   '#fbbf24',
        orange: '#fb923c',
    };

    // ── CSS (injected once) ──────────────────────────────────────────────────
    const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap');

    #impact-wrap { font-family: 'Outfit', sans-serif; background: ${C.bg0}; color: ${C.text}; }
    #impact-wrap * { box-sizing: border-box; }

    /* ── dashboard shell ── */
    .ei-shell {
        min-height: 100vh;
        background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(56,189,248,.06) 0%, transparent 60%),
                    radial-gradient(ellipse 60% 40% at 80% 80%, rgba(167,139,250,.04) 0%, transparent 50%),
                    ${C.bg0};
        padding: 20px;
    }

    /* ── header ── */
    .ei-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 18px 24px; margin-bottom: 20px;
        background: ${C.bg1};
        border: 1px solid ${C.border};
        border-radius: 14px;
        gap: 16px;
    }
    .ei-logo { display: flex; align-items: center; gap: 12px; }
    .ei-logo-icon {
        width: 44px; height: 44px;
        background: linear-gradient(135deg, rgba(56,189,248,.2), rgba(167,139,250,.2));
        border: 1px solid rgba(56,189,248,.3);
        border-radius: 12px; display: flex; align-items: center; justify-content: center;
        font-size: 22px;
    }
    .ei-logo-title { font-weight: 800; font-size: 1.2rem; letter-spacing: -.02em; }
    .ei-logo-sub   { font-size: .7rem; color: ${C.muted}; font-family: 'JetBrains Mono', monospace; margin-top: 1px; }
    .ei-header-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .ei-live-badge {
        display: flex; align-items: center; gap: 6px;
        padding: 5px 10px; border-radius: 20px;
        background: rgba(74,222,128,.1); border: 1px solid rgba(74,222,128,.25);
        font-size: .7rem; color: #4ade80; font-family: 'JetBrains Mono', monospace; font-weight: 600;
    }
    .ei-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; animation: pulse 2s infinite; }
    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }
    .ei-timestamp { font-size: .7rem; color: ${C.muted}; font-family: 'JetBrains Mono', monospace; }
    .ei-refresh-btn {
        width: 34px; height: 34px; border-radius: 8px;
        background: rgba(56,189,248,.1); border: 1px solid rgba(56,189,248,.2);
        color: ${C.climate}; font-size: 16px; cursor: pointer;
        transition: all .2s; display: flex; align-items: center; justify-content: center;
    }
    .ei-refresh-btn:hover { background: rgba(56,189,248,.2); transform: rotate(45deg); }

    /* ── global stats bar ── */
    .ei-statsbar {
        display: grid; grid-template-columns: repeat(4, 1fr);
        gap: 12px; margin-bottom: 20px;
    }
    .ei-stat {
        padding: 16px 18px; border-radius: 12px;
        background: ${C.bg1}; border: 1px solid ${C.border};
        display: flex; align-items: center; gap: 14px;
        transition: border-color .2s;
        position: relative; overflow: hidden;
    }
    .ei-stat::before {
        content:''; position:absolute; inset:0; opacity:0.04;
        background: linear-gradient(135deg, var(--c1), transparent);
    }
    .ei-stat:hover { border-color: ${C.borderBright}; }
    .ei-stat-icon {
        width: 42px; height: 42px; border-radius: 10px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center; font-size: 20px;
        background: rgba(var(--cr), .12); border: 1px solid rgba(var(--cr), .2);
    }
    .ei-stat-info { min-width: 0; }
    .ei-stat-label { font-size: .68rem; color: ${C.muted}; text-transform: uppercase; letter-spacing: .06em; font-weight: 600; margin-bottom: 3px; }
    .ei-stat-value { font-size: 1.4rem; font-weight: 800; line-height: 1; color: var(--c1); }
    .ei-stat-sub   { font-size: .67rem; color: ${C.dim}; margin-top: 3px; font-family: 'JetBrains Mono', monospace; }

    /* ── tab nav ── */
    .ei-tabs { background: ${C.bg1}; border: 1px solid ${C.border}; border-radius: 14px; overflow: hidden; }
    .ei-tab-nav {
        display: flex; border-bottom: 1px solid ${C.border};
        background: ${C.bg0};
    }
    .ei-tab-btn {
        flex: 1; padding: 14px 8px; background: transparent; border: none;
        color: ${C.muted}; font-family: 'Outfit', sans-serif; font-size: .82rem; font-weight: 600;
        cursor: pointer; transition: all .2s; position: relative;
        letter-spacing: .01em; display: flex; align-items: center; justify-content: center; gap: 7px;
    }
    .ei-tab-btn::after {
        content:''; position:absolute; bottom:0; left:0; right:0; height:2px;
        background: var(--accent); opacity:0; transition: opacity .2s;
    }
    .ei-tab-btn.active       { color: var(--accent); background: rgba(var(--accentRgb),.06); }
    .ei-tab-btn.active::after{ opacity: 1; }
    .ei-tab-btn:hover:not(.active) { color: ${C.text}; }
    .ei-tab-btn .tab-icon { font-size: 1rem; }
    .ei-tab-pane { display: none; padding: 24px; animation: fadeIn .3s ease; }
    .ei-tab-pane.active { display: block; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }

    /* ── cards ── */
    .ei-card {
        background: ${C.bg2}; border: 1px solid ${C.border};
        border-radius: 12px; padding: 20px; margin-bottom: 16px;
        position: relative; overflow: hidden;
    }
    .ei-card-head {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 16px; gap: 8px;
    }
    .ei-card-title {
        font-size: .85rem; font-weight: 700; color: ${C.text};
        display: flex; align-items: center; gap: 8px;
    }
    .ei-card-badge {
        font-size: .62rem; padding: 3px 8px; border-radius: 10px; font-family: 'JetBrains Mono', monospace;
        background: rgba(var(--accentRgb),.12); color: var(--accent); border: 1px solid rgba(var(--accentRgb),.2);
    }
    .ei-source { font-size: .65rem; color: ${C.dim}; font-family: 'JetBrains Mono', monospace; }

    /* ── 2-col grid ── */
    .ei-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .ei-grid3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
    .ei-grid4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }

    /* ── metric tile ── */
    .ei-metric {
        background: ${C.bg3}; border: 1px solid ${C.border};
        border-radius: 10px; padding: 14px 16px; text-align: center;
    }
    .ei-metric-val   { font-size: 1.55rem; font-weight: 800; color: var(--accent); line-height: 1; margin-bottom: 4px; }
    .ei-metric-label { font-size: .67rem; color: ${C.muted}; text-transform: uppercase; letter-spacing: .05em; }
    .ei-metric-sub   { font-size: .65rem; color: ${C.dim}; margin-top: 4px; }

    /* ── SVG charts ── */
    .ei-chart-wrap { position: relative; }
    .ei-chart-wrap svg { overflow: visible; }
    .ei-no-data { text-align:center; color:${C.muted}; padding:30px; font-size:.85rem; }

    /* ── bar chart ── */
    .ei-bars { display: flex; flex-direction: column; gap: 8px; }
    .ei-bar-row { display: flex; align-items: center; gap: 10px; }
    .ei-bar-label { font-size: .75rem; color: ${C.muted}; width: 120px; text-align: right; flex-shrink: 0; }
    .ei-bar-track { flex: 1; height: 8px; background: ${C.bg3}; border-radius: 4px; overflow: hidden; }
    .ei-bar-fill  { height: 100%; border-radius: 4px; background: var(--accent); transition: width .6s cubic-bezier(.4,0,.2,1); }
    .ei-bar-val   { font-size: .72rem; color: ${C.text}; width: 60px; font-family: 'JetBrains Mono', monospace; }

    /* ── earthquake list ── */
    .ei-quake-row {
        display: flex; align-items: center; gap: 12px;
        padding: 10px 0; border-bottom: 1px solid ${C.border};
    }
    .ei-quake-row:last-child { border-bottom: none; }
    .ei-quake-mag {
        width: 48px; height: 48px; border-radius: 10px;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        background: rgba(var(--qc), .12); border: 1px solid rgba(var(--qc), .25); flex-shrink: 0;
    }
    .ei-quake-mag-val { font-size: .9rem; font-weight: 800; line-height: 1; }
    .ei-quake-mag-lbl { font-size: .5rem; color: ${C.muted}; }
    .ei-quake-info { flex: 1; min-width: 0; }
    .ei-quake-place { font-size: .8rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ei-quake-meta  { font-size: .68rem; color: ${C.muted}; margin-top: 2px; }
    .ei-quake-alert { padding: 3px 8px; border-radius: 6px; font-size: .6rem; font-weight: 700; text-transform: uppercase; flex-shrink: 0; }

    /* ── progress ring ── */
    .ei-ring-wrap { position: relative; display: inline-flex; flex-direction: column; align-items: center; }
    .ei-ring-val  { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); text-align: center; }
    .ei-ring-num  { font-size: 1.4rem; font-weight: 800; line-height: 1; }
    .ei-ring-lbl  { font-size: .58rem; color: ${C.muted}; }

    /* ── region table ── */
    .ei-region-table { width: 100%; border-collapse: collapse; font-size: .78rem; }
    .ei-region-table th {
        text-align: left; padding: 8px 10px; color: ${C.muted};
        font-size: .65rem; text-transform: uppercase; letter-spacing: .05em;
        border-bottom: 1px solid ${C.border}; font-weight: 600;
    }
    .ei-region-table td { padding: 9px 10px; border-bottom: 1px solid rgba(30,42,69,.5); }
    .ei-region-table tr:last-child td { border-bottom: none; }
    .ei-region-table tr:hover td { background: rgba(255,255,255,.02); }
    .ei-stress-pill {
        padding: 3px 8px; border-radius: 8px; font-size: .65rem; font-weight: 700;
        text-transform: uppercase; letter-spacing: .04em;
    }
    .ei-ndvi-bar { height: 6px; border-radius: 3px; background: linear-gradient(90deg, #dc2626, #fbbf24, #4ade80); position: relative; width: 80px; }
    .ei-ndvi-indicator { position: absolute; top: -3px; width: 4px; height: 12px; background: white; border-radius: 2px; transform: translateX(-50%); }

    /* ── AQI cities ── */
    .ei-city-row {
        display: flex; align-items: center; gap: 10px;
        padding: 10px 0; border-bottom: 1px solid ${C.border};
    }
    .ei-city-row:last-child { border-bottom: none; }
    .ei-city-name { font-size: .8rem; font-weight: 600; width: 80px; }
    .ei-city-pm   { font-family: 'JetBrains Mono', monospace; font-size: .8rem; width: 60px; color: var(--aqi-c); }
    .ei-city-track { flex: 1; height: 6px; background: ${C.bg3}; border-radius: 3px; overflow: hidden; }
    .ei-city-fill  { height: 100%; border-radius: 3px; background: var(--aqi-c); }
    .ei-aqi-badge  { padding: 3px 9px; border-radius: 8px; font-size: .62rem; font-weight: 700; width: 90px; text-align: center; }

    /* ── inline KPI row ── */
    .ei-kpi-row { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .ei-kpi {
        flex: 1; min-width: 100px; background: ${C.bg3}; border: 1px solid ${C.border};
        border-radius: 10px; padding: 12px; text-align: center;
    }
    .ei-kpi-v { font-size: 1.25rem; font-weight: 800; line-height: 1; margin-bottom: 3px; }
    .ei-kpi-l { font-size: .65rem; color: ${C.muted}; text-transform: uppercase; letter-spacing: .04em; }

    /* ── info boxes ── */
    .ei-infobox {
        padding: 10px 14px; border-radius: 8px; font-size: .78rem; line-height: 1.5;
        margin-top: 10px; border-left: 3px solid var(--accent);
        background: rgba(var(--accentRgb), .06);
    }

    /* ── section divider ── */
    .ei-divider { height: 1px; background: ${C.border}; margin: 20px 0; }

    /* ── loading / error ── */
    .ei-loading {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        min-height: 400px; gap: 16px;
    }
    .ei-spinner {
        width: 48px; height: 48px; border-radius: 50%;
        border: 3px solid ${C.border}; border-top-color: ${C.climate};
        animation: spin .9s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .ei-loading-text  { font-size: .9rem; color: ${C.muted}; }
    .ei-loading-steps { font-size: .72rem; color: ${C.dim}; font-family: 'JetBrains Mono', monospace; }

    /* ── responsive ── */
    @media (max-width: 900px) {
        .ei-statsbar { grid-template-columns: repeat(2,1fr); }
        .ei-grid2    { grid-template-columns: 1fr; }
        .ei-grid3    { grid-template-columns: repeat(2,1fr); }
        .ei-grid4    { grid-template-columns: repeat(2,1fr); }
        .ei-tab-btn  { font-size: .72rem; }
        .ei-region-table { font-size: .7rem; }
    }
    @media (max-width: 600px) {
        .ei-statsbar { grid-template-columns: 1fr; }
        .ei-grid3    { grid-template-columns: 1fr; }
        .ei-grid4    { grid-template-columns: repeat(2,1fr); }
        .ei-shell    { padding: 12px; }
    }
    `;

    let _cssInjected = false;

    function _injectCSS() {
        if (_cssInjected) return;
        const s = document.createElement('style');
        s.id    = 'earth-impact-styles';
        s.textContent = CSS;
        document.head.appendChild(s);
        _cssInjected = true;
    }

    // ── SVG Line Chart ──────────────────────────────────────────────────────
    function _lineChart(x, y, color, unit = '', { h = 180, showDots = false, gradient = true } = {}) {
        if (!x?.length || !y?.length) return '<p class="ei-no-data">No data</p>';
        const W = 600, H = h, P = { t: 24, r: 20, b: 32, l: 48 };
        const xMin = Math.min(...x), xMax = Math.max(...x);
        const yMin = Math.min(...y), yMax = Math.max(...y);
        const yRange = (yMax - yMin) || 1;
        const xS = v => P.l + ((v - xMin) / (xMax - xMin)) * (W - P.l - P.r);
        const yS = v => P.t + (1 - (v - yMin) / yRange) * (H - P.t - P.b);
        const gradId = `eg${Math.random().toString(36).slice(2,7)}`;

        // Y-axis: 4 ticks
        const ticks = 4;
        const yLabels = Array.from({ length: ticks + 1 }, (_, i) => yMin + yRange * i / ticks);

        // X-axis: max 6 labels, evenly spaced
        const xLabelCount = Math.min(6, x.length);
        const xLabelIndices = x.length <= 1 ? [0] : Array.from({ length: xLabelCount }, (_, i) =>
            Math.round(i * (x.length - 1) / (xLabelCount - 1))
        );

        // Build smooth cubic bezier path
        const pts2d = x.map((xi, i) => [xS(xi), yS(y[i])]);
        let pathD = `M ${pts2d[0][0].toFixed(1)},${pts2d[0][1].toFixed(1)}`;
        for (let i = 1; i < pts2d.length; i++) {
            const [x0, y0] = pts2d[i - 1];
            const [x1, y1] = pts2d[i];
            const cpx = (x0 + x1) / 2;
            pathD += ` C ${cpx.toFixed(1)},${y0.toFixed(1)} ${cpx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
        }

        // Area fill path
        const areaD = pathD +
            ` L ${pts2d.at(-1)[0].toFixed(1)},${H - P.b}` +
            ` L ${pts2d[0][0].toFixed(1)},${H - P.b} Z`;

        // Only show dots on sparse datasets (≤ 15 points)
        const showDotsFinal = showDots || x.length <= 15;

        return `
        <svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="border-radius:6px">
            <defs>
                <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="${color}" stop-opacity=".3"/>
                    <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
                </linearGradient>
            </defs>
            <!-- Grid lines + Y labels -->
            ${yLabels.map(v => `
                <line x1="${P.l}" y1="${yS(v).toFixed(1)}" x2="${W-P.r}" y2="${yS(v).toFixed(1)}" stroke="#1e2a45" stroke-width="1" stroke-dasharray="3,5"/>
                <text x="${P.l-6}" y="${(yS(v)+4).toFixed(1)}" text-anchor="end" fill="#6b7fa8" font-size="10" font-family="JetBrains Mono,monospace">${v.toFixed(2)}</text>
            `).join('')}
            <!-- Area fill -->
            ${gradient ? `<path d="${areaD}" fill="url(#${gradId})"/>` : ''}
            <!-- Smooth line -->
            <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
            <!-- X-axis labels -->
            ${xLabelIndices.map(i =>
                `<text x="${xS(x[i]).toFixed(1)}" y="${H-P.b+14}" text-anchor="middle" fill="#6b7fa8" font-size="10" font-family="JetBrains Mono,monospace">${x[i]}</text>`
            ).join('')}
            <!-- Dots for sparse data only -->
            ${showDotsFinal ? pts2d.map(([cx, cy]) =>
                `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="3" fill="${color}" stroke="${C.bg0}" stroke-width="1.5"/>`
            ).join('') : ''}
            <!-- Last point always highlighted -->
            <circle cx="${pts2d.at(-1)[0].toFixed(1)}" cy="${pts2d.at(-1)[1].toFixed(1)}" r="5" fill="${color}" stroke="${C.bg0}" stroke-width="2"/>
            <circle cx="${pts2d.at(-1)[0].toFixed(1)}" cy="${pts2d.at(-1)[1].toFixed(1)}" r="9" fill="${color}" stroke-width="0" opacity="0.2"/>
        </svg>`;
    }

    // ── Mini sparkline (no axes) ─────────────────────────────────────────────
    function _spark(y, color, w = 100, h = 30) {
        if (!y?.length) return '';
        const yMin = Math.min(...y), yMax = Math.max(...y), yR = (yMax - yMin) || 1;
        const xS = i => (i / (y.length - 1)) * w;
        const yS = v => h - ((v - yMin) / yR) * h;
        const pts = y.map((v, i) => `${xS(i).toFixed(1)},${yS(v).toFixed(1)}`).join(' ');
        return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8"/></svg>`;
    }

    // ── SVG Ring ─────────────────────────────────────────────────────────────
    function _ring(pct, color, label, value, size = 90) {
        const r = (size - 12) / 2, cx = size / 2, cy = size / 2;
        const circ = 2 * Math.PI * r;
        const dash = (pct / 100) * circ;
        return `
        <div class="ei-ring-wrap">
            <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.bg3}" stroke-width="8"/>
                <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="8"
                    stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}"
                    stroke-linecap="round"
                    transform="rotate(-90 ${cx} ${cy})"/>
            </svg>
            <div class="ei-ring-val">
                <div class="ei-ring-num" style="color:${color}">${value}</div>
                <div class="ei-ring-lbl">${label}</div>
            </div>
        </div>`;
    }

    // ── AQI colour helper ─────────────────────────────────────────────────────
    function _aqiColor(aqi) {
        return ['','#4ade80','#fbbf24','#fb923c','#f87171','#a855f7'][aqi] ?? C.muted;
    }

    // ── stress colour ─────────────────────────────────────────────────────────
    function _stressColor(s) {
        return s < 20 ? '#4ade80' : s < 50 ? '#fbbf24' : '#f87171';
    }

    // ════════════════════════════════════════════════════════════════════════
    //  RENDER
    // ════════════════════════════════════════════════════════════════════════
    function render(containerId, state) {
        _injectCSS();
        const el = document.getElementById(containerId);
        if (!el) return;

        if (state.globalLoading && !state.climate?.temperature && !state.disasters?.fires) {
            el.innerHTML = _renderLoading();
            return;
        }

        el.innerHTML = `
        <div class="ei-shell">
            ${_renderHeader(state)}
            ${_renderStatsBar(state)}
            ${_renderTabs(state)}
        </div>`;

        _attachTabListeners(containerId);
    }

    // ── Header ───────────────────────────────────────────────────────────────
    function _renderHeader(s) {
        const ts = s.lastUpdated ? new Date(s.lastUpdated).toLocaleTimeString() : '—';
        return `
        <div class="ei-header">
            <div class="ei-logo">
                <div class="ei-logo-icon">🌍</div>
                <div>
                    <div class="ei-logo-title">Earth Impact Monitor</div>
                    <div class="ei-logo-sub">NASA · NOAA · USGS · Open-Meteo · NSIDC</div>
                </div>
            </div>
            <div class="ei-header-right">
                <div class="ei-live-badge"><div class="ei-live-dot"></div> LIVE DATA</div>
                <div class="ei-timestamp">Updated ${ts}</div>
                <button class="ei-refresh-btn" onclick="EarthImpact.refresh()" title="Refresh">↻</button>
            </div>
        </div>`;
    }

    // ── Stats bar ─────────────────────────────────────────────────────────────
    function _renderStatsBar(s) {
        const co2  = s.climate?.co2?.current ?? '—';
        const temp = s.climate?.temperature?.current != null ? `+${s.climate.temperature.current.toFixed(2)}°C` : '—';
        const fires = s.disasters?.fires?.total?.toLocaleString() ?? '—';
        const quakes = s.disasters?.earthquakes?.count ?? '—';
        const ndvi  = s.agriculture?.globalNDVI ?? '—';
        const pm25  = s.environment?.airQuality?.avgPM25 ?? '—';
        const kp    = s.environment?.spaceWeather?.kp ?? '—';
        const defor = s.environment?.deforestation?.dailyHa != null
            ? `${s.environment.deforestation.dailyHa.toLocaleString()} ha` : '—';

        const mkStat = (icon, label, val, sub, c1, cr) => `
        <div class="ei-stat" style="--c1:${c1};--cr:${cr}">
            <div class="ei-stat-icon" style="--cr:${cr}">${icon}</div>
            <div class="ei-stat-info">
                <div class="ei-stat-label">${label}</div>
                <div class="ei-stat-value">${val}</div>
                <div class="ei-stat-sub">${sub}</div>
            </div>
        </div>`;

        return `
        <div class="ei-statsbar">
            ${mkStat('🌡️','Temp Anomaly', temp, 'vs 1951-80 baseline', C.climate, '56,189,248')}
            ${mkStat('🔥','Active Fires', fires, 'NASA FIRMS 24h', C.disaster, '248,113,113')}
            ${mkStat('🌿','Global NDVI', ndvi, 'Vegetation health index', C.agri, '74,222,128')}
            ${mkStat('🌫️','Avg PM2.5', `${pm25}µg/m³`, 'WHO baseline: 5µg/m³', C.env, '167,139,250')}
        </div>`;
    }

    // ── Tabs shell ────────────────────────────────────────────────────────────
    function _renderTabs(s) {
        return `
        <div class="ei-tabs" id="ei-tabs">
            <div class="ei-tab-nav">
                <button class="ei-tab-btn active"  data-tab="climate"  style="--accent:${C.climate};--accentRgb:56,189,248">
                    <span class="tab-icon">🌡️</span> Climate
                </button>
                <button class="ei-tab-btn" data-tab="disasters" style="--accent:${C.disaster};--accentRgb:248,113,113">
                    <span class="tab-icon">⚠️</span> Disasters
                </button>
                <button class="ei-tab-btn" data-tab="agri"      style="--accent:${C.agri};--accentRgb:74,222,128">
                    <span class="tab-icon">🌾</span> Agriculture
                </button>
                <button class="ei-tab-btn" data-tab="env"       style="--accent:${C.env};--accentRgb:167,139,250">
                    <span class="tab-icon">🌬️</span> Environment
                </button>
            </div>
            <div id="pane-climate"  class="ei-tab-pane active">${_renderClimate(s.climate)}</div>
            <div id="pane-disasters"class="ei-tab-pane">${_renderDisasters(s.disasters)}</div>
            <div id="pane-agri"     class="ei-tab-pane">${_renderAgriculture(s.agriculture)}</div>
            <div id="pane-env"      class="ei-tab-pane">${_renderEnvironment(s.environment)}</div>
        </div>`;
    }

    // ════════════════════════════════════════════════════════════════════════
    //  CLIMATE TAB
    // ════════════════════════════════════════════════════════════════════════
    function _renderClimate(c) {
        if (!c || c.loading) return _paneLoad('Climate data loading…');
        const { temperature: t, co2, seaIce: ice } = c;

        const tempKPIs = t ? `
            <div class="ei-kpi-row">
                <div class="ei-kpi">
                    <div class="ei-kpi-v" style="color:${C.climate}">+${t.current.toFixed(2)}°C</div>
                    <div class="ei-kpi-l">Current Anomaly</div>
                </div>
                <div class="ei-kpi">
                    <div class="ei-kpi-v" style="color:${C.orange}">${t.trend > 0 ? '+' : ''}${(t.trend*10).toFixed(3)}°C</div>
                    <div class="ei-kpi-l">Per Decade Trend</div>
                </div>
                <div class="ei-kpi">
                    <div class="ei-kpi-v" style="color:${C.disaster}">1.5°C</div>
                    <div class="ei-kpi-l">Paris Target</div>
                </div>
                <div class="ei-kpi">
                    <div class="ei-kpi-v" style="color:${t.current >= 1.5 ? C.disaster : C.agri}">${((1.5 - t.current)).toFixed(2)}°C</div>
                    <div class="ei-kpi-l">Remaining Budget</div>
                </div>
            </div>` : '';

        const co2KPIs = co2 ? `
            <div class="ei-kpi-row">
                <div class="ei-kpi">
                    <div class="ei-kpi-v" style="color:${C.climate}">${co2.current} ppm</div>
                    <div class="ei-kpi-l">Current CO₂</div>
                </div>
                <div class="ei-kpi">
                    <div class="ei-kpi-v" style="color:${C.orange}">+${co2.increase5yr} ppm</div>
                    <div class="ei-kpi-l">5-Year Rise</div>
                </div>
                <div class="ei-kpi">
                    <div class="ei-kpi-v" style="color:${C.muted}">280 ppm</div>
                    <div class="ei-kpi-l">Pre-industrial</div>
                </div>
                <div class="ei-kpi">
                    <div class="ei-kpi-v" style="color:${C.disaster}">+${(co2.current - 280).toFixed(0)} ppm</div>
                    <div class="ei-kpi-l">Above Pre-ind.</div>
                </div>
            </div>` : '';

        const iceKPIs = ice ? `
            <div class="ei-kpi-row">
                <div class="ei-kpi">
                    <div class="ei-kpi-v" style="color:${C.climate}">${ice.current} M km²</div>
                    <div class="ei-kpi-l">Sept Minimum</div>
                </div>
                <div class="ei-kpi">
                    <div class="ei-kpi-v" style="color:${C.disaster}">-${ice.lossFromBaseline} M km²</div>
                    <div class="ei-kpi-l">Loss vs 1980s</div>
                </div>
                <div class="ei-kpi">
                    <div class="ei-kpi-v" style="color:${C.muted}">${ice.baseline} M km²</div>
                    <div class="ei-kpi-l">1980s Baseline</div>
                </div>
                <div class="ei-kpi">
                    <div class="ei-kpi-v" style="color:${C.orange}">${((1 - ice.current / ice.baseline) * 100).toFixed(0)}%</div>
                    <div class="ei-kpi-l">Decline Rate</div>
                </div>
            </div>` : '';

        return `
        <div class="ei-grid2">
            <div>
                <div class="ei-card" style="--accent:${C.climate};--accentRgb:56,189,248">
                    <div class="ei-card-head">
                        <div class="ei-card-title"> Global Temperature Anomaly
                            <span class="ei-card-badge">NASA GISTEMP</span>
                        </div>
                    </div>
                    ${tempKPIs}
                    <div class="ei-chart-wrap">
                        ${t ? _lineChart(t.years, t.anomalies, C.climate, '°C', { h: 160 }) : '<p class="ei-no-data">No data</p>'}
                    </div>
                    <div class="ei-source" style="margin-top:8px">Source: ${t?.source ?? '—'}</div>
                </div>
                <div class="ei-card" style="--accent:#06b6d4;--accentRgb:6,182,212">
                    <div class="ei-card-head">
                        <div class="ei-card-title">🧊 Arctic Sea Ice Extent
                            <span class="ei-card-badge">NSIDC</span>
                        </div>
                    </div>
                    ${iceKPIs}
                    <div class="ei-chart-wrap">
                        ${ice ? _lineChart(ice.years, ice.extent, '#06b6d4', 'M km²', { h: 150 }) : '<p class="ei-no-data">No data</p>'}
                    </div>
                    <div class="ei-source" style="margin-top:8px">September minimum extent · ${ice?.source ?? '—'}</div>
                </div>
            </div>
            <div>
                <div class="ei-card" style="--accent:${C.orange};--accentRgb:251,146,60">
                    <div class="ei-card-head">
                        <div class="ei-card-title">🧪 Atmospheric CO₂
                            <span class="ei-card-badge">NOAA ESRL</span>
                        </div>
                    </div>
                    ${co2KPIs}
                    <div class="ei-chart-wrap">
                        ${co2 ? _lineChart(co2.years, co2.levels, C.orange, 'ppm', { h: 160 }) : '<p class="ei-no-data">No data</p>'}
                    </div>
                    <div class="ei-source" style="margin-top:8px">Mauna Loa Observatory · ${co2?.source ?? '—'}</div>
                </div>
                <div class="ei-card" style="--accent:${C.agri};--accentRgb:74,222,128">
                    <div class="ei-card-head">
                        <div class="ei-card-title">📊 Climate Risk Summary</div>
                    </div>
                    <div class="ei-bars" style="--accent:${C.climate}">
                        ${_bar('Warming Progress', t ? Math.min(100, (t.current / 2) * 100) : 65, `${t?.current ?? '?'}°C / 2°C`, C.disaster)}
                        ${_bar('CO₂ Concentration', co2 ? Math.min(100, ((co2.current - 280) / 140) * 100) : 60, `${co2?.current ?? '?'} ppm`, C.orange)}
                        ${_bar('Sea Ice Loss', ice ? Math.min(100, (ice.lossFromBaseline / ice.baseline) * 100) : 45, `${ice?.lossFromBaseline ?? '?'} M km²`, '#06b6d4')}
                        ${_bar('Paris 1.5°C Budget Used', t ? Math.min(100, (t.current / 1.5) * 100) : 80, `${t ? ((t.current / 1.5) * 100).toFixed(0) : '?'}%`, t && t.current >= 1.5 ? C.disaster : C.gold)}
                    </div>
                    <div class="ei-infobox" style="--accent:${C.climate};--accentRgb:56,189,248;margin-top:16px">
                        🌡️ The planet has warmed <strong>${t?.current?.toFixed(2) ?? '~1.3'}°C</strong> above pre-industrial levels.
                        CO₂ is <strong>${co2?.current ?? '~422'} ppm</strong> — the highest in 800,000 years.
                        Arctic sea ice has shrunk by <strong>${ice?.lossFromBaseline ?? '~3.1'} million km²</strong> since the 1980s.
                    </div>
                </div>
            </div>
        </div>`;
    }

    function _bar(label, pct, val, color) {
        return `
        <div class="ei-bar-row">
            <div class="ei-bar-label">${label}</div>
            <div class="ei-bar-track"><div class="ei-bar-fill" style="width:${pct.toFixed(0)}%;background:${color}"></div></div>
            <div class="ei-bar-val" style="color:${color}">${val}</div>
        </div>`;
    }

    // ════════════════════════════════════════════════════════════════════════
    //  DISASTERS TAB
    // ════════════════════════════════════════════════════════════════════════
    function _renderDisasters(d) {
        if (!d || d.loading) return _paneLoad('Disaster data loading…');
        const { fires, earthquakes: q, eonet } = d;

        const qList   = q?.quakes?.slice(0, 6) ?? [];
        const magDist = q?.magDist ?? {};

        // EONET category icons
        const EONET_ICONS = {
            'Wildfires':      '🔥',
            'Severe Storms':  '🌪️',
            'Volcanoes':      '🌋',
            'Floods':         '🌊',
            'Sea and Lake Ice': '🧊',
            'Earthquakes':    '⚡',
            'Drought':        '☀️',
            'Dust and Haze':  '🌫️',
            'Landslides':     '⛰️',
            'Snow':           '❄️',
        };

        // Fire region bars
        const regionEntries = Object.entries(fires?.byRegion ?? {}).sort((a, b) => b[1] - a[1]);
        const regionMax = Math.max(...regionEntries.map(e => e[1]), 1);

        return `
        <div class="ei-grid2">
            <div>
                <!-- Fire stats card -->
                <div class="ei-card" style="--accent:${C.disaster};--accentRgb:248,113,113">
                    <div class="ei-card-head">
                        <div class="ei-card-title">🔥 Active Fire Detections
                            <span class="ei-card-badge">${fires?.source?.includes('estimated') ? 'ESTIMATED' : 'NASA FIRMS LIVE'}</span>
                        </div>
                    </div>
                    <div class="ei-kpi-row">
                        <div class="ei-kpi">
                            <div class="ei-kpi-v" style="color:${C.disaster}">${fires?.total?.toLocaleString() ?? '—'}</div>
                            <div class="ei-kpi-l">Fire Pixels (24h)</div>
                        </div>
                        <div class="ei-kpi">
                            <div class="ei-kpi-v" style="color:${C.orange}">${fires?.highIntensity?.toLocaleString() ?? '—'}</div>
                            <div class="ei-kpi-l">High Intensity (FRP>50MW)</div>
                        </div>
                        <div class="ei-kpi">
                            <div class="ei-kpi-v" style="color:${C.muted}">${fires?.nightFires?.toLocaleString() ?? '—'}</div>
                            <div class="ei-kpi-l">Night Detections</div>
                        </div>
                    </div>
                    ${fires?.source?.includes('estimated') ? `
                    <div class="ei-infobox" style="--accent:${C.gold};--accentRgb:251,191,36">
                        ⚠️ Showing estimated values — server couldn't reach NASA FIRMS.
                        Make sure <code>proxyServer.js</code> is running and restart.
                    </div>` : ''}
                    <div style="margin-top:14px">
                        <div style="font-size:.72rem;color:${C.muted};text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;font-weight:600">Fire Detections by Region</div>
                        <div class="ei-bars">
                            ${regionEntries.map(([region, count]) =>
                                _bar(region, (count / regionMax) * 100, count.toLocaleString(), C.disaster)
                            ).join('')}
                        </div>
                    </div>
                    <div class="ei-source" style="margin-top:10px">VIIRS SNPP NRT · 375m resolution · 12h revisit · ${fires?.lastUpdated ? new Date(fires.lastUpdated).toLocaleTimeString() : '—'}</div>
                </div>

                <!-- EONET active events by category -->
                ${eonet ? `
                <div class="ei-card" style="--accent:${C.orange};--accentRgb:251,146,60">
                    <div class="ei-card-head">
                        <div class="ei-card-title">🌍 Active Natural Events
                            <span class="ei-card-badge">NASA EONET LIVE</span>
                        </div>
                    </div>
                    <div class="ei-kpi-row" style="flex-wrap:wrap">
                        <div class="ei-kpi">
                            <div class="ei-kpi-v" style="color:${C.orange}">${eonet.total}</div>
                            <div class="ei-kpi-l">Total Open Events</div>
                        </div>
                        <div class="ei-kpi">
                            <div class="ei-kpi-v" style="color:${C.disaster}">${eonet.byCategory?.['Wildfires'] ?? 0}</div>
                            <div class="ei-kpi-l">🔥 Wildfires</div>
                        </div>
                        <div class="ei-kpi">
                            <div class="ei-kpi-v" style="color:#38bdf8">${eonet.byCategory?.['Severe Storms'] ?? 0}</div>
                            <div class="ei-kpi-l">🌪️ Storms</div>
                        </div>
                        <div class="ei-kpi">
                            <div class="ei-kpi-v" style="color:${C.orange}">${eonet.byCategory?.['Volcanoes'] ?? 0}</div>
                            <div class="ei-kpi-l">🌋 Volcanoes</div>
                        </div>
                    </div>
                    <div style="margin-top:4px">
                        ${Object.entries(eonet.byCategory ?? {})
                            .sort((a, b) => b[1] - a[1])
                            .map(([cat, count]) => `
                            <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid ${C.border}">
                                <span style="font-size:.8rem">${EONET_ICONS[cat] ?? '🌐'} ${cat}</span>
                                <span style="font-family:'JetBrains Mono',monospace;font-size:.78rem;color:${C.orange};font-weight:700">${count} active</span>
                            </div>`).join('')}
                    </div>
                    <div class="ei-source" style="margin-top:10px">NASA EONET v3 · Updated every 30 min</div>
                </div>` : ''}
            </div>

            <div>
                <!-- Recent EONET events list (real named events) -->
                ${eonet?.events?.length ? `
                <div class="ei-card" style="--accent:${C.orange};--accentRgb:251,146,60">
                    <div class="ei-card-head">
                        <div class="ei-card-title">📡 Recent Events Feed
                            <span class="ei-card-badge">LIVE</span>
                        </div>
                    </div>
                    ${eonet.events.slice(0, 10).map(ev => {
                        const icon  = EONET_ICONS[ev.category] ?? '🌐';
                        const catColor = ev.category === 'Wildfires' ? C.disaster
                            : ev.category === 'Severe Storms'  ? '#38bdf8'
                            : ev.category === 'Volcanoes'      ? C.orange
                            : ev.category === 'Floods'         ? '#06b6d4'
                            : C.muted;
                        const dt = ev.date ? new Date(ev.date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';
                        return `
                        <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid ${C.border}">
                            <div style="font-size:1.3rem;flex-shrink:0;margin-top:2px">${icon}</div>
                            <div style="flex:1;min-width:0">
                                <div style="font-size:.8rem;font-weight:600;margin-bottom:3px">${ev.title}</div>
                                <div style="display:flex;gap:8px;flex-wrap:wrap">
                                    <span style="font-size:.65rem;padding:2px 7px;border-radius:8px;background:${catColor}18;color:${catColor};border:1px solid ${catColor}30">${ev.category}</span>
                                    <span style="font-size:.65rem;color:${C.muted}">${dt}</span>
                                    ${ev.coords ? `<span style="font-size:.65rem;color:${C.dim};font-family:'JetBrains Mono',monospace">${ev.coords[0].toFixed(1)}°, ${ev.coords[1].toFixed(1)}°</span>` : ''}
                                </div>
                            </div>
                            <a href="${ev.link}" target="_blank" style="font-size:.65rem;color:${C.climate};text-decoration:none;flex-shrink:0;margin-top:2px">→ NASA</a>
                        </div>`;
                    }).join('')}
                    <div class="ei-source" style="margin-top:8px">Source: NASA EONET · Click → NASA for full event detail</div>
                </div>` : ''}

                <!-- Earthquake list -->
                <div class="ei-card" style="--accent:${C.disaster};--accentRgb:248,113,113">
                    <div class="ei-card-head">
                        <div class="ei-card-title">⚡ Significant Earthquakes
                            <span class="ei-card-badge">USGS 30-day</span>
                        </div>
                    </div>
                    <div class="ei-kpi-row" style="margin-bottom:12px">
                        <div class="ei-kpi">
                            <div class="ei-kpi-v" style="color:${C.orange}">${q?.total4_5?.toLocaleString() ?? '—'}</div>
                            <div class="ei-kpi-l">M4.5+ This Week</div>
                        </div>
                        <div class="ei-kpi">
                            <div class="ei-kpi-v" style="color:${C.disaster}">${q?.count ?? '—'}</div>
                            <div class="ei-kpi-l">Significant (30d)</div>
                        </div>
                    </div>
                    ${qList.map(eq => {
                        const m = parseFloat(eq.magnitude);
                        const qc = m >= 7 ? '248,113,113' : m >= 6 ? '251,146,60' : '251,191,36';
                        const qColor = m >= 7 ? C.disaster : m >= 6 ? C.orange : C.gold;
                        const dt = new Date(eq.time).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
                        const alertColor = eq.alert === 'red' ? C.disaster : eq.alert === 'orange' ? C.orange : eq.alert === 'yellow' ? C.gold : C.agri;
                        return `
                        <div class="ei-quake-row">
                            <div class="ei-quake-mag" style="--qc:${qc}">
                                <div class="ei-quake-mag-val" style="color:${qColor}">${parseFloat(m).toFixed(1)}</div>
                                <div class="ei-quake-mag-lbl">MAG</div>
                            </div>
                            <div class="ei-quake-info">
                                <div class="ei-quake-place">${eq.place}</div>
                                <div class="ei-quake-meta">Depth: ${eq.depth?.toFixed(0) ?? '?'}km · ${dt}${eq.tsunami ? ' · 🌊 Tsunami' : ''}</div>
                            </div>
                            ${eq.alert ? `<div class="ei-quake-alert" style="background:${alertColor}22;color:${alertColor};border:1px solid ${alertColor}44">${eq.alert.toUpperCase()}</div>` : ''}
                        </div>`;
                    }).join('')}
                    ${qList.length === 0 ? '<div class="ei-no-data">No significant earthquakes in the last 30 days</div>' : ''}
                    <div class="ei-source" style="margin-top:8px">USGS Earthquake Hazards Program · Real-time GeoJSON feed</div>
                </div>
            </div>
        </div>`;
    }

    // ════════════════════════════════════════════════════════════════════════
    //  AGRICULTURE TAB
    // ════════════════════════════════════════════════════════════════════════
    function _renderAgriculture(a) {
        if (!a || a.loading) return _paneLoad('Agriculture data loading…');

        const { regions = [], globalNDVI, avgSoilMoisture, droughtCount, precipForecast = [] } = a;

        // Guard against NaN — use fallback values if data isn't ready
        const safeNDVI  = (isNaN(globalNDVI)       || globalNDVI == null)  ? 0.55 : globalNDVI;
        const safeSoil  = (isNaN(avgSoilMoisture)   || avgSoilMoisture == null) ? 0.25 : avgSoilMoisture;
        const ndviPct   = Math.min(100, Math.max(0, Math.round(safeNDVI * 100)));
        const soilPct   = Math.min(100, Math.max(0, Math.round(safeSoil * 200)));  // 0.5 m³/m³ = 100%
        const precipTotal = precipForecast.reduce((s, p) => s + (isNaN(p.mm) ? 0 : p.mm), 0);

        // 7-day precip bar chart
        const precipMax = Math.max(...precipForecast.map(p => isNaN(p.mm) ? 0 : p.mm), 1);
        const precipBars = precipForecast.map(p => {
            const mm = isNaN(p.mm) ? 0 : p.mm;
            return `
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
                <div style="font-size:.62rem;color:${C.muted};font-family:'JetBrains Mono',monospace">${mm}</div>
                <div style="height:${Math.max(3, (mm / precipMax) * 70).toFixed(0)}px;width:100%;background:${C.climate};border-radius:3px 3px 0 0;opacity:.8;min-height:3px"></div>
                <div style="font-size:.65rem;color:${C.muted}">${p.day}</div>
            </div>`;
        }).join('');

        const hasRegions = regions.length > 0;

        return `
        <div>
            <!-- Global overview KPIs -->
            <div class="ei-kpi-row" style="--accent:${C.agri}">
                <div class="ei-kpi">
                    ${_ring(ndviPct, C.agri, 'NDVI', safeNDVI.toFixed(2))}
                </div>
                <div class="ei-kpi">
                    ${_ring(soilPct, '#38bdf8', 'SOIL', `${(safeSoil * 100).toFixed(0)}%`)}
                </div>
                <div class="ei-kpi">
                    <div class="ei-kpi-v" style="color:${droughtCount > 3 ? C.disaster : droughtCount > 1 ? C.gold : C.agri}">${droughtCount ?? 0}</div>
                    <div class="ei-kpi-l">Drought Risk Regions</div>
                </div>
                <div class="ei-kpi">
                    <div class="ei-kpi-v" style="color:${C.climate}">${precipTotal.toFixed(0)} mm</div>
                    <div class="ei-kpi-l">7-Day Global Precip</div>
                </div>
                <div class="ei-kpi">
                    <div class="ei-kpi-v" style="color:${C.muted}">${regions.filter(r => r.irrigation === 'Required').length}</div>
                    <div class="ei-kpi-l">Irrigation Required</div>
                </div>
            </div>

            ${!hasRegions ? `
            <div class="ei-card" style="border-color:rgba(251,191,36,.2)">
                <div style="text-align:center;padding:20px;color:${C.muted}">
                    <div style="font-size:1.5rem;margin-bottom:8px">⏳</div>
                    <div style="font-weight:600;margin-bottom:6px">Fetching regional data from Open-Meteo…</div>
                    <div style="font-size:.75rem">7 parallel API calls in progress. Refresh in a moment if this persists.</div>
                </div>
            </div>` : `
            <div class="ei-grid2">
                <!-- Region health table -->
                <div class="ei-card" style="--accent:${C.agri};--accentRgb:74,222,128">
                    <div class="ei-card-head">
                        <div class="ei-card-title">🌾 Regional Crop Health
                            <span class="ei-card-badge">Open-Meteo LIVE</span>
                        </div>
                    </div>
                    <table class="ei-region-table">
                        <thead>
                            <tr>
                                <th>Region</th>
                                <th>Crop</th>
                                <th>NDVI</th>
                                <th>Soil Moist.</th>
                                <th>Stress</th>
                                <th>Irrigation</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${regions.map(r => {
                                const sc = _stressColor(r.stressIndex);
                                const irrColor = r.irrigation === 'Required' ? C.disaster : r.irrigation === 'Advisory' ? C.gold : C.agri;
                                const ndviVal = isNaN(r.ndvi) ? '—' : r.ndvi;
                                const soilVal = isNaN(r.soilMoist) ? '—' : `${(r.soilMoist * 100).toFixed(0)}%`;
                                const ndviNum = isNaN(r.ndvi) ? 0.5 : r.ndvi;
                                return `
                                <tr>
                                    <td style="font-weight:600">${r.name}</td>
                                    <td style="color:${C.muted};font-size:.7rem">${r.crop}</td>
                                    <td>
                                        <div style="display:flex;align-items:center;gap:6px">
                                            <div class="ei-ndvi-bar">
                                                <div class="ei-ndvi-indicator" style="left:${(ndviNum * 100).toFixed(0)}%"></div>
                                            </div>
                                            <span style="font-size:.72rem;font-family:'JetBrains Mono',monospace;color:${ndviNum > 0.6 ? C.agri : ndviNum > 0.35 ? C.gold : C.disaster}">${ndviVal}</span>
                                        </div>
                                    </td>
                                    <td style="font-family:'JetBrains Mono',monospace;font-size:.75rem;color:${C.climate}">${soilVal}</td>
                                    <td><span class="ei-stress-pill" style="background:${sc}22;color:${sc};border:1px solid ${sc}44">${r.stressLevel}</span></td>
                                    <td style="color:${irrColor};font-size:.72rem;font-weight:600">${r.irrigation}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                    <div class="ei-source" style="margin-top:10px">Soil moisture · ET₀ · VPD from Open-Meteo ERA5 reanalysis · Updated 2×/day</div>
                </div>

                <div>
                    <!-- 7-day precip forecast -->
                    <div class="ei-card" style="--accent:${C.climate};--accentRgb:56,189,248">
                        <div class="ei-card-head">
                            <div class="ei-card-title">🌧️ 7-Day Precipitation Outlook
                                <span class="ei-card-badge">Open-Meteo</span>
                            </div>
                        </div>
                        <div style="display:flex;align-items:flex-end;gap:4px;height:90px;margin-bottom:8px;padding:0 4px">
                            ${precipBars}
                        </div>
                        <div class="ei-source">North America representative · mm/day</div>
                    </div>

                    <!-- Regional water balance -->
                    <div class="ei-card" style="--accent:${C.agri};--accentRgb:74,222,128">
                        <div class="ei-card-head">
                            <div class="ei-card-title">💧 Water Balance by Region</div>
                        </div>
                        <div class="ei-bars">
                            ${regions.map(r => {
                                const wb = isNaN(r.waterBalance) ? 0 : r.waterBalance;
                                const wbColor = wb < -10 ? C.disaster : wb < 0 ? C.gold : C.agri;
                                const pct = Math.min(100, Math.max(0, 50 + wb * 2));
                                return _bar(r.name, pct, `${wb > 0 ? '+' : ''}${wb} mm`, wbColor);
                            }).join('')}
                        </div>
                        <div class="ei-infobox" style="--accent:${C.agri};--accentRgb:74,222,128">
                            Water balance = 7-day precipitation − evapotranspiration (ET₀).
                            Negative = deficit (irrigation needed). Positive = surplus.
                        </div>
                    </div>
                </div>
            </div>`}

            <!-- API source note -->
            <div class="ei-card" style="border-color:rgba(74,222,128,.15);background:rgba(74,222,128,.03);margin-top:16px">
                <div style="font-size:.78rem;color:${C.muted};line-height:1.8">
                    <strong style="color:${C.agri}">📡 Agriculture Data Sources (all free)</strong><br>
                    <strong>Soil moisture & ET₀:</strong> Open-Meteo — ERA5/ECMWF reanalysis, no key needed<br>
                    <strong>VPD (crop heat stress):</strong> Open-Meteo <code>vapor_pressure_deficit_max</code> daily variable<br>
                    <strong>For true NDVI:</strong> Sign up at <em>agromonitoring.com</em> (free tier) or use <em>NASA AppEEARS</em><br>
                    <strong>For crop disease risk:</strong> <em>appsforagri.com</em> — AgroWeather API
                </div>
            </div>
        </div>`;
    }

    // ════════════════════════════════════════════════════════════════════════
    //  ENVIRONMENT TAB
    // ════════════════════════════════════════════════════════════════════════
    function _renderEnvironment(e) {
        if (!e || e.loading) return _paneLoad('Environment data loading…');
        const { airQuality: aq, spaceWeather: sw, deforestation: def } = e;

        const cities = aq?.cities ?? [];
        const pm25Max = Math.max(...cities.map(c => c.pm25), 1);

        return `
        <div class="ei-grid2">
            <div>
                <!-- Air Quality -->
                <div class="ei-card" style="--accent:${C.env};--accentRgb:167,139,250">
                    <div class="ei-card-head">
                        <div class="ei-card-title">🌫️ Global Air Quality Index
                            <span class="ei-card-badge">Open-Meteo AQ</span>
                        </div>
                    </div>
                    <div class="ei-kpi-row">
                        <div class="ei-kpi">
                            <div class="ei-kpi-v" style="color:${C.env}">${aq?.avgPM25 ?? '—'} µg/m³</div>
                            <div class="ei-kpi-l">Avg PM2.5</div>
                        </div>
                        <div class="ei-kpi">
                            <div class="ei-kpi-v" style="color:${C.disaster}">${aq?.worstCity ?? '—'}</div>
                            <div class="ei-kpi-l">Most Polluted</div>
                        </div>
                        <div class="ei-kpi">
                            <div class="ei-kpi-v" style="color:${C.gold}">${aq?.uvIndex ?? '—'}</div>
                            <div class="ei-kpi-l">UV Index (equator)</div>
                        </div>
                    </div>
                    ${cities.map(c => {
                        const color = _aqiColor(c.aqi);
                        const pct   = (c.pm25 / pm25Max) * 100;
                        return `
                        <div class="ei-city-row" style="--aqi-c:${color}">
                            <div class="ei-city-name">${c.city}</div>
                            <div class="ei-city-pm" style="--aqi-c:${color}">${c.pm25} µg/m³</div>
                            <div class="ei-city-track"><div class="ei-city-fill" style="width:${pct.toFixed(0)}%;--aqi-c:${color}"></div></div>
                            <div class="ei-aqi-badge" style="background:${color}18;color:${color};border:1px solid ${color}30">${c.aqiLabel}</div>
                        </div>`;
                    }).join('')}
                    <div class="ei-infobox" style="--accent:${C.env};--accentRgb:167,139,250;margin-top:12px">
                        WHO guideline: PM2.5 &lt; 5 µg/m³ annual average. Values above 35 µg/m³ are considered unhealthy for all groups.
                    </div>
                    <div class="ei-source" style="margin-top:8px">Source: ${aq?.source ?? 'Open-Meteo'} · WHO thresholds</div>
                </div>

                <!-- Space Weather -->
                <div class="ei-card" style="--accent:#f59e0b;--accentRgb:245,158,11">
                    <div class="ei-card-head">
                        <div class="ei-card-title">☀️ Space Weather
                            <span class="ei-card-badge">NOAA SWPC</span>
                        </div>
                    </div>
                    <div class="ei-grid3">
                        <div class="ei-metric">
                            <div class="ei-metric-val" style="color:${sw?.kp > 5 ? C.disaster : sw?.kp > 3 ? C.gold : C.agri}">${sw?.kp ?? '—'}</div>
                            <div class="ei-metric-label">Kp Index</div>
                            <div class="ei-metric-sub">Geomagnetic</div>
                        </div>
                        <div class="ei-metric">
                            <div class="ei-metric-val" style="color:${C.orange}">${sw?.solarWindSpeed ?? '—'}</div>
                            <div class="ei-metric-label">Solar Wind</div>
                            <div class="ei-metric-sub">km/s</div>
                        </div>
                        <div class="ei-metric">
                            <div class="ei-metric-val" style="color:${sw?.kp > 5 ? C.disaster : C.agri}">${sw?.auroraLevel ?? '—'}</div>
                            <div class="ei-metric-label">Aurora Level</div>
                            <div class="ei-metric-sub">${sw?.kp > 5 ? 'Visible at low latitudes' : sw?.kp > 3 ? 'Visible 50°+ lat' : 'Polar regions only'}</div>
                        </div>
                    </div>
                    ${_bar('Geomagnetic Activity', sw ? Math.min(100, (sw.kp / 9) * 100) : 25, `Kp ${sw?.kp ?? '?'}`, sw?.kp > 5 ? C.disaster : C.gold)}
                    ${_bar('Solar Wind Speed', sw ? Math.min(100, (sw.solarWindSpeed / 800) * 100) : 50, `${sw?.solarWindSpeed ?? '?'} km/s`, C.orange)}
                    <div class="ei-source" style="margin-top:10px">Source: ${sw?.source ?? 'NOAA SWPC'}</div>
                </div>
            </div>

            <div>
                <!-- Deforestation -->
                <div class="ei-card" style="--accent:${C.agri};--accentRgb:74,222,128">
                    <div class="ei-card-head">
                        <div class="ei-card-title">🌳 Forest Loss Tracker
                            <span class="ei-card-badge">NASA FIRMS</span>
                        </div>
                    </div>
                    <div class="ei-grid2">
                        <div class="ei-metric">
                            <div class="ei-metric-val" style="color:${C.disaster}">${def?.dailyHa?.toLocaleString() ?? '—'}</div>
                            <div class="ei-metric-label">Hectares/Day</div>
                            <div class="ei-metric-sub">Estimated loss</div>
                        </div>
                        <div class="ei-metric">
                            <div class="ei-metric-val" style="color:${C.orange}">${def?.annualRateM ?? '—'}M</div>
                            <div class="ei-metric-label">Hectares/Year</div>
                            <div class="ei-metric-sub">Annual rate</div>
                        </div>
                        <div class="ei-metric">
                            <div class="ei-metric-val" style="color:${C.agri}">${def?.primaryForest ?? '58'}%</div>
                            <div class="ei-metric-label">Primary Forest</div>
                            <div class="ei-metric-sub">Remaining globally</div>
                        </div>
                        <div class="ei-metric">
                            <div class="ei-metric-val" style="color:${C.disaster}">${def?.trend ?? 'Rising'}</div>
                            <div class="ei-metric-label">Trend</div>
                            <div class="ei-metric-sub">vs prior decade</div>
                        </div>
                    </div>
                    <div class="ei-infobox" style="--accent:${C.agri};--accentRgb:74,222,128;margin-top:12px">
                        🌳 Deforestation estimate derived from NASA FIRMS fire pixel data.
                        For precise deforestation alerts, integrate <em>Global Forest Watch API</em> (free) — provides Hansen/UMD 30m-resolution annual loss data.
                    </div>
                </div>

                <!-- Environment health summary -->
                <div class="ei-card" style="--accent:${C.env};--accentRgb:167,139,250">
                    <div class="ei-card-head">
                        <div class="ei-card-title">🌐 Planetary Health Scores</div>
                    </div>
                    ${_bar('Air Quality (global)', aq ? Math.max(0, 100 - (aq.avgPM25 / 0.7)) : 50, `PM2.5: ${aq?.avgPM25 ?? '?'} µg/m³`, _aqiColor(aq ? (aq.avgPM25 > 50 ? 5 : aq.avgPM25 > 25 ? 4 : aq.avgPM25 > 15 ? 3 : 2) : 3))}
                    ${_bar('Forest Cover Remaining', def?.primaryForest ?? 58, `${def?.primaryForest ?? '58'}% primary`, C.agri)}
                    ${_bar('Geomagnetic Calm', sw ? Math.max(0, 100 - (sw.kp / 9) * 100) : 75, `Kp: ${sw?.kp ?? '?'}`, sw?.kp > 5 ? C.disaster : C.agri)}
                    ${_bar('Ocean UV Exposure', 60, `Index: ${aq?.uvIndex ?? '?'}`, C.gold)}
                </div>

                <!-- Data sources reference -->
                <div class="ei-card" style="border-color:rgba(167,139,250,.15);background:rgba(167,139,250,.03)">
                    <div style="font-size:.78rem;color:${C.muted};line-height:1.8">
                        <strong style="color:${C.env}">📡 Recommended Environment APIs (all free tiers)</strong><br>
                        <strong>Air Quality:</strong> Open-Meteo AQ · OpenWeatherMap (key needed) · IQAir<br>
                        <strong>Deforestation:</strong> Global Forest Watch API · Hansen/UMD Tree Cover Loss<br>
                        <strong>UV Index:</strong> Open-Meteo · NASA OMI/TROPOMI<br>
                        <strong>Ocean Temp:</strong> NOAA CoralWatch · Copernicus Marine Service<br>
                        <strong>Space Weather:</strong> NOAA SWPC (free, no key) · SpaceWeatherLive
                    </div>
                </div>
            </div>
        </div>`;
    }

    // ── Loading pane ──────────────────────────────────────────────────────────
    function _paneLoad(msg) {
        return `<div class="ei-loading"><div class="ei-spinner"></div><div class="ei-loading-text">${msg}</div></div>`;
    }

    function _renderLoading() {
        return `
        <div class="ei-shell">
            <div class="ei-loading">
                <div class="ei-spinner"></div>
                <div class="ei-loading-text">Connecting to Earth observation networks…</div>
                <div class="ei-loading-steps">NASA · NOAA · USGS · Open-Meteo · NSIDC</div>
            </div>
        </div>`;
    }

    // ── Tab wiring ────────────────────────────────────────────────────────────
    function _attachTabListeners(containerId) {
        const wrap = document.getElementById(containerId);
        if (!wrap) return;
        wrap.querySelectorAll('.ei-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                wrap.querySelectorAll('.ei-tab-btn').forEach(b => b.classList.remove('active'));
                wrap.querySelectorAll('.ei-tab-pane').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const pane = document.getElementById(`pane-${btn.dataset.tab}`);
                if (pane) pane.classList.add('active');
            });
        });
    }

    // Public
    return { render };
})();

if (typeof window !== 'undefined') {
    window.EarthImpactUI = EarthImpactUI;
    console.log('✅ EarthImpactUI v2 loaded');
}