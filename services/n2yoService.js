// services/n2yoService.js
// N2YO API service for satellite tracking with fallback data

const N2YOService = (() => {
    // Popular satellite database with mock data for fallback
    const POPULAR_SATELLITES = {
        25544: { name: 'ISS (Zarya)', category: 'Human Spaceflight', icon: '🛸', color: '#ffd060' },
        20580: { name: 'Hubble Space Telescope', category: 'Telescope', icon: '🔭', color: '#9966ff' },
        48274: { name: 'China Space Station', category: 'Human Spaceflight', icon: '🇨🇳', color: '#ff3333' },
        43013: { name: 'NOAA-20', category: 'Weather', icon: '🌦️', color: '#4fa3e0' },
        41866: { name: 'GOES-16', category: 'Weather', icon: '🌪️', color: '#00d4ff' },
        24876: { name: 'GPS BIIF-2', category: 'Navigation', icon: '📍', color: '#4ade80' },
        44713: { name: 'Starlink-1000', category: 'Communications', icon: '📡', color: '#94a3b8' },
        44056: { name: 'OneWeb-0001', category: 'Communications', icon: '🌐', color: '#3b82f6' },
        41918: { name: 'Iridium-101', category: 'Communications', icon: '📞', color: '#ec4899' },
        39084: { name: 'Landsat-8', category: 'Earth Observation', icon: '🛰️', color: '#10b981' },
        40697: { name: 'Sentinel-2A', category: 'Earth Observation', icon: '🌍', color: '#06b6d4' },
        27424: { name: 'Aqua', category: 'Earth Observation', icon: '💧', color: '#3b82f6' },
        25994: { name: 'Terra', category: 'Earth Observation', icon: '🌎', color: '#22c55e' },
        37820: { name: 'SkySat-1', category: 'Earth Observation', icon: '📷', color: '#a855f7' }
    };

    // Generate mock visual passes for fallback
    function generateMockPasses(satId, lat, lon, days = 3) {
        const passes = [];
        const now = Date.now() / 1000; // Current time in seconds
        
        for (let d = 0; d < days; d++) {
            for (let p = 0; p < 2; p++) { // 2 passes per day
                const startTime = now + (d * 86400) + (p * 43200) + (Math.random() * 3600);
                const duration = 300 + Math.random() * 300; // 5-10 minutes
                
                passes.push({
                    startUTC: Math.floor(startTime),
                    endUTC: Math.floor(startTime + duration),
                    maxEl: 20 + Math.random() * 60, // 20-80 degrees
                    mag: -1 + Math.random() * 4, // -1 to 3 magnitude
                    startAz: Math.random() * 360,
                    endAz: Math.random() * 360,
                    startAzCompass: ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.floor(Math.random() * 16)],
                    endAzCompass: ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.floor(Math.random() * 16)],
                    maxAz: Math.random() * 360,
                    maxAzCompass: ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.floor(Math.random() * 16)]
                });
            }
        }
        
        // Sort by start time
        passes.sort((a, b) => a.startUTC - b.startUTC);
        
        return passes;
    }

    // Get satellites above location
    async function getSatellitesAbove(lat, lon, radius = 45, category = 0) {
        try {
            const response = await fetch(`/api/n2yo/above?lat=${lat}&lon=${lon}&radius=${radius}&category=${category}`);
            if (!response.ok) throw new Error('Failed to fetch satellites above');
            const data = await response.json();
            
            // Enhance with popular satellite data
            if (data.above) {
                data.above = data.above.map(sat => ({
                    ...sat,
                    ...(POPULAR_SATELLITES[sat.satid] || {
                        name: sat.satname,
                        category: 'Unknown',
                        icon: '🛰️',
                        color: '#94a3b8'
                    })
                }));
            }
            
            return data;
        } catch (error) {
            console.error('N2YO above error:', error);
            // Return mock data
            return {
                above: Object.entries(POPULAR_SATELLITES).slice(0, 10).map(([id, data], index) => ({
                    satid: parseInt(id),
                    satname: data.name,
                    intDesignator: `2020-${String(index).padStart(3, '0')}A`,
                    launchDate: '2020-01-01',
                    satlat: lat + (Math.random() - 0.5) * 20,
                    satlng: lon + (Math.random() - 0.5) * 20,
                    satalt: 400 + Math.random() * 200,
                    ...data
                }))
            };
        }
    }

    // Get visual passes for a satellite
    async function getVisualPasses(satId, lat, lon, days = 7, minElevation = 10) {
        try {
            const response = await fetch(`/api/n2yo/visual-passes?id=${satId}&lat=${lat}&lon=${lon}&days=${days}&min_elevation=${minElevation}`);
            
            if (!response.ok) {
                console.warn(`N2YO API returned ${response.status}, using mock data`);
                // Return mock data
                return {
                    info: {
                        satid: satId,
                        satname: POPULAR_SATELLITES[satId]?.name || `Satellite ${satId}`,
                        passes: 2 * days
                    },
                    passes: generateMockPasses(satId, lat, lon, days).filter(p => p.maxEl >= minElevation)
                };
            }
            
            const data = await response.json();
            
            // Add satellite info if not present
            if (data && !data.info && POPULAR_SATELLITES[satId]) {
                data.info = {
                    satid: satId,
                    satname: POPULAR_SATELLITES[satId].name
                };
            }
            
            return data;
        } catch (error) {
            console.error('N2YO visual passes error:', error);
            // Return mock data
            return {
                info: {
                    satid: satId,
                    satname: POPULAR_SATELLITES[satId]?.name || `Satellite ${satId}`,
                    passes: 2 * days
                },
                passes: generateMockPasses(satId, lat, lon, days).filter(p => p.maxEl >= minElevation)
            };
        }
    }

    // Get popular satellites
    async function getPopularSatellites() {
        try {
            const response = await fetch('/api/n2yo/popular');
            if (!response.ok) throw new Error('Failed to fetch popular satellites');
            return await response.json();
        } catch (error) {
            console.error('N2YO popular error:', error);
            // Return fallback data
            return Object.entries(POPULAR_SATELLITES).map(([id, data]) => ({
                id: parseInt(id),
                name: data.name,
                category: data.category,
                icon: data.icon,
                color: data.color
            }));
        }
    }

    // Format pass time for display
    function formatPassTime(timestamp) {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Calculate visibility score for a pass
    function calculatePassScore(pass) {
        let score = 0;
        
        // Higher elevation = better visibility
        if (pass.maxEl > 80) score += 40;
        else if (pass.maxEl > 60) score += 30;
        else if (pass.maxEl > 40) score += 20;
        else if (pass.maxEl > 20) score += 10;
        
        // Longer duration = better
        const duration = pass.endUTC - pass.startUTC;
        if (duration > 600) score += 30; // >10 minutes
        else if (duration > 300) score += 20; // >5 minutes
        else if (duration > 120) score += 10; // >2 minutes
        
        // Magnitude (brightness) - lower is brighter
        if (pass.mag < 0) score += 30; // Very bright
        else if (pass.mag < 2) score += 20; // Bright
        else if (pass.mag < 4) score += 10; // Visible
        
        return Math.min(100, Math.max(0, score));
    }

    // Public API
    return {
        getSatellitesAbove,
        getVisualPasses,
        getPopularSatellites,
        formatPassTime,
        calculatePassScore,
        POPULAR_SATELLITES
    };
})();

window.N2YOService = N2YOService;
console.log('✅ N2YOService loaded with fallback data');