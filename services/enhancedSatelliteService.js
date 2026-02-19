// services/enhancedSatelliteService.js
// Real-time satellite tracking with better predictions

const EnhancedSatelliteService = (() => {
    const POPULAR_SATELLITES = [
        { id: 25544, name: 'ISS', category: 'Space Station', icon: '🛸', color: '#4da6ff' },
        { id: 48274, name: 'Starlink-1600', category: 'Communications', icon: '📡', color: '#00ff88' },
        { id: 43013, name: 'Hubble Space Telescope', category: 'Science', icon: '🔭', color: '#ff6b9d' },
        { id: 20580, name: 'GPS BIIA-21', category: 'Navigation', icon: '🛰️', color: '#ffd700' },
        { id: 37849, name: 'Tiangong', category: 'Space Station', icon: '🏗️', color: '#ff4455' }
    ];

    // Get satellites currently overhead
    async function getSatellitesOverhead(lat, lon, radius = 70) {
        try {
            const response = await fetch(`/api/n2yo/above?lat=${lat}&lon=${lon}&radius=${radius}&category=0`);
            if (!response.ok) throw new Error('N2YO API error');
            
            const data = await response.json();
            
            if (!data.above || data.above.length === 0) {
                return { satellites: [], count: 0 };
            }

            // Enhance with additional info
            const enhanced = data.above.map(sat => ({
                id: sat.satid,
                name: sat.satname,
                altitude: sat.satalt,
                latitude: sat.satlat,
                longitude: sat.satlng,
                category: categorizeByName(sat.satname),
                icon: getIconForSatellite(sat.satname),
                color: getColorForCategory(categorizeByName(sat.satname))
            }));

            return {
                satellites: enhanced,
                count: enhanced.length,
                location: { lat, lon, radius },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('[EnhancedSatellite] Overhead fetch failed:', error);
            return { satellites: [], count: 0, error: error.message };
        }
    }

    // Get visual passes for multiple satellites
    async function getMultipleSatellitePasses(lat, lon, days = 7) {
        const passes = [];
        
        for (const sat of POPULAR_SATELLITES) {
            try {
                const response = await fetch(
                    `/api/n2yo/visual-passes?id=${sat.id}&lat=${lat}&lon=${lon}&days=${days}&min_elevation=10`
                );
                
                if (!response.ok) continue;
                
                const data = await response.json();
                
                if (data.passes && data.passes.length > 0) {
                    passes.push({
                        satellite: sat,
                        passes: data.passes.map(pass => ({
                            ...pass,
                            score: calculatePassScore(pass),
                            quality: getPassQuality(pass)
                        }))
                    });
                }
            } catch (error) {
                console.warn(`[EnhancedSatellite] Failed to get passes for ${sat.name}:`, error);
            }
        }

        // Sort by next pass time
        passes.sort((a, b) => {
            const aTime = a.passes[0]?.startUTC || Infinity;
            const bTime = b.passes[0]?.startUTC || Infinity;
            return aTime - bTime;
        });

        return passes;
    }

    // Calculate pass quality score
    function calculatePassScore(pass) {
        let score = 0;
        
        // Elevation (max 40 points)
        score += Math.min(pass.maxEl / 90 * 40, 40);
        
        // Duration (max 30 points)
        const duration = pass.endUTC - pass.startUTC;
        score += Math.min(duration / 600 * 30, 30); // 600s = 10min = max
        
        // Brightness (max 30 points)
        if (pass.mag !== undefined && pass.mag < 10) {
            const brightness = Math.max(0, 5 - pass.mag); // Brighter = lower mag
            score += Math.min(brightness / 5 * 30, 30);
        } else {
            score += 15; // Default for unknown magnitude
        }
        
        return Math.round(score);
    }

    // Get pass quality label
    function getPassQuality(pass) {
        const score = calculatePassScore(pass);
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Good';
        if (score >= 40) return 'Fair';
        return 'Poor';
    }

    // Categorize satellite by name
    function categorizeByName(name) {
        const n = name.toLowerCase();
        if (n.includes('starlink')) return 'Communications';
        if (n.includes('iss') || n.includes('station')) return 'Space Station';
        if (n.includes('hubble') || n.includes('telescope')) return 'Science';
        if (n.includes('gps') || n.includes('glonass') || n.includes('galileo')) return 'Navigation';
        if (n.includes('weather') || n.includes('noaa') || n.includes('goes')) return 'Weather';
        if (n.includes('spy') || n.includes('military')) return 'Military';
        return 'Other';
    }

    // Get icon for satellite
    function getIconForSatellite(name) {
        const category = categorizeByName(name);
        const icons = {
            'Space Station': '🛸',
            'Communications': '📡',
            'Science': '🔭',
            'Navigation': '🛰️',
            'Weather': '🌦️',
            'Military': '🔒',
            'Other': '🛰️'
        };
        return icons[category] || '🛰️';
    }

    // Get color for category
    function getColorForCategory(category) {
        const colors = {
            'Space Station': '#4da6ff',
            'Communications': '#00ff88',
            'Science': '#ff6b9d',
            'Navigation': '#ffd700',
            'Weather': '#88ccff',
            'Military': '#ff4455',
            'Other': '#94a3b8'
        };
        return colors[category] || '#94a3b8';
    }

    // Get next best viewing opportunity
    async function getNextBestPass(lat, lon) {
        const allPasses = await getMultipleSatellitePasses(lat, lon, 3);
        
        if (allPasses.length === 0) return null;
        
        // Find the highest scoring pass in the next 24 hours
        const now = Date.now() / 1000;
        const tomorrow = now + 86400;
        
        let bestPass = null;
        let bestScore = 0;
        
        allPasses.forEach(({ satellite, passes }) => {
            passes.forEach(pass => {
                if (pass.startUTC >= now && pass.startUTC <= tomorrow) {
                    if (pass.score > bestScore) {
                        bestScore = pass.score;
                        bestPass = { satellite, pass };
                    }
                }
            });
        });
        
        return bestPass;
    }

    return {
        getSatellitesOverhead,
        getMultipleSatellitePasses,
        getNextBestPass,
        calculatePassScore,
        POPULAR_SATELLITES
    };
})();

if (typeof window !== 'undefined') {
    window.EnhancedSatelliteService = EnhancedSatelliteService;
    console.log('✅ EnhancedSatelliteService loaded');
}
