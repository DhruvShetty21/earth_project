// services/nasaService.js
// All NASA + EONET + Open Notify API calls - Browser-safe version with RATE LIMITING

const NasaService = (() => {
    // ═══════════════════════════════════════════════════════════════
    // RATE LIMITING CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    
    const RATE_LIMIT = {
        maxRequests: 30,        // DEMO_KEY allows 30 requests/hour
        windowMs: 60 * 60 * 1000, // 1 hour
        requests: [],           // Track request timestamps
        retryAttempts: 3,       // Max retry attempts
        retryDelay: 2000,       // Initial retry delay (ms)
    };

    // Request queue to prevent simultaneous API calls
    let requestQueue = Promise.resolve();
    
    // Check if we can make a request
    function canMakeRequest() {
        const now = Date.now();
        // Remove old requests outside the window
        RATE_LIMIT.requests = RATE_LIMIT.requests.filter(
            time => now - time < RATE_LIMIT.windowMs
        );
        return RATE_LIMIT.requests.length < RATE_LIMIT.maxRequests;
    }
    
    // Record a request
    function recordRequest() {
        RATE_LIMIT.requests.push(Date.now());
    }
    
    // Get time until next available slot
    function getTimeUntilNextSlot() {
        if (RATE_LIMIT.requests.length === 0) return 0;
        const oldest = RATE_LIMIT.requests[0];
        const timeElapsed = Date.now() - oldest;
        return Math.max(0, RATE_LIMIT.windowMs - timeElapsed);
    }
    
    // Exponential backoff fetch with retry
    async function fetchWithRetry(url, options = {}, attempt = 0) {
        // Wait for any queued requests
        return requestQueue = requestQueue.then(async () => {
            // Check rate limit
            if (!canMakeRequest()) {
                const waitTime = getTimeUntilNextSlot();
                console.warn(`⏳ Rate limit reached. Waiting ${Math.round(waitTime / 1000)}s...`);
                await sleep(waitTime + 1000); // Add 1s buffer
            }
            
            try {
                recordRequest();
                const response = await fetch(url, options);
                
                // Handle 429 (Too Many Requests) with exponential backoff
                if (response.status === 429) {
                    if (attempt < RATE_LIMIT.retryAttempts) {
                        const delay = RATE_LIMIT.retryDelay * Math.pow(2, attempt);
                        console.warn(`⚠️ 429 Rate Limit - Retry ${attempt + 1}/${RATE_LIMIT.retryAttempts} in ${delay}ms`);
                        await sleep(delay);
                        return fetchWithRetry(url, options, attempt + 1);
                    }
                    throw new Error(`Rate limit exceeded after ${RATE_LIMIT.retryAttempts} retries`);
                }
                
                return response;
            } catch (error) {
                // Retry on network errors
                if (attempt < RATE_LIMIT.retryAttempts && error.name !== 'AbortError') {
                    const delay = RATE_LIMIT.retryDelay * Math.pow(2, attempt);
                    console.warn(`🔄 Network error - Retry ${attempt + 1}/${RATE_LIMIT.retryAttempts} in ${delay}ms`);
                    await sleep(delay);
                    return fetchWithRetry(url, options, attempt + 1);
                }
                throw error;
            }
        });
    }
    
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════
    
    function _getApiKey() {
        try {
            const savedKey = localStorage.getItem('av_nasa');
            if (savedKey && savedKey !== 'DEMO_KEY' && savedKey.trim() !== '') {
                return savedKey.trim();
            }
        } catch (e) {
            console.warn('Could not access localStorage:', e);
        }
        return 'DEMO_KEY';
    }

    function today() {
        return new Date().toISOString().slice(0, 10);
    }
    
    function daysAgo(n) {
        const d = new Date();
        d.setDate(d.getDate() - n);
        return d.toISOString().slice(0, 10);
    }

    function daysAhead(n) {
        const d = new Date();
        d.setDate(d.getDate() + n);
        return d.toISOString().slice(0, 10);
    }

    // ═══════════════════════════════════════════════════════════════
    // FALLBACK DATA
    // ═══════════════════════════════════════════════════════════════
    
    const FALLBACK_DISASTERS = [
        { id:'f1', title:'Amazon Wildfire Complex, Brazil', closed:null, categories:[{id:'8',title:'Wildfires'}],        geometry:[{date:'2026-02-14T00:00:00Z', type:'Point', coordinates:[-62.0,-3.5]}]  },
        { id:'f2', title:'Bangladesh River Delta Flooding',  closed:null, categories:[{id:'9',title:'Floods'}],          geometry:[{date:'2026-02-14T00:00:00Z', type:'Point', coordinates:[90.4,23.7]}]   },
        { id:'f3', title:'Mt. Etna Volcanic Activity',       closed:null, categories:[{id:'14',title:'Volcanoes'}],       geometry:[{date:'2026-02-13T00:00:00Z', type:'Point', coordinates:[15.0,37.75]}]  },
        { id:'f4', title:'Bay of Bengal Tropical Cyclone',   closed:null, categories:[{id:'10',title:'Severe Storms'}],   geometry:[{date:'2026-02-14T00:00:00Z', type:'Point', coordinates:[89.3,15.2]}]   },
        { id:'f5', title:'Sahara / Sahel Dust Storm',        closed:null, categories:[{id:'4',title:'Dust and Haze'}],    geometry:[{date:'2026-02-13T00:00:00Z', type:'Point', coordinates:[10.0,22.0]}]   },
        { id:'f6', title:'Australian Bushfires, NSW',        closed:null, categories:[{id:'8',title:'Wildfires'}],        geometry:[{date:'2026-02-14T00:00:00Z', type:'Point', coordinates:[150.5,-33.8]}] },
        { id:'f7', title:'California Wildfire, Riverside Co',closed:null, categories:[{id:'8',title:'Wildfires'}],        geometry:[{date:'2026-02-14T00:00:00Z', type:'Point', coordinates:[-117.0,33.9]}] },
        { id:'f8', title:'Chilean Landslide Event',          closed:null, categories:[{id:'15',title:'Landslides'}],      geometry:[{date:'2026-02-12T00:00:00Z', type:'Point', coordinates:[-71.6,-33.0]}] },
    ];

    const FALLBACK_APOD = {
        title: 'The Milky Way Core',
        explanation: 'Our galaxy, the Milky Way, as seen from a dark sky site. The galactic core — a dense region of stars, gas, and dust surrounding the supermassive black hole Sagittarius A* — is visible as a bright band across the sky. This is a simulated offline placeholder.',
        media_type: 'image',
        url: 'https://apod.nasa.gov/apod/image/2502/MilkyWayCore.jpg',
        date: today(),
    };

    // ═══════════════════════════════════════════════════════════════
    // API CALLS WITH RATE LIMITING
    // ═══════════════════════════════════════════════════════════════

    async function fetchEONET() {
        return CacheMiddleware.wrap('EONET', 'EONET', async () => {
            try {
                const r = await fetchWithRetry('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=60&days=20');
                if (!r.ok) throw new Error(`EONET ${r.status}`);
                const j = await r.json();
                const events = (j.events || []).filter(e => e.geometry?.length > 0);
                console.log(`[NasaService] EONET: ${events.length} events loaded`);
                return events;
            } catch (err) {
                console.warn('[NasaService] EONET failed, using fallback:', err.message);
                return FALLBACK_DISASTERS;
            }
        });
    }

    async function fetchAPOD(apiKey) {
        return CacheMiddleware.wrap('APOD', 'APOD', async () => {
            try {
                const key = apiKey || _getApiKey();
                const r = await fetchWithRetry(`https://api.nasa.gov/planetary/apod?api_key=${key}`);
                const j = await r.json();
                if (j.error) throw new Error(j.error.message);
                console.log('[NasaService] APOD loaded:', j.title);
                return j;
            } catch (err) {
                console.warn('[NasaService] APOD failed:', err.message);
                return FALLBACK_APOD;
            }
        });
    }

    async function fetchNEOWs(apiKey) {
        const cacheKey = `NEOWS_${today()}`;
        return CacheMiddleware.wrap(cacheKey, 'NEOWS', async () => {
            try {
                const key = apiKey || _getApiKey();
                const start = daysAgo(2); // Reduced from 3 to 2 days
                const end = today();
                const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${start}&end_date=${end}&api_key=${key}`;
                const r = await fetchWithRetry(url);
                const j = await r.json();
                if (j.error) throw new Error(j.error.message || JSON.stringify(j.error));
                const all = Object.values(j.near_earth_objects || {}).flat();
                console.log(`[NasaService] NeoWs: ${all.length} asteroids loaded`);
                return all;
            } catch (err) {
                console.warn('[NasaService] NeoWs failed:', err.message);
                return [];
            }
        });
    }

    async function fetchDONKI(apiKey) {
        return CacheMiddleware.wrap('DONKI', 'DONKI', async () => {
            try {
                const key = apiKey || _getApiKey();
                const url = `https://api.nasa.gov/DONKI/CME?startDate=${daysAgo(7)}&endDate=${today()}&api_key=${key}`;
                const r = await fetchWithRetry(url);
                const j = await r.json();
                if (!Array.isArray(j)) throw new Error('Unexpected DONKI response');
                console.log(`[NasaService] DONKI: ${j.length} CME events`);
                return j;
            } catch (err) {
                console.warn('[NasaService] DONKI failed:', err.message);
                return [];
            }
        });
    }

    async function fetchISS() {
        // No caching for ISS — always fresh
        try {
            const r = await fetch('http://api.open-notify.org/iss-now.json');
            if (!r.ok) throw new Error(`ISS API ${r.status}`);
            const j = await r.json();
            return {
                lat: parseFloat(j.iss_position.latitude),
                lng: parseFloat(j.iss_position.longitude),
                ts: j.timestamp,
                live: true,
            };
        } catch (err) {
            console.warn('[NasaService] ISS fetch failed:', err.message);
            return { lat: 28.5, lng: -80.6, live: false };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // NEO METHODS WITH IMPROVED CACHING & RATE LIMITING
    // ═══════════════════════════════════════════════════════════════

    async function getNEODetails(asteroidId) {
        return CacheMiddleware.wrap(`NEO_${asteroidId}`, 'NEOWS', async () => {
            try {
                const apiKey = _getApiKey();
                const response = await fetchWithRetry(
                    `https://api.nasa.gov/neo/rest/v1/neo/${asteroidId}?api_key=${apiKey}`
                );
                if (!response.ok) throw new Error(`NEO API error: ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('Failed to fetch NEO details:', error);
                return null;
            }
        });
    }

    async function getNEOsByDateRange(startDate, endDate, options = {}) {
        const { hazardous = null, minDiameter = 0, maxDistance = null } = options;
        const cacheKey = `NEOWS_${startDate}_${endDate}_${hazardous}_${minDiameter}`;
        
        // Check cache first - IMPORTANT for rate limiting
        const cached = CacheMiddleware.get(cacheKey);
        if (cached) {
            console.log(`✅ Using cached NEO data for ${startDate} to ${endDate}`);
            return cached;
        }
        
        try {
            const apiKey = _getApiKey();
            const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${apiKey}`;
            console.log(`📡 Fetching NEOs from API: ${startDate} to ${endDate}`);
            
            const response = await fetchWithRetry(url);
            
            if (!response.ok) {
                throw new Error(`NEO API error: ${response.status}`);
            }
            
            const data = await response.json();
            let neos = Object.values(data.near_earth_objects || {}).flat();
            
            // Apply filters
            if (hazardous !== null) {
                neos = neos.filter(neo => neo.is_potentially_hazardous_asteroid === hazardous);
            }
            
            if (minDiameter > 0) {
                neos = neos.filter(neo => {
                    const diameter = neo.estimated_diameter?.meters?.estimated_diameter_max || 0;
                    return diameter >= minDiameter;
                });
            }
            
            if (maxDistance !== null) {
                neos = neos.filter(neo => {
                    const distance = parseFloat(neo.close_approach_data?.[0]?.miss_distance?.lunar || 999);
                    return distance <= maxDistance;
                });
            }
            
            // Cache the result for 1 hour
            CacheMiddleware.set(cacheKey, neos, 'NEOWS');
            console.log(`✅ Fetched ${neos.length} NEOs from API`);
            
            return neos;
        } catch (error) {
            console.error('Failed to fetch NEOs:', error);
            // Return mock data on error
            return generateMockNEOs(20);
        }
    }

    async function getUpcomingCloseApproaches(days = 7, limit = 20) {
        const cacheKey = `NEO_UPCOMING_${days}_${limit}`;
        
        return CacheMiddleware.wrap(cacheKey, 'NEOWS', async () => {
            try {
                const startDate = today();
                const endDate = daysAhead(Math.min(days, 7)); // Cap at 7 days to reduce API load
                
                const neos = await getNEOsByDateRange(startDate, endDate);
                
                // Sort by close approach date
                const sorted = neos.sort((a, b) => {
                    const dateA = a.close_approach_data?.[0]?.close_approach_date || '';
                    const dateB = b.close_approach_data?.[0]?.close_approach_date || '';
                    return dateA.localeCompare(dateB);
                });
                
                return sorted.slice(0, limit);
            } catch (error) {
                console.error('Failed to get upcoming close approaches:', error);
                return generateMockNEOs(10);
            }
        });
    }

    async function getNEOStats() {
        const cacheKey = 'NEO_STATS';
        
        // Check cache first
        const cached = CacheMiddleware.get(cacheKey);
        if (cached) {
            console.log('✅ Using cached NEO stats');
            return cached;
        }
        
        try {
            const apiKey = _getApiKey();
            // Reduced window from 14 days to 7 days total (3 past + 4 future)
            const startDate = daysAgo(3);
            const endDate = daysAhead(4);
            
            console.log(`📡 Fetching NEO stats: ${startDate} to ${endDate}`);
            
            const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=${apiKey}`;
            const response = await fetchWithRetry(url);
            
            if (!response.ok) {
                throw new Error(`NEO API error: ${response.status}`);
            }
            
            const data = await response.json();
            const allNeos = Object.values(data.near_earth_objects || {}).flat();
            
            // Find closest approach
            let closest = null;
            let minDist = Infinity;
            allNeos.forEach(neo => {
                const dist = parseFloat(neo.close_approach_data?.[0]?.miss_distance?.lunar || 999);
                if (dist < minDist) {
                    minDist = dist;
                    closest = neo;
                }
            });
            
            // Find largest
            let largest = null;
            let maxSize = 0;
            allNeos.forEach(neo => {
                const size = neo.estimated_diameter?.meters?.estimated_diameter_max || 0;
                if (size > maxSize) {
                    maxSize = size;
                    largest = neo;
                }
            });
            
            const stats = {
                total: data.element_count || 0,
                hazardous: allNeos.filter(n => n.is_potentially_hazardous_asteroid).length,
                closest: closest ? {
                    name: closest.name,
                    distance: minDist,
                    date: closest.close_approach_data?.[0]?.close_approach_date
                } : null,
                largest: largest ? {
                    name: largest.name,
                    size: maxSize
                } : null,
                byDay: data.near_earth_objects || {}
            };
            
            // Cache for 1 hour
            CacheMiddleware.set(cacheKey, stats, 'NEOWS');
            console.log('✅ NEO stats fetched and cached');
            
            return stats;
        } catch (error) {
            console.error('Failed to fetch NEO stats:', error);
            // Return mock stats
            return {
                total: 25,
                hazardous: 8,
                closest: {
                    name: '2024 BX2 (Mock)',
                    distance: 12.5,
                    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                },
                largest: {
                    name: '2025 CY3 (Mock)',
                    size: 850
                },
                byDay: {}
            };
        }
    }

    // OPTIMIZED: Get all NEOs for visualization with minimal API calls
    async function getAllNEOsForVisualization(limit = 50) {
        const cacheKey = `NEO_VIZ_${limit}`;
        
        // Try cache first
        const cached = CacheMiddleware.get(cacheKey);
        if (cached) {
            console.log('✅ Using cached NEO visualization data');
            return cached;
        }
        
        try {
            // REDUCED WINDOW: Only 5 days total (2 past + 3 future) instead of 14
            const startDate = daysAgo(2);
            const endDate = daysAhead(3);
            
            console.log(`📡 Fetching NEOs for visualization: ${startDate} to ${endDate}`);
            const neos = await getNEOsByDateRange(startDate, endDate);
            
            if (neos && neos.length > 0) {
                const result = neos.slice(0, limit);
                // Cache for 30 minutes
                CacheMiddleware.set(cacheKey, result, 'NEOWS');
                console.log(`✅ Got ${result.length} NEOs for visualization`);
                return result;
            }
            
            // Fallback to mock data
            console.log('⚠️ No NEO data, using mock data');
            const mockData = generateMockNEOs(limit);
            return mockData;
        } catch (error) {
            console.error('Failed to get NEOs for visualization:', error);
            return generateMockNEOs(limit);
        }
    }

    // Generate mock NEOs for visualization when API fails
    function generateMockNEOs(count = 50) {
        const mockNeos = [];
        const namePrefixes = ['2023 AG', '2024 BX', '2025 CY', '2026 DZ', '2027 EZ', 
                              '2028 FA', '2029 GB', '2030 HC', '2031 ID', '2032 JE'];
        const hazardousOptions = [true, false];
        
        for (let i = 0; i < count; i++) {
            const isHazardous = hazardousOptions[Math.floor(Math.random() * hazardousOptions.length)];
            const distance = isHazardous ? Math.random() * 20 + 1 : Math.random() * 50 + 10;
            const diameter = Math.random() * 500 + 50;
            const nameIndex = Math.floor(Math.random() * namePrefixes.length);
            const number = Math.floor(Math.random() * 90) + 10;
            
            mockNeos.push({
                id: `mock-${i}-${Date.now()}`,
                name: `${namePrefixes[nameIndex]}${number}`,
                is_potentially_hazardous_asteroid: isHazardous,
                estimated_diameter: {
                    meters: {
                        estimated_diameter_max: diameter
                    }
                },
                close_approach_data: [{
                    close_approach_date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    miss_distance: {
                        lunar: distance.toString(),
                        kilometers: (distance * 384400).toString()
                    },
                    relative_velocity: {
                        kilometers_per_hour: (Math.random() * 50000 + 20000).toString()
                    }
                }],
                orbital_data: {
                    eccentricity: (Math.random() * 0.3 + 0.1).toFixed(3),
                    inclination: (Math.random() * 30).toFixed(2),
                    orbital_period: (Math.random() * 1000 + 200).toString(),
                    orbit_class: {
                        name: ['Apollo', 'Amor', 'Aten', 'Atira'][Math.floor(Math.random() * 4)]
                    }
                }
            });
        }
        
        return mockNeos;
    }
    
    // ═══════════════════════════════════════════════════════════════
    // RATE LIMIT STATUS (for debugging)
    // ═══════════════════════════════════════════════════════════════
    
    function getRateLimitStatus() {
        const now = Date.now();
        const recentRequests = RATE_LIMIT.requests.filter(
            time => now - time < RATE_LIMIT.windowMs
        );
        return {
            requestsInWindow: recentRequests.length,
            maxRequests: RATE_LIMIT.maxRequests,
            remainingRequests: RATE_LIMIT.maxRequests - recentRequests.length,
            timeUntilReset: getTimeUntilNextSlot(),
            canMakeRequest: canMakeRequest()
        };
    }

    return { 
        fetchEONET, 
        fetchAPOD, 
        fetchNEOWs, 
        fetchDONKI, 
        fetchISS,
        getNEODetails,
        getNEOsByDateRange,
        getUpcomingCloseApproaches,
        getNEOStats,
        getAllNEOsForVisualization,
        getRateLimitStatus,  // NEW: for debugging
        FALLBACK_DISASTERS, 
        FALLBACK_APOD 
    };
})();

// Make sure it's available globally
if (typeof window !== 'undefined') {
    window.NasaService = NasaService;
    console.log('✅ NasaService loaded with rate limiting');
}