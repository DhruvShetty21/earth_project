// components/DynamicEarthImpactUI.js
// Dynamic UI with real-time animations and live data visualization

const DynamicEarthImpactUI = (() => {
    
    function render(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="dynamic-impact-dashboard">
                ${renderHeader()}
                ${renderLiveStats()}
                ${renderDynamicTabs()}
            </div>
        `;
        
        // Initialize dynamic features
        setTimeout(() => {
            DynamicEarthImpact.init();
            attachEventListeners();
        }, 100);
    }
    
    function renderHeader() {
        return `
            <div class="dynamic-header">
                <div class="header-left">
                    <div class="logo-animated">
                        <div class="logo-globe">🌍</div>
                        <div class="logo-pulse"></div>
                    </div>
                    <div class="header-title">
                        <h1>Earth Impact Monitor</h1>
                        <p class="header-subtitle">Real-Time Global Monitoring System</p>
                    </div>
                </div>
                <div class="header-right">
                    <div class="live-status-badge">
                        <span class="live-dot"></span>
                        <span>LIVE</span>
                    </div>
                    <div class="last-update" id="last-update-time">Just now</div>
                    <button class="refresh-btn" onclick="DynamicEarthImpact.updateDataStream('all')">
                        <span class="refresh-icon">↻</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    function renderLiveStats() {
        return `
            <div class="live-stats-grid">
                <div class="stat-card fires-card">
                    <div class="stat-icon">🔥</div>
                    <div class="stat-content">
                        <div class="stat-label">Active Fires</div>
                        <div class="stat-value" id="fire-count">0</div>
                        <div class="stat-trend">
                            <span class="trend-indicator">↑</span>
                            <span id="fires-indicator">Loading...</span>
                        </div>
                    </div>
                    <div class="stat-sparkline">
                        <canvas id="fires-sparkline" width="100" height="30"></canvas>
                    </div>
                </div>
                
                <div class="stat-card quakes-card">
                    <div class="stat-icon">⚠️</div>
                    <div class="stat-content">
                        <div class="stat-label">Earthquakes (4.5+)</div>
                        <div class="stat-value" id="quake-count">0</div>
                        <div class="stat-trend">
                            <span class="trend-indicator">↑</span>
                            <span id="earthquakes-indicator">Loading...</span>
                        </div>
                    </div>
                    <div class="stat-sparkline">
                        <canvas id="quakes-sparkline" width="100" height="30"></canvas>
                    </div>
                </div>
                
                <div class="stat-card temp-card">
                    <div class="stat-icon">🌡️</div>
                    <div class="stat-content">
                        <div class="stat-label">Temp Anomaly</div>
                        <div class="stat-value" id="temp-value">+1.3°C</div>
                        <div class="stat-trend">
                            <span class="trend-indicator">↑</span>
                            <span id="climate-indicator">Updated 1h ago</span>
                        </div>
                    </div>
                    <div class="stat-sparkline">
                        <canvas id="temp-sparkline" width="100" height="30"></canvas>
                    </div>
                </div>
                
                <div class="stat-card air-card">
                    <div class="stat-icon">🌫️</div>
                    <div class="stat-content">
                        <div class="stat-label">Air Quality</div>
                        <div class="stat-value" id="air-value">Moderate</div>
                        <div class="stat-trend">
                            <span class="trend-indicator">→</span>
                            <span id="weather-indicator">Loading...</span>
                        </div>
                    </div>
                    <div class="stat-sparkline">
                        <canvas id="air-sparkline" width="100" height="30"></canvas>
                    </div>
                </div>
            </div>
        `;
    }
    
    function renderDynamicTabs() {
        return `
            <div class="dynamic-tabs">
                <div class="tab-nav">
                    <button class="tab-btn active" data-tab="fires">
                        <span class="tab-icon">🔥</span>
                        <span>Active Fires</span>
                        <span class="tab-badge" id="fires-badge">0</span>
                    </button>
                    <button class="tab-btn" data-tab="earthquakes">
                        <span class="tab-icon">⚠️</span>
                        <span>Earthquakes</span>
                        <span class="tab-badge" id="quakes-badge">0</span>
                    </button>
                    <button class="tab-btn" data-tab="climate">
                        <span class="tab-icon">🌡️</span>
                        <span>Climate</span>
                    </button>
                    <button class="tab-btn" data-tab="environment">
                        <span class="tab-icon">🌍</span>
                        <span>Environment</span>
                    </button>
                </div>
                
                <div class="tab-content">
                    <div class="tab-pane active" id="fires-pane">
                        ${renderFiresTab()}
                    </div>
                    <div class="tab-pane" id="earthquakes-pane">
                        ${renderEarthquakesTab()}
                    </div>
                    <div class="tab-pane" id="climate-pane">
                        ${renderClimateTab()}
                    </div>
                    <div class="tab-pane" id="environment-pane">
                        ${renderEnvironmentTab()}
                    </div>
                </div>
            </div>
        `;
    }
    
    function renderFiresTab() {
        return `
            <div class="fires-dashboard">
                <div class="dashboard-grid">
                    <div class="dashboard-card">
                        <div class="card-header">
                            <h3>Fire Intensity Distribution</h3>
                            <span class="live-indicator">●</span>
                        </div>
                        <div class="card-body">
                            <canvas id="fire-intensity-chart" width="400" height="200"></canvas>
                        </div>
                    </div>
                    
                    <div class="dashboard-card">
                        <div class="card-header">
                            <h3>Global Fire Map</h3>
                            <span class="live-indicator">●</span>
                        </div>
                        <div class="card-body">
                            <canvas id="fire-map-canvas" width="600" height="300"></canvas>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-card">
                    <div class="card-header">
                        <h3>Fire Hotspots by Region</h3>
                        <span class="update-time">Updated 30s ago</span>
                    </div>
                    <div class="card-body">
                        <div id="fires-live-container" class="fires-container"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    function renderEarthquakesTab() {
        return `
            <div class="quakes-dashboard">
                <div class="dashboard-grid">
                    <div class="dashboard-card">
                        <div class="card-header">
                            <h3>Magnitude Distribution</h3>
                            <span class="live-indicator">●</span>
                        </div>
                        <div class="card-body">
                            <canvas id="magnitude-chart" width="300" height="150"></canvas>
                        </div>
                    </div>
                    
                    <div class="dashboard-card">
                        <div class="card-header">
                            <h3>Recent Activity</h3>
                            <span class="live-indicator">●</span>
                        </div>
                        <div class="card-body">
                            <div id="quake-list-container" class="quake-list"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    function renderClimateTab() {
        return `
            <div class="climate-dashboard">
                <div class="dashboard-card">
                    <div class="card-header">
                        <h3>Global Temperature Trend</h3>
                        <span class="data-source">NASA GISTEMP</span>
                    </div>
                    <div class="card-body">
                        <canvas id="temp-trend-chart" width="800" height="300"></canvas>
                    </div>
                </div>
                
                <div class="dashboard-grid">
                    <div class="dashboard-card">
                        <div class="card-header">
                            <h3>CO₂ Levels</h3>
                        </div>
                        <div class="card-body">
                            <canvas id="co2-chart" width="400" height="200"></canvas>
                        </div>
                    </div>
                    
                    <div class="dashboard-card">
                        <div class="card-header">
                            <h3>Arctic Sea Ice</h3>
                        </div>
                        <div class="card-body">
                            <canvas id="ice-chart" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-card deforestation-card">
                    <div class="card-header">
                        <h3>🌳 Global Deforestation</h3>
                        <span class="live-indicator">●</span>
                    </div>
                    <div class="card-body">
                        <div class="deforestation-stats">
                            <div class="deforest-stat-item">
                                <div class="deforest-icon">🌲</div>
                                <div class="deforest-content">
                                    <div class="deforest-label">Forest Loss (2024)</div>
                                    <div class="deforest-value" id="forest-loss-value">Loading...</div>
                                    <div class="deforest-sub">Million hectares</div>
                                </div>
                            </div>
                            
                            <div class="deforest-stat-item">
                                <div class="deforest-icon">🔥</div>
                                <div class="deforest-content">
                                    <div class="deforest-label">Fire-Related Loss</div>
                                    <div class="deforest-value" id="fire-loss-value">Loading...</div>
                                    <div class="deforest-sub">Percentage of total</div>
                                </div>
                            </div>
                            
                            <div class="deforest-stat-item">
                                <div class="deforest-icon">🌍</div>
                                <div class="deforest-content">
                                    <div class="deforest-label">CO₂ Emissions</div>
                                    <div class="deforest-value" id="deforest-co2-value">Loading...</div>
                                    <div class="deforest-sub">Gigatons from deforestation</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="deforestation-map">
                            <h4>Hotspot Regions</h4>
                            <canvas id="deforestation-map-canvas" width="800" height="300"></canvas>
                        </div>
                        
                        <div class="deforestation-regions">
                            <h4>Top Affected Regions</h4>
                            <div id="deforestation-regions-list"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    function renderEnvironmentTab() {
        return `
            <div class="environment-dashboard">
                <div class="dashboard-grid">
                    <div class="dashboard-card">
                        <div class="card-header">
                            <h3>Air Quality Index</h3>
                            <span class="live-indicator">●</span>
                        </div>
                        <div class="card-body">
                            <div id="aqi-container"></div>
                        </div>
                    </div>
                    
                    <div class="dashboard-card">
                        <div class="card-header">
                            <h3>Space Weather</h3>
                            <span class="live-indicator">●</span>
                        </div>
                        <div class="card-body">
                            <div id="space-weather-container"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    function attachEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                switchTab(tab);
            });
        });
        
        // Auto-refresh toggle
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                refreshBtn.classList.add('spinning');
                setTimeout(() => refreshBtn.classList.remove('spinning'), 1000);
            });
        }
    }
    
    function switchTab(tabName) {
        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabName}-pane`);
        });
    }
    
    // Inject dynamic styles
    function injectStyles() {
        if (document.getElementById('dynamic-impact-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'dynamic-impact-styles';
        style.textContent = `
            .dynamic-impact-dashboard {
                min-height: 100vh;
                background: linear-gradient(135deg, #0a0f1e 0%, #050810 100%);
                padding: 20px;
                color: #e2e8f8;
                font-family: 'Outfit', -apple-system, sans-serif;
            }
            
            .dynamic-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                background: rgba(15, 22, 40, 0.8);
                border: 1px solid #1e2a45;
                border-radius: 16px;
                margin-bottom: 20px;
                backdrop-filter: blur(10px);
            }
            
            .header-left {
                display: flex;
                align-items: center;
                gap: 16px;
            }
            
            .logo-animated {
                position: relative;
                width: 50px;
                height: 50px;
            }
            
            .logo-globe {
                font-size: 32px;
                position: relative;
                z-index: 2;
                animation: rotate 20s linear infinite;
            }
            
            .logo-pulse {
                position: absolute;
                inset: -5px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(56,189,248,0.3), transparent);
                animation: pulse 2s ease-in-out infinite;
            }
            
            @keyframes rotate {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 0.5; }
                50% { transform: scale(1.2); opacity: 0.8; }
            }
            
            .header-title h1 {
                margin: 0;
                font-size: 1.5rem;
                font-weight: 800;
                background: linear-gradient(135deg, #38bdf8, #a78bfa);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            
            .header-subtitle {
                margin: 4px 0 0 0;
                font-size: 0.75rem;
                color: #6b7fa8;
                font-family: 'JetBrains Mono', monospace;
            }
            
            .header-right {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .live-status-badge {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                background: rgba(74,222,128,0.1);
                border: 1px solid rgba(74,222,128,0.3);
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 600;
                color: #4ade80;
            }
            
            .live-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #4ade80;
                animation: blink 1.5s infinite;
            }
            
            @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }
            
            .last-update {
                font-size: 0.75rem;
                color: #6b7fa8;
                font-family: 'JetBrains Mono', monospace;
            }
            
            .refresh-btn {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                background: rgba(56,189,248,0.1);
                border: 1px solid rgba(56,189,248,0.3);
                color: #38bdf8;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
            }
            
            .refresh-btn:hover {
                background: rgba(56,189,248,0.2);
                transform: rotate(90deg);
            }
            
            .refresh-btn.spinning {
                animation: spin 1s linear;
            }
            
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            .live-stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 16px;
                margin-bottom: 20px;
            }
            
            .stat-card {
                background: rgba(15, 22, 40, 0.8);
                border: 1px solid #1e2a45;
                border-radius: 12px;
                padding: 20px;
                display: flex;
                gap: 16px;
                align-items: center;
                transition: all 0.3s;
                position: relative;
                overflow: hidden;
            }
            
            .stat-card::before {
                content: '';
                position: absolute;
                inset: 0;
                background: linear-gradient(135deg, var(--card-color), transparent);
                opacity: 0.05;
            }
            
            .fires-card { --card-color: #f87171; }
            .quakes-card { --card-color: #fbbf24; }
            .temp-card { --card-color: #38bdf8; }
            .air-card { --card-color: #a78bfa; }
            
            .stat-card:hover {
                border-color: var(--card-color);
                transform: translateY(-2px);
                box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            }
            
            .stat-icon {
                font-size: 2.5rem;
                filter: drop-shadow(0 0 10px var(--card-color));
            }
            
            .stat-content {
                flex: 1;
            }
            
            .stat-label {
                font-size: 0.75rem;
                color: #6b7fa8;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 4px;
            }
            
            .stat-value {
                font-size: 2rem;
                font-weight: 800;
                color: var(--card-color);
                line-height: 1;
                margin-bottom: 4px;
            }
            
            .stat-trend {
                font-size: 0.7rem;
                color: #6b7fa8;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .trend-indicator {
                color: var(--card-color);
            }
            
            .stat-sparkline {
                width: 100px;
                height: 30px;
            }
            
            .dynamic-tabs {
                background: rgba(15, 22, 40, 0.8);
                border: 1px solid #1e2a45;
                border-radius: 16px;
                overflow: hidden;
            }
            
            .tab-nav {
                display: flex;
                background: rgba(5, 8, 16, 0.8);
                border-bottom: 1px solid #1e2a45;
            }
            
            .tab-btn {
                flex: 1;
                padding: 16px;
                background: transparent;
                border: none;
                color: #6b7fa8;
                cursor: pointer;
                transition: all 0.3s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-size: 0.9rem;
                font-weight: 600;
                position: relative;
            }
            
            .tab-btn::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: var(--tab-color, #38bdf8);
                opacity: 0;
                transition: opacity 0.3s;
            }
            
            .tab-btn.active {
                color: var(--tab-color, #38bdf8);
            }
            
            .tab-btn.active::after {
                opacity: 1;
            }
            
            .tab-badge {
                background: rgba(255,255,255,0.1);
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 0.7rem;
                font-family: 'JetBrains Mono', monospace;
            }
            
            .tab-content {
                padding: 24px;
            }
            
            .tab-pane {
                display: none;
                animation: fadeIn 0.3s;
            }
            
            .tab-pane.active {
                display: block;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .dashboard-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 16px;
                margin-bottom: 16px;
            }
            
            .dashboard-card {
                background: rgba(21, 29, 53, 0.6);
                border: 1px solid #1e2a45;
                border-radius: 12px;
                padding: 20px;
            }
            
            .card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }
            
            .card-header h3 {
                margin: 0;
                font-size: 1rem;
                font-weight: 700;
                color: #e2e8f8;
            }
            
            .live-indicator {
                color: #4ade80;
                font-size: 0.8rem;
                animation: blink 1.5s infinite;
            }
            
            .quake-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: rgba(30, 42, 69, 0.3);
                border-radius: 8px;
                margin-bottom: 8px;
                animation: slideIn 0.3s;
                position: relative;
            }
            
            @keyframes slideIn {
                from { opacity: 0; transform: translateX(-20px); }
                to { opacity: 1; transform: translateX(0); }
            }
            
            .quake-mag {
                width: 50px;
                height: 50px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            
            .quake-info {
                flex: 1;
            }
            
            .quake-place {
                font-size: 0.85rem;
                font-weight: 600;
                margin-bottom: 4px;
            }
            
            .quake-meta {
                font-size: 0.7rem;
                color: #6b7fa8;
            }
            
            .quake-pulse {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                animation: pulse 2s infinite;
            }
            
            .deforestation-card {
                margin-top: 16px;
            }
            
            .deforestation-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin-bottom: 24px;
            }
            
            .deforest-stat-item {
                background: rgba(30, 42, 69, 0.4);
                border: 1px solid rgba(74, 222, 128, 0.2);
                border-radius: 12px;
                padding: 16px;
                display: flex;
                align-items: center;
                gap: 12px;
                transition: all 0.3s;
            }
            
            .deforest-stat-item:hover {
                border-color: rgba(74, 222, 128, 0.4);
                transform: translateY(-2px);
            }
            
            .deforest-icon {
                font-size: 2rem;
                filter: drop-shadow(0 0 8px rgba(74, 222, 128, 0.3));
            }
            
            .deforest-content {
                flex: 1;
            }
            
            .deforest-label {
                font-size: 0.75rem;
                color: #6b7fa8;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin-bottom: 4px;
            }
            
            .deforest-value {
                font-size: 1.8rem;
                font-weight: 800;
                color: #4ade80;
                line-height: 1;
                margin-bottom: 4px;
            }
            
            .deforest-sub {
                font-size: 0.7rem;
                color: #6b7fa8;
            }
            
            .deforestation-map {
                margin-bottom: 24px;
            }
            
            .deforestation-map h4,
            .deforestation-regions h4 {
                font-size: 0.9rem;
                color: #e2e8f8;
                margin: 0 0 12px 0;
                font-weight: 600;
            }
            
            .deforestation-regions-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .deforest-region-item {
                background: rgba(30, 42, 69, 0.3);
                border-left: 3px solid #f87171;
                border-radius: 6px;
                padding: 12px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.3s;
            }
            
            .deforest-region-item:hover {
                background: rgba(30, 42, 69, 0.5);
                transform: translateX(4px);
            }
            
            .deforest-region-name {
                font-size: 0.85rem;
                font-weight: 600;
                color: #e2e8f8;
            }
            
            .deforest-region-loss {
                font-size: 0.9rem;
                font-weight: 700;
                color: #f87171;
            }
            
            .deforest-region-bar {
                height: 4px;
                background: rgba(248, 113, 113, 0.3);
                border-radius: 2px;
                margin-top: 6px;
                overflow: hidden;
            }
            
            .deforest-region-bar-fill {
                height: 100%;
                background: linear-gradient(90deg, #f87171, #fb923c);
                border-radius: 2px;
                transition: width 1s ease-out;
            }
            
            @media (max-width: 768px) {
                .live-stats-grid {
                    grid-template-columns: 1fr;
                }
                
                .dashboard-grid {
                    grid-template-columns: 1fr;
                }
                
                .tab-btn span:not(.tab-icon) {
                    display: none;
                }
                
                .deforestation-stats {
                    grid-template-columns: 1fr;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    // Initialize
    injectStyles();
    
    return {
        render
    };
})();

if (typeof window !== 'undefined') {
    window.DynamicEarthImpactUI = DynamicEarthImpactUI;
    console.log('✅ DynamicEarthImpactUI loaded');
}
