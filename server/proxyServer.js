// server/proxyServer.js
// Node.js proxy server with SpaceDevs event visibility calculations
// Run with: node server/proxyServer.js

const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// Cache for API responses
const cache = new Map();

// ============= ASTRONOMICAL CALCULATION FUNCTIONS =============

// Convert degrees to radians
function degToRad(deg) {
    return deg * Math.PI / 180;
}

// Convert radians to degrees
function radToDeg(rad) {
    return rad * 180 / Math.PI;
}

// Calculate Julian Date
function julianDate(date = new Date()) {
    return date.getTime() / 86400000 + 2440587.5;
}

// Calculate Greenwich Sidereal Time (degrees)
function gmst(date = new Date()) {
    const jd = julianDate(date);
    const d = jd - 2451545.0;
    const t = d / 36525.0;
    
    let theta = 280.46061837 + 360.98564736629 * d + 0.000387933 * t * t - t * t * t / 38710000;
    theta = theta % 360;
    if (theta < 0) theta += 360;
    
    return theta;
}

// Calculate Local Sidereal Time (degrees)
function lst(lon, date = new Date()) {
    const gst = gmst(date);
    let lst = gst + lon;
    lst = lst % 360;
    if (lst < 0) lst += 360;
    return lst;
}

// Calculate altitude of celestial object (degrees)
function calculateAltitude(dec, ra, lat, lon, date = new Date()) {
    const lstDeg = lst(lon, date);
    const ha = (lstDeg - ra * 15) * Math.PI / 180; // Hour angle in radians
    
    const decRad = degToRad(dec);
    const latRad = degToRad(lat);
    
    const alt = Math.asin(
        Math.sin(latRad) * Math.sin(decRad) +
        Math.cos(latRad) * Math.cos(decRad) * Math.cos(ha)
    );
    
    return radToDeg(alt);
}

// Calculate if object is above horizon
function isAboveHorizon(dec, ra, lat, lon, date = new Date()) {
    return calculateAltitude(dec, ra, lat, lon, date) > 0;
}

// Find next rise time for an object
function findNextRiseTime(dec, ra, lat, lon, startDate = new Date()) {
    const maxIterations = 48; // Check next 48 hours
    const hourMs = 60 * 60 * 1000;
    
    for (let i = 0; i < maxIterations; i++) {
        const checkDate = new Date(startDate.getTime() + i * hourMs);
        const alt = calculateAltitude(dec, ra, lat, lon, checkDate);
        const nextAlt = calculateAltitude(dec, ra, lat, lon, new Date(checkDate.getTime() + hourMs));
        
        // Look for transition from below to above horizon
        if (alt <= 0 && nextAlt > 0) {
            // Approximate rise time by interpolation
            const fraction = (0 - alt) / (nextAlt - alt);
            return new Date(checkDate.getTime() + fraction * hourMs);
        }
    }
    return null;
}

// Find next set time for an object
function findNextSetTime(dec, ra, lat, lon, startDate = new Date()) {
    const maxIterations = 48;
    const hourMs = 60 * 60 * 1000;
    
    for (let i = 0; i < maxIterations; i++) {
        const checkDate = new Date(startDate.getTime() + i * hourMs);
        const alt = calculateAltitude(dec, ra, lat, lon, checkDate);
        const nextAlt = calculateAltitude(dec, ra, lat, lon, new Date(checkDate.getTime() + hourMs));
        
        // Look for transition from above to below horizon
        if (alt > 0 && nextAlt <= 0) {
            const fraction = alt / (alt - nextAlt);
            return new Date(checkDate.getTime() + fraction * hourMs);
        }
    }
    return null;
}

// Calculate visibility window for an event
function calculateEventVisibility(event, lat, lon) {
    // Parse event date
    const eventDate = new Date(event.date);
    const now = new Date();
    
    // If event is in the past, no visibility
    if (eventDate < now) return null;
    
    // Determine object coordinates based on event type/location
    // For ISS/spacecraft events, they're in low Earth orbit - visible if overhead
    if (event.location && event.location.includes('ISS')) {
        // ISS orbit: approximate - will be visible if it passes overhead
        // This would need real-time TLE data for precise predictions
        return {
            isVisible: true,
            visibilityWindows: [{
                start: new Date(eventDate.getTime() - 2 * 60 * 60 * 1000), // 2 hours before
                end: new Date(eventDate.getTime() + 2 * 60 * 60 * 1000),   // 2 hours after
                type: 'approximate',
                description: 'Visible if ISS passes over your location during this window'
            }],
            bestViewing: 'Check Heavens-Above app for precise ISS pass times'
        };
    }
    
    // For celestial events (meteor showers, eclipses, etc.), use approximate coordinates
    // This is a simplified model - in production, you'd use precise ephemeris data
    
    // Approximate coordinates for different event types
    let ra, dec;
    const eventType = event.type?.name?.toLowerCase() || '';
    
    if (eventType.includes('eclipse')) {
        // Solar/lunar eclipses are visible from specific regions
        // For now, return approximate visibility
        return {
            isVisible: Math.abs(lat) < 60, // Most eclipses visible between 60°N and 60°S
            visibilityWindows: [{
                start: new Date(eventDate.getTime() - 30 * 60 * 1000), // 30 min before
                end: new Date(eventDate.getTime() + 30 * 60 * 1000),   // 30 min after
                type: 'event time'
            }],
            bestViewing: 'Check local eclipse timings for exact visibility'
        };
    }
    
    if (eventType.includes('meteor')) {
        // Meteor showers have a radiant point
        // Approximate radiant coordinates by month
        const month = eventDate.getMonth();
        if (month === 7) { // August - Perseids
            ra = 3.08; dec = 58;
        } else if (month === 11) { // December - Geminids
            ra = 7.5; dec = 32;
        } else if (month === 3) { // April - Lyrids
            ra = 18.08; dec = 34;
        } else {
            // Default to overhead
            return {
                isVisible: true,
                visibilityWindows: [{
                    start: new Date(eventDate.getTime() - 4 * 60 * 60 * 1000),
                    end: new Date(eventDate.getTime() + 4 * 60 * 60 * 1000),
                    type: 'night of peak'
                }],
                bestViewing: 'Best viewed after midnight when radiant is high'
            };
        }
        
        // Calculate visibility for this radiant
        const riseTime = findNextRiseTime(dec, ra, lat, lon, eventDate);
        const setTime = findNextSetTime(dec, ra, lat, lon, eventDate);
        
        if (riseTime && setTime) {
            return {
                isVisible: true,
                visibilityWindows: [{
                    start: riseTime,
                    end: setTime,
                    type: 'radiant above horizon',
                    maxAltitude: calculateMaxAltitude(dec, ra, lat, lon, riseTime, setTime)
                }],
                bestViewing: `Radiant rises at ${formatTime(riseTime)} and sets at ${formatTime(setTime)}. Best viewing after midnight.`
            };
        }
    }
    
    // Default: visible if it's a future event
    return {
        isVisible: true,
        visibilityWindows: [{
            start: eventDate,
            end: new Date(eventDate.getTime() + 2 * 60 * 60 * 1000),
            type: 'event time'
        }],
        bestViewing: 'Watch live webcast if available'
    };
}

// Calculate maximum altitude during visibility window
function calculateMaxAltitude(dec, ra, lat, lon, start, end) {
    let maxAlt = -90;
    let maxAltTime = start;
    const checkInterval = 10 * 60 * 1000; // 10 minutes
    
    for (let t = start.getTime(); t < end.getTime(); t += checkInterval) {
        const alt = calculateAltitude(dec, ra, lat, lon, new Date(t));
        if (alt > maxAlt) {
            maxAlt = alt;
            maxAltTime = new Date(t);
        }
    }
    
    return {
        altitude: Math.round(maxAlt * 10) / 10,
        time: maxAltTime
    };
}

// Format time for display
function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ============= SPACEDEVS API INTEGRATION =============

// Fetch events from SpaceDevs API
async function fetchSpaceDevsEvents(limit = 50, daysAhead = 90) {
    const cacheKey = `spacedevs-events-${limit}-${daysAhead}`;
    
    if (cache.has(cacheKey)) {
        const { data, timestamp } = cache.get(cacheKey);
        if (Date.now() - timestamp < 60 * 60 * 1000) { // 1 hour cache
            return data;
        }
    }
    
    try {
        // Calculate date range
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const response = await axios.get(
            `https://ll.thespacedevs.com/2.3.0/events/?limit=${limit}&date__gte=${startDate}&date__lte=${endDate}&format=json`
        );
        
        const events = response.data.results || [];
        
        // Cache the response
        cache.set(cacheKey, { data: events, timestamp: Date.now() });
        
        return events;
    } catch (error) {
        console.error('SpaceDevs API error:', error.message);
        return [];
    }
}

// server/proxyServer.js - Add these new endpoints

// ============= N2YO API INTEGRATION =============

// N2YO API configuration
const N2YO_API_KEY = process.env.N2YO_API_KEY || ''; // Add to your .env file

// Satellite categories from N2YO
const SATELLITE_CATEGORIES = {
    0: 'All',
    1: 'Amateur',
    2: 'CubeSat',
    3: 'Education',
    4: 'Engineering',
    5: 'Galileo',
    6: 'GLO-OPS',
    7: 'GPS-OPS',
    8: 'Military',
    9: 'Radar',
    10: 'Resource',
    11: 'SARSAT',
    12: 'Science',
    13: 'TDRSS',
    14: 'Weather',
    15: 'XM/Sirius',
    16: 'Iridium-NEXT',
    17: 'Globalstar',
    18: 'Intelsat',
    19: 'SES',
    20: 'Telesat',
    21: 'Orbcomm',
    22: 'Gorizont',
    23: 'Raduga',
    24: 'Molniya',
    25: 'DMC',
    26: 'Argos',
    27: 'Planet',
    28: 'Spire',
    29: 'Starlink',
    30: 'OneWeb'
};

// Common satellite NORAD IDs
const POPULAR_SATELLITES = {
    ISS: 25544,
    HUBBLE: 20580,
    Tiangong: 48274,
    'NOAA-20': 43013,
    'GOES-16': 41866,
    'GPS BIIF-2': 24876,
    'Starlink-1000': 44713,
    'OneWeb-0001': 44056,
    'Iridium-101': 41918,
    'Landsat-8': 39084,
    'Sentinel-2A': 40697,
    'Aqua': 27424,
    'Terra': 25994,
    'CALIPSO': 29108,
    'CloudSat': 29107
};

// Get satellites above a location
app.get('/api/n2yo/above', async (req, res) => {
    try {
        const { lat, lon, radius = 45, category = 0 } = req.query;
        
        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude and longitude required' });
        }
        
        if (!N2YO_API_KEY) {
            return res.status(400).json({ error: 'N2YO API key not configured' });
        }

        const cacheKey = `n2yo-above-${lat}-${lon}-${radius}-${category}`;
        if (cache.has(cacheKey)) {
            const { data, timestamp } = cache.get(cacheKey);
            if (Date.now() - timestamp < 5 * 60 * 1000) { // 5 min cache
                return res.json(data);
            }
        }

        const url = `https://api.n2yo.com/rest/v1/satellite/above/${lat}/${lon}/${radius}/${category}/&apiKey=${N2YO_API_KEY}`;
        const response = await axios.get(url);
        
        cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
        res.json(response.data);
    } catch (error) {
        console.error('N2YO above error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get visual passes for a satellite
app.get('/api/n2yo/visual-passes', async (req, res) => {
    try {
        const { id, lat, lon, days = 7, min_elevation = 10 } = req.query;
        
        if (!id || !lat || !lon) {
            return res.status(400).json({ error: 'Satellite ID, latitude, and longitude required' });
        }
        
        if (!N2YO_API_KEY) {
            return res.status(400).json({ error: 'N2YO API key not configured' });
        }

        const cacheKey = `n2yo-visual-${id}-${lat}-${lon}-${days}`;
        if (cache.has(cacheKey)) {
            const { data, timestamp } = cache.get(cacheKey);
            if (Date.now() - timestamp < 30 * 60 * 1000) { // 30 min cache
                return res.json(data);
            }
        }

        const url = `https://api.n2yo.com/rest/v1/satellite/visualpasses/${id}/${lat}/${lon}/0/${days}/${min_elevation}/&apiKey=${N2YO_API_KEY}`;
        const response = await axios.get(url);
        
        cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
        res.json(response.data);
    } catch (error) {
        console.error('N2YO visual passes error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get radio passes for a satellite
app.get('/api/n2yo/radio-passes', async (req, res) => {
    try {
        const { id, lat, lon, days = 7, min_elevation = 10 } = req.query;
        
        if (!id || !lat || !lon) {
            return res.status(400).json({ error: 'Satellite ID, latitude, and longitude required' });
        }

        const url = `https://api.n2yo.com/rest/v1/satellite/radiopasses/${id}/${lat}/${lon}/0/${days}/${min_elevation}/&apiKey=${N2YO_API_KEY}`;
        const response = await axios.get(url);
        
        res.json(response.data);
    } catch (error) {
        console.error('N2YO radio passes error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get satellite positions (for real-time tracking)
app.get('/api/n2yo/positions', async (req, res) => {
    try {
        const { id, lat, lon, seconds = 60 } = req.query;
        
        if (!id || !lat || !lon) {
            return res.status(400).json({ error: 'Satellite ID, latitude, and longitude required' });
        }

        const url = `https://api.n2yo.com/rest/v1/satellite/positions/${id}/${lat}/${lon}/0/${seconds}/&apiKey=${N2YO_API_KEY}`;
        const response = await axios.get(url);
        
        res.json(response.data);
    } catch (error) {
        console.error('N2YO positions error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get TLE data for a satellite
app.get('/api/n2yo/tle', async (req, res) => {
    try {
        const { id } = req.query;
        
        if (!id) {
            return res.status(400).json({ error: 'Satellite ID required' });
        }

        const url = `https://api.n2yo.com/rest/v1/satellite/tle/${id}/&apiKey=${N2YO_API_KEY}`;
        const response = await axios.get(url);
        
        res.json(response.data);
    } catch (error) {
        console.error('N2YO TLE error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Search satellites by name
app.get('/api/n2yo/search', async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query required' });
        }

        // N2YO doesn't have a direct search endpoint, so we'll return popular matches
        const matches = [];
        const lowerQuery = query.toLowerCase();
        
        for (const [name, id] of Object.entries(POPULAR_SATELLITES)) {
            if (name.toLowerCase().includes(lowerQuery)) {
                matches.push({ name, id, category: SATELLITE_CATEGORIES[getCategoryForSatellite(id)] });
            }
        }
        
        res.json({ matches });
    } catch (error) {
        console.error('N2YO search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get satellite categories
app.get('/api/n2yo/categories', (req, res) => {
    res.json(SATELLITE_CATEGORIES);
});

// Get popular satellites
app.get('/api/n2yo/popular', (req, res) => {
    const popular = [];
    for (const [name, id] of Object.entries(POPULAR_SATELLITES)) {
        popular.push({
            name,
            id,
            category: SATELLITE_CATEGORIES[getCategoryForSatellite(id)]
        });
    }
    res.json(popular);
});

// Helper to guess category for popular satellites
function getCategoryForSatellite(id) {
    if (id === 25544) return 0; // ISS
    if (id >= 44713 && id <= 44900) return 29; // Starlink range
    if (id >= 44056 && id <= 44100) return 30; // OneWeb range
    if (id === 20580) return 12; // Hubble - Science
    if (id === 43013) return 14; // NOAA - Weather
    if (id === 41866) return 14; // GOES - Weather
    if (id === 24876) return 7; // GPS
    if (id >= 41918 && id <= 41999) return 16; // Iridium
    if (id === 39084 || id === 40697) return 10; // Landsat/Sentinel - Resource
    if (id === 27424 || id === 25994) return 14; // Aqua/Terra - Weather
    return 0; // Default to All
}

// ============= EXPRESS ENDPOINTS =============

// 1. Get events with visibility for a location
app.get('/api/events/location', async (req, res) => {
    try {
        const { lat, lon, days = 90 } = req.query;
        
        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }
        
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        
        // Fetch events from SpaceDevs
        const events = await fetchSpaceDevsEvents(50, days);
        
        // Calculate visibility for each event at this location
        const eventsWithVisibility = events.map(event => {
            const visibility = calculateEventVisibility(event, latNum, lonNum);
            
            return {
                ...event,
                visibility: visibility,
                localTime: {
                    eventTime: new Date(event.date).toLocaleString('en-US', { timeZone: 'UTC' }),
                    timezone: 'UTC'
                }
            };
        }).filter(event => event.visibility !== null); // Remove past events
        
        // Sort by date
        eventsWithVisibility.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        res.json({
            location: { lat: latNum, lon: lonNum },
            count: eventsWithVisibility.length,
            events: eventsWithVisibility
        });
        
    } catch (error) {
        console.error('Events location error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Get visibility for a specific event at a location
app.get('/api/events/:eventId/visibility', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { lat, lon } = req.query;
        
        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude and longitude are required' });
        }
        
        // Fetch specific event from SpaceDevs
        const response = await axios.get(`https://ll.thespacedevs.com/2.3.0/events/${eventId}/?format=json`);
        const event = response.data;
        
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        
        // Calculate detailed visibility
        const visibility = calculateEventVisibility(event, latNum, lonNum);
        
        // Add local time conversions
        const eventDate = new Date(event.date);
        
        res.json({
            event: {
                id: event.id,
                name: event.name,
                description: event.description,
                type: event.type,
                location: event.location
            },
            yourLocation: { lat: latNum, lon: lonNum },
            visibility: visibility,
            localTimes: {
                utc: event.date,
                yourLocalTime: eventDate.toLocaleString('en-US', { 
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone 
                })
            }
        });
        
    } catch (error) {
        console.error('Event visibility error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Proxy for SpaceDevs API (with caching)
app.get('/api/spacedevs/*', async (req, res) => {
    try {
        const apiPath = req.params[0];
        const url = `https://ll.thespacedevs.com/2.3.0/${apiPath}?format=json`;
        
        // Add query params
        const queryParams = new URLSearchParams(req.query).toString();
        const fullUrl = queryParams ? `${url}&${queryParams}` : url;
        
        // Check cache
        const cacheKey = `spacedevs-${fullUrl}`;
        if (cache.has(cacheKey)) {
            const { data, timestamp } = cache.get(cacheKey);
            if (Date.now() - timestamp < 30 * 60 * 1000) { // 30 min cache
                return res.json(data);
            }
        }
        
        const response = await axios.get(fullUrl);
        
        // Cache response
        cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
        
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Get event types for filtering
app.get('/api/events/types', async (req, res) => {
    try {
        const response = await axios.get('https://ll.thespacedevs.com/2.3.0/events/types/?format=json');
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============= PROXY FOR OTHER APIS =============

app.get('/api/nasa/*', async (req, res) => {
    try {
        const apiPath = req.params[0];
        const apiKey = process.env.NASA_API_KEY || 'DEMO_KEY';
        
        let url = `https://api.nasa.gov/${apiPath}`;
        const separator = url.includes('?') ? '&' : '?';
        url += `${separator}api_key=${apiKey}`;
        
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/weather', async (req, res) => {
    try {
        const { lat, lon, city } = req.query;
        const apiKey = process.env.WEATHER_API_KEY;
        
        if (!apiKey) {
            return res.status(400).json({ error: 'Weather API key not configured' });
        }
        
        let url;
        if (lat && lon) {
            url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
        } else if (city) {
            url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
        } else {
            return res.status(400).json({ error: 'Either lat/lon or city required' });
        }
        
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/iss', async (req, res) => {
    try {
        const response = await axios.get('http://api.open-notify.org/iss-now.json');
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PASTE THIS AT THE END OF YOUR proxyServer.js (before app.listen())
// Add this section after line 715, before the app.listen() call

// ============= NASA FIRMS FIRE DATA PROXY =============

app.get('/api/firms/active-fires', async (req, res) => {
    try {
        const { source = 'MODIS_NRT', area = 'world', days = 1 } = req.query;
        
        // Get NASA FIRMS API key from environment
        const firmsKey = process.env.NASA_FIRMS_KEY;
        
        if (!firmsKey) {
            console.warn('NASA FIRMS API key not configured, using mock data');
            return res.json(getMockFireData());
        }
        
        // Cache key
        const cacheKey = `firms-${source}-${area}-${days}`;
        
        // Check cache (FIRMS updates every 3 hours)
        if (cache.has(cacheKey)) {
            const { data, timestamp } = cache.get(cacheKey);
            if (Date.now() - timestamp < 3 * 60 * 60 * 1000) { // 3 hour cache
                console.log(`[Cache] FIRMS data served from cache`);
                return res.json(data);
            }
        }
        
        // Build FIRMS API URL
        // Format: https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{source}/{area}/{dayrange}
        const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${firmsKey}/${source}/${area}/${days}`;
        
        console.log(`[FIRMS] Fetching fire data: ${source}, ${area}, ${days} days`);
        
        const response = await axios.get(url, {
            timeout: 30000,
            headers: {
                'Accept': 'text/csv',
                'User-Agent': 'AstroView/1.0'
            }
        });
        
        // Parse CSV response
        const csvData = response.data;
        const fires = parseCSV(csvData);
        
        // Process and aggregate data
        const firesByCountry = {};
        const firesByConfidence = { low: 0, nominal: 0, high: 0 };
        const firesByType = {};
        
        fires.forEach(fire => {
            // Country aggregation
            const country = fire.country || 'Unknown';
            firesByCountry[country] = (firesByCountry[country] || 0) + 1;
            
            // Confidence aggregation
            const confidence = parseFloat(fire.confidence || 0);
            if (confidence < 50) firesByConfidence.low++;
            else if (confidence < 80) firesByConfidence.nominal++;
            else firesByConfidence.high++;
            
            // Type aggregation (based on brightness)
            const brightness = parseFloat(fire.bright_ti4 || fire.brightness || 0);
            if (brightness > 400) {
                firesByType.intense = (firesByType.intense || 0) + 1;
            } else if (brightness > 350) {
                firesByType.large = (firesByType.large || 0) + 1;
            } else {
                firesByType.moderate = (firesByType.moderate || 0) + 1;
            }
        });
        
        const result = {
            success: true,
            data: {
                total: fires.length,
                byCountry: firesByCountry,
                byConfidence: firesByConfidence,
                byType: firesByType,
                recent: fires.slice(0, 100), // Return 100 most recent
                source: `NASA FIRMS (${source})`,
                lastUpdated: new Date().toISOString(),
                queryParams: { source, area, days }
            }
        };
        
        // Cache the result
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        console.log(`[FIRMS] Successfully fetched ${fires.length} active fires`);
        
        res.json(result);
        
    } catch (error) {
        console.error('FIRMS API error:', error.message);
        
        // Return mock data on error
        res.json(getMockFireData());
    }
});

// Helper function to parse CSV
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const fires = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const fire = {};
        
        headers.forEach((header, index) => {
            fire[header.toLowerCase()] = values[index]?.trim() || '';
        });
        
        fires.push(fire);
    }
    
    return fires;
}

// Mock fire data generator
function getMockFireData() {
    const mockFires = [];
    const countries = [
        { name: 'USA', lat: 37.0, lon: -120.0, count: 245 },
        { name: 'Brazil', lat: -10.0, lon: -55.0, count: 189 },
        { name: 'Canada', lat: 56.0, lon: -106.0, count: 156 },
        { name: 'Russia', lat: 61.0, lon: 105.0, count: 134 },
        { name: 'Australia', lat: -25.0, lon: 133.0, count: 98 },
        { name: 'Indonesia', lat: -2.5, lon: 118.0, count: 76 },
        { name: 'Congo', lat: -4.0, lon: 21.0, count: 65 },
        { name: 'India', lat: 20.0, lon: 77.0, count: 54 }
    ];
    
    countries.forEach(country => {
        for (let i = 0; i < country.count; i++) {
            const latOffset = (Math.random() - 0.5) * 20;
            const lonOffset = (Math.random() - 0.5) * 20;
            
            mockFires.push({
                latitude: (country.lat + latOffset).toFixed(4),
                longitude: (country.lon + lonOffset).toFixed(4),
                brightness: (300 + Math.random() * 150).toFixed(1),
                confidence: (50 + Math.random() * 50).toFixed(0),
                acq_date: new Date().toISOString().split('T')[0],
                acq_time: String(Math.floor(Math.random() * 2400)).padStart(4, '0'),
                country: country.name
            });
        }
    });
    
    const firesByCountry = {};
    countries.forEach(c => firesByCountry[c.name] = c.count);
    
    return {
        success: true,
        data: {
            total: mockFires.length,
            byCountry: firesByCountry,
            byConfidence: { low: 234, nominal: 567, high: 416 },
            byType: { moderate: 489, large: 512, intense: 216 },
            recent: mockFires.slice(0, 100),
            source: 'NASA FIRMS (Mock Data)',
            lastUpdated: new Date().toISOString(),
            queryParams: { source: 'MODIS_NRT', area: 'world', days: 1 }
        }
    };
}

// ============= END FIRMS PROXY =============

app.get('/api/iss-pass', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) {
            return res.status(400).json({ error: 'Latitude and longitude required' });
        }
        
        const response = await axios.get(
            `http://api.open-notify.org/iss-pass.json?lat=${lat}&lon=${lon}&n=5`
        );
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(port, () => {
    console.log(`🚀 AstroView proxy server running at http://localhost:${port}`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, '..')}`);
    console.log(`
Available endpoints:
  GET /api/events/location?lat=XX&lon=YY&days=90
  GET /api/events/:eventId/visibility?lat=XX&lon=YY
  GET /api/spacedevs/*
  GET /api/events/types
  GET /api/iss
  GET /api/iss-pass?lat=XX&lon=YY
  GET /api/weather?lat=XX&lon=YY
  GET /api/nasa/*
    `);
});