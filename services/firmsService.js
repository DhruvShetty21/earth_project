// services/firmsService.js
// NASA FIRMS (Fire Information for Resource Management System) Service
// Uses local proxy server to avoid CORS issues

const FIRMSService = (() => {
    const PROXY_URL = 'http://localhost:3000/api/firms/active-fires';
    
    /**
     * Fetch active fire data
     * @param {Object} options - Query options
     * @param {string} options.source - Data source: 'MODIS_NRT' or 'VIIRS_SNPP_NRT'
     * @param {string} options.area - Area: 'world' or country code
     * @param {number} options.days - Days of data (1-10)
     * @returns {Promise<Object>} Fire data
     */
    async function fetchActiveFires(options = {}) {
        const { 
            source = 'MODIS_NRT',  // MODIS or VIIRS
            area = 'world',         // world, USA, etc.
            days = 1                // 1-10 days
        } = options;
        
        const cacheKey = `FIRMS_${source}_${area}_${days}`;
        
        // Check cache first (3 hour cache)
        return CacheMiddleware.wrap(cacheKey, 'EONET', async () => {
            try {
                console.log(`[FIRMS] Fetching ${days} day(s) of ${source} fire data for ${area}...`);
                
                const url = `${PROXY_URL}?source=${source}&area=${area}&days=${days}`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success) {
                    console.log(`[FIRMS] ✅ ${data.data.total} active fires detected`);
                    console.log(`[FIRMS] Top countries:`, 
                        Object.entries(data.data.byCountry)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([country, count]) => `${country}: ${count}`)
                            .join(', ')
                    );
                } else {
                    console.warn('[FIRMS] ⚠️ Using fallback data');
                }
                
                return data;
                
            } catch (error) {
                console.error('[FIRMS] Failed to fetch fire data:', error.message);
                
                // Return mock data on error
                return {
                    success: false,
                    error: error.message,
                    data: {
                        total: 1250,
                        byCountry: {
                            'USA': 245,
                            'Brazil': 189,
                            'Canada': 156,
                            'Russia': 134,
                            'Australia': 98,
                            'Indonesia': 76,
                            'Congo': 65,
                            'India': 54
                        },
                        byConfidence: { low: 234, nominal: 567, high: 416 },
                        byType: { moderate: 489, large: 512, intense: 216 },
                        recent: [],
                        source: 'Mock Data (API Error)',
                        lastUpdated: new Date().toISOString(),
                        note: 'Using mock data because API is unavailable or proxy server is not running'
                    }
                };
            }
        });
    }
    
    /**
     * Fetch fires for a specific region
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @param {number} radius - Radius in degrees (~111km per degree)
     */
    async function fetchFiresNearLocation(lat, lon, radius = 5) {
        const fires = await fetchActiveFires({ days: 1 });
        
        if (!fires.success || !fires.data.recent) {
            return { fires: [], count: 0 };
        }
        
        // Filter fires within radius
        const nearbyFires = fires.data.recent.filter(fire => {
            const fireLat = parseFloat(fire.latitude);
            const fireLon = parseFloat(fire.longitude);
            
            if (isNaN(fireLat) || isNaN(fireLon)) return false;
            
            // Simple distance calculation (not accounting for Earth's curvature)
            const latDiff = Math.abs(fireLat - lat);
            const lonDiff = Math.abs(fireLon - lon);
            const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
            
            return distance <= radius;
        });
        
        return {
            fires: nearbyFires,
            count: nearbyFires.length,
            radius,
            center: { lat, lon }
        };
    }
    
    /**
     * Get fire statistics
     */
    async function getFireStats() {
        const data = await fetchActiveFires({ days: 1 });
        
        if (!data.success) {
            return null;
        }
        
        return {
            total: data.data.total,
            byCountry: data.data.byCountry,
            byConfidence: data.data.byConfidence,
            byType: data.data.byType,
            topCountries: Object.entries(data.data.byCountry)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([country, count]) => ({ country, count })),
            lastUpdated: data.data.lastUpdated,
            source: data.data.source
        };
    }
    
    /**
     * Convert fire data to globe points for visualization
     */
    function firesToGlobePoints(fires, limit = 500) {
        if (!Array.isArray(fires)) return [];
        
        return fires.slice(0, limit).map(fire => {
            const brightness = parseFloat(fire.brightness || fire.bright_ti4 || 350);
            const confidence = parseFloat(fire.confidence || 50);
            
            // Color based on intensity
            let color = '#ff6b35'; // Default orange
            let radius = 0.3;
            
            if (brightness > 400) {
                color = '#ff0000'; // Red - very intense
                radius = 0.5;
            } else if (brightness > 350) {
                color = '#ff4500'; // Orange-red - intense
                radius = 0.4;
            } else if (brightness > 320) {
                color = '#ff8c00'; // Orange - moderate
                radius = 0.35;
            } else {
                color = '#ffaa00'; // Yellow-orange - low
                radius = 0.3;
            }
            
            return {
                lat: parseFloat(fire.latitude),
                lng: parseFloat(fire.longitude),
                altitude: 0.01,
                radius: radius,
                color: color,
                label: `🔥 Active Fire - Brightness: ${brightness.toFixed(0)}K, Confidence: ${confidence}%`,
                type: 'fire',
                raw: fire,
                brightness,
                confidence
            };
        }).filter(p => !isNaN(p.lat) && !isNaN(p.lng));
    }
    
    return {
        fetchActiveFires,
        fetchFiresNearLocation,
        getFireStats,
        firesToGlobePoints
    };
})();

// Make globally available
if (typeof window !== 'undefined') {
    window.FIRMSService = FIRMSService;
    console.log('✅ FIRMSService loaded');
}