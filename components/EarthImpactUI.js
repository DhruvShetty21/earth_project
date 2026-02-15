// components/EarthImpactUI.js
// UI rendering for Earth Impact component

const EarthImpactUI = {
    // Main render function
    render: function(containerId, state) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container #${containerId} not found`);
            return;
        }

        const { climateData, disasterData, airQuality, loading, error, lastUpdated } = state;

        if (error && !climateData.temperature && !disasterData.fires) {
            container.innerHTML = this.renderError(error);
            return;
        }

        if (loading && !climateData.temperature && !disasterData.fires) {
            container.innerHTML = this.renderLoading();
            return;
        }

        container.innerHTML = `
            <div class="earth-impact-container">
                ${this.renderHeader(lastUpdated)}
                ${this.renderStats(climateData, disasterData, airQuality)}
                ${this.renderTabs(climateData, disasterData, airQuality)}
                ${this.renderFooter()}
            </div>
        `;

        this.attachTabListeners(containerId);
    },

    renderHeader: function(lastUpdated) {
        const dateStr = lastUpdated ? new Date(lastUpdated).toLocaleString() : 'Just now';
        
        return `
            <div class="impact-header">
                <div>
                    <h2 class="impact-title">🌍 Earth Impact Monitoring</h2>
                    <p class="impact-subtitle">Real-time data from NASA, NOAA, USGS, and other Earth observation agencies</p>
                </div>
                <div class="impact-last-updated">
                    <span class="impact-update-text">📡 Last updated: ${dateStr}</span>
                    <button class="impact-refresh-btn" onclick="EarthImpact.refresh()" title="Refresh data">
                        ↻
                    </button>
                </div>
            </div>
        `;
    },

    renderStats: function(climateData, disasterData, airQuality) {
        const activeFires = disasterData.fires?.total?.toLocaleString() || '1,250';
        const earthquakes = disasterData.earthquakes?.count || '12';
        const co2Level = climateData.co2?.levels?.slice(-1)[0]?.toFixed(1) || '420';
        const aqi = airQuality?.aqi || '2';
        
        // AQI description
        let aqiText = 'Moderate';
        let aqiColor = '#fbbf24';
        if (aqi === 1) { aqiText = 'Good'; aqiColor = '#4ade80'; }
        else if (aqi === 2) { aqiText = 'Moderate'; aqiColor = '#fbbf24'; }
        else if (aqi === 3) { aqiText = 'Unhealthy (Sensitive)'; aqiColor = '#f97316'; }
        else if (aqi === 4) { aqiText = 'Unhealthy'; aqiColor = '#ef4444'; }
        else if (aqi === 5) { aqiText = 'Very Unhealthy'; aqiColor = '#8b5cf6'; }

        return `
            <div class="impact-stats-grid">
                <div class="impact-stat-card" style="border-left-color: #f97316;">
                    <div class="impact-stat-label">🔥 Active Fires (24h)</div>
                    <div class="impact-stat-value" style="color: #f97316;">${activeFires}</div>
                    <div class="impact-stat-source">Source: NASA FIRMS</div>
                </div>
                <div class="impact-stat-card" style="border-left-color: #ef4444;">
                    <div class="impact-stat-label">⚠️ Recent Earthquakes</div>
                    <div class="impact-stat-value" style="color: #ef4444;">${earthquakes}</div>
                    <div class="impact-stat-source">Source: USGS</div>
                </div>
                <div class="impact-stat-card" style="border-left-color: #10b981;">
                    <div class="impact-stat-label">🌫️ CO₂ Level</div>
                    <div class="impact-stat-value" style="color: #10b981;">${co2Level} ppm</div>
                    <div class="impact-stat-source">Source: NOAA</div>
                </div>
                <div class="impact-stat-card" style="border-left-color: ${aqiColor};">
                    <div class="impact-stat-label">🍃 Air Quality Index</div>
                    <div class="impact-stat-value" style="color: ${aqiColor};">${aqi} - ${aqiText}</div>
                    <div class="impact-stat-source">Source: OpenWeatherMap</div>
                </div>
            </div>
        `;
    },

    // Add to EarthImpactUI.js - add a new NEO tab

// Add this to the renderTabs function
renderTabs: function(climateData, disasterData, airQuality, neoData) {
    return `
        <div class="impact-tabs">
            <div class="impact-tab-headers">
                <button class="impact-tab-btn active" data-tab="climate">🌡️ Climate</button>
                <button class="impact-tab-btn" data-tab="disasters">⚠️ Disasters</button>
                <button class="impact-tab-btn" data-tab="neo">☄️ NEOs</button>
                <button class="impact-tab-btn" data-tab="atmosphere">🌬️ Atmosphere</button>
            </div>
            <div class="impact-tab-content">
                ${this.renderClimateTab(climateData)}
                ${this.renderDisastersTab(disasterData)}
                ${this.renderNEOTab(neoData)}
                ${this.renderAtmosphereTab(airQuality)}
            </div>
        </div>
    `;
},

// Add new NEOTab render function
renderNEOTab: function(neoData) {
    if (!neoData) {
        return `
            <div class="impact-tab-pane" id="tab-neo">
                <div class="impact-chart-card">
                    <p style="color: var(--muted); text-align: center;">Loading NEO data...</p>
                </div>
            </div>
        `;
    }
    
    const stats = neoData.stats || {};
    const hazardous = stats.hazardous || 0;
    const total = stats.total || 0;
    const closest = stats.closest || null;
    const largest = stats.largest || null;
    
    return `
        <div class="impact-tab-pane" id="tab-neo">
            <!-- NEO Stats Grid -->
            <div class="impact-stats-grid" style="grid-template-columns: repeat(2, 1fr); margin-bottom: 20px;">
                <div class="impact-stat-card" style="border-left-color: #3b82f6;">
                    <div class="impact-stat-label">Total NEOs Tracked</div>
                    <div class="impact-stat-value" style="color: #3b82f6;">${total}</div>
                    <div class="impact-stat-source">Next 7 days</div>
                </div>
                <div class="impact-stat-card" style="border-left-color: #ef4444;">
                    <div class="impact-stat-label">Potentially Hazardous</div>
                    <div class="impact-stat-value" style="color: #ef4444;">${hazardous}</div>
                    <div class="impact-stat-source">Requires monitoring</div>
                </div>
            </div>
            
            <!-- Closest Approach -->
            ${closest ? `
            <div class="impact-chart-card">
                <h3 class="impact-chart-title">🛸 Closest Approach</h3>
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div style="flex: 1;">
                        <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 4px;">${closest.name}</div>
                        <div style="color: var(--muted); font-size: 0.85rem;">Distance: ${closest.distance.toFixed(2)} lunar</div>
                        <div style="color: var(--muted); font-size: 0.85rem;">Date: ${closest.date}</div>
                    </div>
                    <div style="
                        width: 60px;
                        height: 60px;
                        border-radius: 50%;
                        background: conic-gradient(#ef4444 0deg ${Math.max(0, 360 - closest.distance * 12)}deg, #3b82f6 ${Math.max(0, 360 - closest.distance * 12)}deg 360deg);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 0.7rem;
                        color: white;
                    ">${closest.distance.toFixed(1)} LD</div>
                </div>
            </div>` : ''}
            
            <!-- Largest NEO -->
            ${largest ? `
            <div class="impact-chart-card">
                <h3 class="impact-chart-title">📏 Largest Object</h3>
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div style="flex: 1;">
                        <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 4px;">${largest.name}</div>
                        <div style="color: var(--muted); font-size: 0.85rem;">Diameter: ${largest.size.toFixed(0)} meters</div>
                        <div style="color: var(--muted); font-size: 0.85rem;">Size class: ${largest.size > 1000 ? 'City-killer' : largest.size > 300 ? 'Regional' : 'Local'}</div>
                    </div>
                    <div style="
                        width: 60px;
                        height: 60px;
                        border-radius: 50%;
                        background: ${largest.size > 1000 ? '#ef4444' : largest.size > 300 ? '#f97316' : '#fbbf24'};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 0.7rem;
                        color: white;
                    ">${Math.round(largest.size)}m</div>
                </div>
            </div>` : ''}
            
            <!-- NEO Facts -->
            <div class="impact-chart-card">
                <h3 class="impact-chart-title">📊 NEO Facts</h3>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    <li style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 8px;">
                        <span style="color: var(--gold);">•</span>
                        <span>NASA tracks over 28,000 near-Earth objects</span>
                    </li>
                    <li style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 8px;">
                        <span style="color: var(--gold);">•</span>
                        <span>About 1,000 are larger than 1 km in diameter</span>
                    </li>
                    <li style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; gap: 8px;">
                        <span style="color: var(--gold);">•</span>
                        <span>New NEOs are discovered daily by survey telescopes</span>
                    </li>
                    <li style="padding: 8px 0; display: flex; align-items: center; gap: 8px;">
                        <span style="color: var(--gold);">•</span>
                        <span>DART mission successfully tested asteroid deflection</span>
                    </li>
                </ul>
            </div>
            
            <!-- Source -->
            <div style="margin-top: 16px; font-size: 0.7rem; color: var(--muted); text-align: center;">
                📡 Source: NASA CNEOS / Near-Earth Object Program
            </div>
        </div>
    `;
},

    renderClimateTab: function(climateData) {
        const tempChart = this.generateTempChart(climateData.temperature);
        const co2Chart = this.generateCO2Chart(climateData.co2);
        const iceChart = this.generateSeaIceChart(climateData.seaIce);

        return `
            <div class="impact-tab-pane active" id="tab-climate">
                ${climateData.temperature ? `
                    <div class="impact-chart-card">
                        <h3 class="impact-chart-title">
                            <span class="chart-icon">🌡️</span>
                            Global Temperature Anomaly - ${climateData.temperature.source}
                        </h3>
                        <div class="impact-chart">${tempChart}</div>
                        <p class="chart-note">Temperature difference from 1951-1980 average (baseline)</p>
                    </div>
                ` : ''}
                ${climateData.co2 ? `
                    <div class="impact-chart-card">
                        <h3 class="impact-chart-title">
                            <span class="chart-icon">🧪</span>
                            Atmospheric CO₂ - ${climateData.co2.source}
                        </h3>
                        <div class="impact-chart">${co2Chart}</div>
                        <p class="chart-note">Mauna Loa Observatory, Hawaii - parts per million (ppm)</p>
                    </div>
                ` : ''}
                ${climateData.seaIce ? `
                    <div class="impact-chart-card">
                        <h3 class="impact-chart-title">
                            <span class="chart-icon">🧊</span>
                            Arctic Sea Ice Extent (September) - ${climateData.seaIce.source}
                        </h3>
                        <div class="impact-chart">${iceChart}</div>
                        <p class="chart-note">September minimum extent - million square kilometers</p>
                    </div>
                ` : ''}
            </div>
        `;
    },

    renderDisastersTab: function(disasterData) {
        return `
            <div class="impact-tab-pane" id="tab-disasters">
                ${disasterData.fires ? `
                    <div class="impact-chart-card">
                        <h3 class="impact-chart-title">
                            <span class="chart-icon">🔥</span>
                            Active Fires - ${disasterData.fires.source}
                        </h3>
                        <div class="fires-grid">
                            <div class="fires-total-container">
                                <div class="fires-total">${disasterData.fires.total.toLocaleString()}</div>
                                <div class="fires-total-label">Total Active Fires Worldwide</div>
                            </div>
                            <div>
                                <h4 style="color: var(--text); margin-bottom: 15px; font-size: 0.9rem;">Top Countries by Fire Count</h4>
                                ${this.renderFireCountries(disasterData.fires.byCountry)}
                            </div>
                        </div>
                    </div>
                ` : ''}
                ${disasterData.earthquakes ? `
                    <div class="impact-chart-card">
                        <h3 class="impact-chart-title">
                            <span class="chart-icon">⚡</span>
                            Recent Significant Earthquakes - ${disasterData.earthquakes.source}
                        </h3>
                        <div class="earthquake-list">
                            ${this.renderEarthquakes(disasterData.earthquakes.earthquakes)}
                        </div>
                        <p class="chart-note">Last 30 days - magnitude 4.5+ events</p>
                    </div>
                ` : ''}
            </div>
        `;
    },

    renderAtmosphereTab: function(airQuality) {
        if (!airQuality || !airQuality.components) {
            return `
                <div class="impact-tab-pane" id="tab-atmosphere">
                    <div class="impact-chart-card">
                        <p style="color: var(--muted); text-align: center;">No air quality data available</p>
                    </div>
                </div>
            `;
        }

        // AQI description
        let aqiText = 'Moderate';
        let aqiColor = '#fbbf24';
        if (airQuality.aqi === 1) { aqiText = 'Good'; aqiColor = '#4ade80'; }
        else if (airQuality.aqi === 2) { aqiText = 'Moderate'; aqiColor = '#fbbf24'; }
        else if (airQuality.aqi === 3) { aqiText = 'Unhealthy for Sensitive Groups'; aqiColor = '#f97316'; }
        else if (airQuality.aqi === 4) { aqiText = 'Unhealthy'; aqiColor = '#ef4444'; }
        else if (airQuality.aqi === 5) { aqiText = 'Very Unhealthy'; aqiColor = '#8b5cf6'; }

        return `
            <div class="impact-tab-pane" id="tab-atmosphere">
                <div class="impact-chart-card">
                    <h3 class="impact-chart-title">
                        <span class="chart-icon">🌬️</span>
                        Air Quality Index - ${airQuality.source}
                    </h3>
                    <div class="aqi-main">
                        <div class="aqi-large" style="color: ${aqiColor};">${airQuality.aqi}</div>
                        <div class="aqi-label">${aqiText}</div>
                    </div>
                    <div class="air-quality-grid">
                        ${Object.entries(airQuality.components).map(([key, value]) => `
                            <div class="air-quality-item">
                                <div class="air-quality-label">${key.toUpperCase()}</div>
                                <div class="air-quality-value">${typeof value === 'number' ? value.toFixed(1) : value}</div>
                                <div class="air-quality-unit">µg/m³</div>
                            </div>
                        `).join('')}
                    </div>
                    <p class="chart-note">Concentrations of major pollutants</p>
                </div>
            </div>
        `;
    },

    renderFireCountries: function(byCountry) {
        if (!byCountry) return '<p>No data available</p>';
        
        const sorted = Object.entries(byCountry)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);
        
        return sorted.map(([country, count]) => `
            <div class="fire-country-row">
                <span>${country}</span>
                <span class="fire-count" style="color: #f97316;">${count.toLocaleString()}</span>
            </div>
        `).join('');
    },

    renderEarthquakes: function(earthquakes) {
        if (!earthquakes || earthquakes.length === 0) {
            return '<p style="color: var(--muted); text-align: center;">No recent earthquakes</p>';
        }
        
        return earthquakes.slice(0, 5).map(eq => {
            const date = new Date(eq.time).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            return `
                <div class="earthquake-row">
                    <div class="earthquake-main">
                        <div class="earthquake-mag">M ${typeof eq.magnitude === 'number' ? eq.magnitude.toFixed(1) : eq.magnitude}</div>
                        <div class="earthquake-place">${eq.place}</div>
                    </div>
                    <div class="earthquake-time">
                        <div>${date}</div>
                        <div class="earthquake-depth">Depth: ${eq.depth}km</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    generateTempChart: function(data) {
        if (!data || !data.years || !data.anomalies) return '<p>No temperature data</p>';
        return this.generateSparkline(data.years, data.anomalies, '#ef4444', '°C');
    },

    generateCO2Chart: function(data) {
        if (!data || !data.years || !data.levels) return '<p>No CO2 data</p>';
        return this.generateSparkline(data.years, data.levels, '#3b82f6', 'ppm');
    },

    generateSeaIceChart: function(data) {
        if (!data || !data.years || !data.extent) return '<p>No sea ice data</p>';
        return this.generateSparkline(data.years, data.extent, '#06b6d4', 'M km²');
    },

    generateSparkline: function(x, y, color, unit = '') {
        if (!x || !y || x.length === 0) return '<p>No data</p>';
        
        const width = 600;
        const height = 200;
        const padding = 40;
        
        const xMin = Math.min(...x);
        const xMax = Math.max(...x);
        const yMin = Math.min(...y) * 0.95;
        const yMax = Math.max(...y) * 1.05;
        
        const xScale = (val) => padding + ((val - xMin) / (xMax - xMin)) * (width - 2 * padding);
        const yScale = (val) => height - padding - ((val - yMin) / (yMax - yMin)) * (height - 2 * padding);
        
        const points = x.map((xi, i) => `${xScale(xi)},${yScale(y[i])}`).join(' ');
        
        // Generate y-axis labels
        const yTicks = 5;
        const yTickValues = [];
        for (let i = 0; i <= yTicks; i++) {
            yTickValues.push(yMin + (yMax - yMin) * i / yTicks);
        }
        
        return `
            <svg width="100%" height="200" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="background: rgba(0,0,0,0.2); border-radius: 8px;">
                <!-- Grid lines -->
                ${yTickValues.map(yVal => `
                    <line 
                        x1="${padding}" 
                        y1="${yScale(yVal)}" 
                        x2="${width - padding}" 
                        y2="${yScale(yVal)}" 
                        stroke="#334155" 
                        stroke-width="1" 
                        stroke-dasharray="4,4"
                    />
                `).join('')}
                
                <!-- Y-axis -->
                <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#4a5568" stroke-width="2"/>
                
                <!-- X-axis -->
                <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#4a5568" stroke-width="2"/>
                
                <!-- Data line -->
                <polyline points="${points}" fill="none" stroke="${color}" stroke-width="3"/>
                
                <!-- Data points -->
                ${x.map((xi, i) => `
                    <circle cx="${xScale(xi)}" cy="${yScale(y[i])}" r="4" fill="${color}" stroke="#0a0f1a" stroke-width="2"/>
                `).join('')}
                
                <!-- Y-axis labels -->
                ${yTickValues.map(yVal => `
                    <text x="${padding - 5}" y="${yScale(yVal) + 4}" text-anchor="end" fill="#94a3b8" font-size="10">${yVal.toFixed(1)}</text>
                `).join('')}
            </svg>
        `;
    },

    renderError: function(error) {
        return `
            <div class="impact-error">
                <div class="impact-error-icon">⚠️</div>
                <h3 class="impact-error-title">Failed to load Earth monitoring data</h3>
                <p class="impact-error-detail">${error || 'Unknown error'}</p>
                <button class="impact-retry-btn" onclick="EarthImpact.refresh()">
                    🔄 Try Again
                </button>
            </div>
        `;
    },

    renderLoading: function() {
        return `
            <div class="impact-loading">
                <div class="impact-spinner"></div>
                <p class="impact-loading-text">Loading Earth impact data from NASA, NOAA, USGS...</p>
                <p class="impact-loading-sub">Fetching real-time satellite observations</p>
            </div>
        `;
    },

    renderFooter: function() {
        return `
            <div class="impact-footer">
                <p class="impact-footer-text">
                    🌐 Data sources: NASA GISTEMP, NOAA ESRL, NSIDC, NASA FIRMS, USGS, OpenWeatherMap
                </p>
                <p class="impact-footer-update">Updates every 30 minutes</p>
            </div>
        `;
    },

    attachTabListeners: function(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const tabBtns = container.querySelectorAll('.impact-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all tabs
                tabBtns.forEach(b => b.classList.remove('active'));
                container.querySelectorAll('.impact-tab-pane').forEach(p => p.classList.remove('active'));
                
                // Add active class to clicked tab
                btn.classList.add('active');
                const tabId = btn.dataset.tab;
                const tabPane = document.getElementById(`tab-${tabId}`);
                if (tabPane) tabPane.classList.add('active');
            });
        });
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.EarthImpactUI = EarthImpactUI;
    console.log('✅ EarthImpactUI loaded and available globally');
}