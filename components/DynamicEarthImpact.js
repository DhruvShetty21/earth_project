// components/DynamicEarthImpact.js
// FULLY DYNAMIC Earth Impact Dashboard with real-time updates and animations

const DynamicEarthImpact = (() => {
    let updateInterval = null;
    let animationFrames = new Map();
    let liveCharts = new Map();
    
    // Real-time data streams
    const dataStreams = {
        fires: { interval: 30000, lastUpdate: 0 },      // 30 seconds
        earthquakes: { interval: 60000, lastUpdate: 0 }, // 1 minute
        weather: { interval: 300000, lastUpdate: 0 },    // 5 minutes
        climate: { interval: 3600000, lastUpdate: 0 },   // 1 hour
        deforestation: { interval: 3600000, lastUpdate: 0 }, // 1 hour
    };

    // Initialize dynamic dashboard
    function init() {
        console.log('[DynamicEarthImpact] Initializing dynamic dashboard');
        
        // Start real-time updates
        startRealTimeUpdates();
        
        // Initialize live charts
        initializeLiveCharts();
        
        // Start animations
        startAnimations();
        
        // Listen for visibility changes
        document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // Start real-time data updates
    function startRealTimeUpdates() {
        if (updateInterval) clearInterval(updateInterval);
        
        updateInterval = setInterval(async () => {
            const now = Date.now();
            
            // Check each data stream
            for (const [stream, config] of Object.entries(dataStreams)) {
                if (now - config.lastUpdate >= config.interval) {
                    await updateDataStream(stream);
                    config.lastUpdate = now;
                }
            }
            
            // Update UI indicators
            updateLiveIndicators();
        }, 1000); // Check every second
    }

    // Update specific data stream
    async function updateDataStream(stream) {
        console.log(`[DynamicEarthImpact] Updating ${stream} data`);
        
        try {
            switch (stream) {
                case 'fires':
                    await updateFiresData();
                    break;
                case 'earthquakes':
                    await updateEarthquakesData();
                    break;
                case 'weather':
                    await updateWeatherData();
                    break;
                case 'climate':
                    await updateClimateData();
                    break;
                case 'deforestation':
                    await updateDeforestationData();
                    break;
            }
        } catch (error) {
            console.error(`[DynamicEarthImpact] Failed to update ${stream}:`, error);
        }
    }

    // Update fires with animation
    async function updateFiresData() {
        const container = document.getElementById('fires-live-container');
        if (!container) return;
        
        try {
            const response = await fetch('/api/firms?source=VIIRS_SNPP_NRT&days=1');
            const text = await response.text();
            
            if (!text.includes('latitude')) return;
            
            const rows = text.split('\n').slice(1).filter(l => l.trim());
            const fires = rows.map(l => {
                const p = l.split(',');
                return {
                    lat: +p[0],
                    lng: +p[1],
                    brightness: +p[2],
                    frp: +p[12] || 0
                };
            }).filter(f => !isNaN(f.lat));
            
            // Animate fire count
            animateNumber('fire-count', fires.length, 1000);
            
            // Update fire intensity chart
            updateFireIntensityChart(fires);
            
            // Update fire map
            updateFireMap(fires);
            
        } catch (error) {
            console.error('[DynamicEarthImpact] Fire update failed:', error);
        }
    }

    // Update earthquakes with real-time feed
    async function updateEarthquakesData() {
        const container = document.getElementById('quakes-live-container');
        if (!container) return;
        
        try {
            const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson');
            const data = await response.json();
            
            const quakes = data.features.map(f => ({
                magnitude: f.properties.mag,
                place: f.properties.place,
                time: f.properties.time,
                coords: [f.geometry.coordinates[1], f.geometry.coordinates[0]],
                depth: f.geometry.coordinates[2]
            }));
            
            // Sort by time (most recent first)
            quakes.sort((a, b) => b.time - a.time);
            
            // Animate quake count
            animateNumber('quake-count', quakes.length, 1000);
            
            // Update quake list with fade-in animation
            updateQuakeList(quakes.slice(0, 10));
            
            // Update magnitude distribution
            updateMagnitudeChart(quakes);
            
        } catch (error) {
            console.error('[DynamicEarthImpact] Earthquake update failed:', error);
        }
    }

    // Update deforestation data
    async function updateDeforestationData() {
        try {
            // Simulate deforestation data (in production, this would come from NASA FIRMS or Global Forest Watch API)
            const deforestationData = {
                totalLoss: 10.2, // Million hectares
                fireLoss: 42, // Percentage
                co2Emissions: 4.8, // Gigatons
                regions: [
                    { name: 'Amazon Basin, Brazil', loss: 2.8, percentage: 27.5 },
                    { name: 'Congo Basin, DRC', loss: 1.9, percentage: 18.6 },
                    { name: 'Southeast Asia', loss: 1.5, percentage: 14.7 },
                    { name: 'Central Africa', loss: 1.2, percentage: 11.8 },
                    { name: 'Madagascar', loss: 0.9, percentage: 8.8 },
                    { name: 'Australia', loss: 0.7, percentage: 6.9 },
                    { name: 'North America', loss: 0.6, percentage: 5.9 },
                    { name: 'Central America', loss: 0.6, percentage: 5.8 }
                ]
            };
            
            // Animate values
            animateNumber('forest-loss-value', deforestationData.totalLoss, 1500);
            
            const fireLossEl = document.getElementById('fire-loss-value');
            if (fireLossEl) {
                fireLossEl.textContent = `${deforestationData.fireLoss}%`;
            }
            
            const co2El = document.getElementById('deforest-co2-value');
            if (co2El) {
                co2El.textContent = deforestationData.co2Emissions.toFixed(1);
            }
            
            // Update regions list
            updateDeforestationRegions(deforestationData.regions);
            
            // Update deforestation map
            updateDeforestationMap(deforestationData.regions);
            
        } catch (error) {
            console.error('[DynamicEarthImpact] Deforestation update failed:', error);
        }
    }
    
    // Update deforestation regions list
    function updateDeforestationRegions(regions) {
        const container = document.getElementById('deforestation-regions-list');
        if (!container) return;
        
        const html = regions.map((region, i) => `
            <div class="deforest-region-item" style="animation-delay: ${i * 50}ms">
                <div>
                    <div class="deforest-region-name">${region.name}</div>
                    <div class="deforest-region-bar">
                        <div class="deforest-region-bar-fill" style="width: ${region.percentage}%"></div>
                    </div>
                </div>
                <div class="deforest-region-loss">${region.loss}M ha</div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }
    
    // Update deforestation map visualization
    function updateDeforestationMap(regions) {
        const canvas = document.getElementById('deforestation-map-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear with dark background
        ctx.fillStyle = '#0a0f1e';
        ctx.fillRect(0, 0, width, height);
        
        // Draw world outline
        ctx.strokeStyle = '#1e2a45';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, height);
        
        // Hotspot locations (approximate coordinates)
        const hotspots = [
            { name: 'Amazon', lat: -3, lng: -62, intensity: 2.8 },
            { name: 'Congo', lat: -2, lng: 23, intensity: 1.9 },
            { name: 'SE Asia', lat: 2, lng: 110, intensity: 1.5 },
            { name: 'C Africa', lat: 5, lng: 20, intensity: 1.2 },
            { name: 'Madagascar', lat: -19, lng: 46, intensity: 0.9 },
            { name: 'Australia', lat: -25, lng: 135, intensity: 0.7 },
            { name: 'N America', lat: 50, lng: -110, intensity: 0.6 },
            { name: 'C America', lat: 15, lng: -85, intensity: 0.6 }
        ];
        
        // Draw hotspots
        hotspots.forEach(spot => {
            const x = ((spot.lng + 180) / 360) * width;
            const y = ((90 - spot.lat) / 180) * height;
            
            // Intensity-based size and color
            const maxIntensity = Math.max(...hotspots.map(h => h.intensity));
            const normalizedIntensity = spot.intensity / maxIntensity;
            const radius = 8 + (normalizedIntensity * 20);
            
            // Glow effect
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
            gradient.addColorStop(0, `rgba(248, 113, 113, ${normalizedIntensity * 0.8})`);
            gradient.addColorStop(0.5, `rgba(251, 146, 60, ${normalizedIntensity * 0.4})`);
            gradient.addColorStop(1, 'rgba(248, 113, 113, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Core dot
            ctx.fillStyle = '#f87171';
            ctx.beginPath();
            ctx.arc(x, y, radius / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Label
            ctx.fillStyle = '#e2e8f8';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(spot.name, x, y + radius * 2 + 12);
            ctx.fillText(`${spot.intensity}M ha`, x, y + radius * 2 + 24);
        });
    }

    // Animate number changes
    function animateNumber(elementId, targetValue, duration = 1000) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const startValue = parseFloat(element.textContent) || 0;
        const startTime = Date.now();
        const isDecimal = targetValue % 1 !== 0;
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = startValue + (targetValue - startValue) * eased;
            
            if (isDecimal) {
                element.textContent = current.toFixed(1);
            } else {
                element.textContent = Math.round(current).toLocaleString();
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    // Update fire intensity chart
    function updateFireIntensityChart(fires) {
        const canvas = document.getElementById('fire-intensity-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Group fires by intensity
        const bins = [0, 0, 0, 0, 0]; // Low, Moderate, High, Very High, Extreme
        fires.forEach(f => {
            if (f.frp < 10) bins[0]++;
            else if (f.frp < 50) bins[1]++;
            else if (f.frp < 100) bins[2]++;
            else if (f.frp < 200) bins[3]++;
            else bins[4]++;
        });
        
        // Draw bars with animation
        const maxBin = Math.max(...bins);
        const barWidth = width / bins.length;
        const colors = ['#4ade80', '#fbbf24', '#fb923c', '#f87171', '#dc2626'];
        
        bins.forEach((count, i) => {
            const barHeight = (count / maxBin) * (height - 40);
            const x = i * barWidth + 10;
            const y = height - barHeight - 20;
            
            // Gradient fill
            const gradient = ctx.createLinearGradient(x, y, x, height - 20);
            gradient.addColorStop(0, colors[i]);
            gradient.addColorStop(1, colors[i] + '40');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, barWidth - 20, barHeight);
            
            // Label
            ctx.fillStyle = '#e2e8f8';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(count, x + (barWidth - 20) / 2, height - 5);
        });
    }

    // Update fire map (mini heatmap)
    function updateFireMap(fires) {
        const canvas = document.getElementById('fire-map-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear with dark background
        ctx.fillStyle = '#0a0f1e';
        ctx.fillRect(0, 0, width, height);
        
        // Draw world outline (simplified)
        ctx.strokeStyle = '#1e2a45';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, width, height);
        
        // Plot fires
        fires.forEach(f => {
            // Convert lat/lng to canvas coordinates
            const x = ((f.lng + 180) / 360) * width;
            const y = ((90 - f.lat) / 180) * height;
            
            // Color based on intensity
            const intensity = Math.min(f.frp / 200, 1);
            const r = Math.floor(255 * intensity);
            const g = Math.floor(100 * (1 - intensity));
            
            ctx.fillStyle = `rgba(${r}, ${g}, 0, 0.6)`;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Update quake list with animations
    function updateQuakeList(quakes) {
        const container = document.getElementById('quake-list-container');
        if (!container) return;
        
        // Create HTML for quakes
        const html = quakes.map((q, i) => {
            const timeAgo = getTimeAgo(q.time);
            const magColor = q.magnitude >= 6 ? '#f87171' : q.magnitude >= 5 ? '#fb923c' : '#fbbf24';
            
            return `
            <div class="quake-item" style="animation-delay: ${i * 50}ms">
                <div class="quake-mag" style="background: ${magColor}20; border: 1px solid ${magColor}40">
                    <span style="color: ${magColor}; font-size: 1.2rem; font-weight: 800">${q.magnitude.toFixed(1)}</span>
                </div>
                <div class="quake-info">
                    <div class="quake-place">${q.place}</div>
                    <div class="quake-meta">${timeAgo} · Depth: ${q.depth.toFixed(0)}km</div>
                </div>
                <div class="quake-pulse" style="background: ${magColor}"></div>
            </div>`;
        }).join('');
        
        container.innerHTML = html;
    }

    // Update magnitude distribution chart
    function updateMagnitudeChart(quakes) {
        const canvas = document.getElementById('magnitude-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        // Group by magnitude
        const bins = { '4.5-5': 0, '5-6': 0, '6-7': 0, '7+': 0 };
        quakes.forEach(q => {
            if (q.magnitude >= 7) bins['7+']++;
            else if (q.magnitude >= 6) bins['6-7']++;
            else if (q.magnitude >= 5) bins['5-6']++;
            else bins['4.5-5']++;
        });
        
        // Draw as horizontal bars
        const labels = Object.keys(bins);
        const values = Object.values(bins);
        const maxValue = Math.max(...values);
        const barHeight = (height - 40) / labels.length;
        
        labels.forEach((label, i) => {
            const value = values[i];
            const barWidth = (value / maxValue) * (width - 100);
            const y = i * barHeight + 10;
            
            // Label
            ctx.fillStyle = '#6b7fa8';
            ctx.font = '11px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(label, 60, y + barHeight / 2 + 4);
            
            // Bar
            const gradient = ctx.createLinearGradient(70, y, 70 + barWidth, y);
            gradient.addColorStop(0, '#fbbf24');
            gradient.addColorStop(1, '#f87171');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(70, y, barWidth, barHeight - 10);
            
            // Value
            ctx.fillStyle = '#e2e8f8';
            ctx.textAlign = 'left';
            ctx.fillText(value, 75 + barWidth, y + barHeight / 2 + 4);
        });
    }

    // Initialize live charts
    function initializeLiveCharts() {
        // Create canvas elements if they don't exist
        const charts = [
            { id: 'fire-intensity-chart', width: 400, height: 200 },
            { id: 'fire-map-canvas', width: 600, height: 300 },
            { id: 'magnitude-chart', width: 300, height: 150 }
        ];
        
        charts.forEach(chart => {
            let canvas = document.getElementById(chart.id);
            if (!canvas) {
                canvas = document.createElement('canvas');
                canvas.id = chart.id;
                canvas.width = chart.width;
                canvas.height = chart.height;
                canvas.style.width = '100%';
                canvas.style.height = 'auto';
            }
        });
    }

    // Start background animations
    function startAnimations() {
        // Pulse animation for live indicators
        animateLiveIndicators();
        
        // Particle effects for fire visualization
        animateFireParticles();
    }

    // Animate live indicators
    function animateLiveIndicators() {
        const indicators = document.querySelectorAll('.live-indicator');
        
        indicators.forEach(indicator => {
            let opacity = 1;
            let direction = -1;
            
            const animate = () => {
                opacity += direction * 0.02;
                if (opacity <= 0.3 || opacity >= 1) direction *= -1;
                
                indicator.style.opacity = opacity;
                
                const frameId = requestAnimationFrame(animate);
                animationFrames.set(indicator, frameId);
            };
            
            animate();
        });
    }

    // Animate fire particles
    function animateFireParticles() {
        const canvas = document.getElementById('fire-particles-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const particles = [];
        
        // Create particles
        for (let i = 0; i < 50; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 1,
                opacity: Math.random()
            });
        }
        
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                
                // Wrap around edges
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;
                
                // Draw particle
                ctx.fillStyle = `rgba(248, 113, 113, ${p.opacity})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    // Update live indicators
    function updateLiveIndicators() {
        const now = Date.now();
        
        Object.entries(dataStreams).forEach(([stream, config]) => {
            const indicator = document.getElementById(`${stream}-indicator`);
            if (!indicator) return;
            
            const timeSinceUpdate = now - config.lastUpdate;
            const timeUntilNext = config.interval - timeSinceUpdate;
            
            if (timeUntilNext > 0) {
                const seconds = Math.ceil(timeUntilNext / 1000);
                indicator.textContent = `Next update in ${seconds}s`;
                indicator.style.color = '#4ade80';
            } else {
                indicator.textContent = 'Updating...';
                indicator.style.color = '#fbbf24';
            }
        });
    }

    // Handle visibility changes
    function handleVisibilityChange() {
        if (document.hidden) {
            // Pause updates when tab is hidden
            if (updateInterval) {
                clearInterval(updateInterval);
                updateInterval = null;
            }
        } else {
            // Resume updates when tab is visible
            startRealTimeUpdates();
        }
    }

    // Utility: Get time ago string
    function getTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    // Stop all updates and animations
    function stop() {
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
        
        animationFrames.forEach((frameId, element) => {
            cancelAnimationFrame(frameId);
        });
        animationFrames.clear();
        
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    }

    // Public API
    return {
        init,
        stop,
        updateDataStream,
        animateNumber
    };
})();

// Auto-initialize when loaded
if (typeof window !== 'undefined') {
    window.DynamicEarthImpact = DynamicEarthImpact;
    console.log('✅ DynamicEarthImpact loaded');
}
