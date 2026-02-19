// server/proxyServer.js
// Node.js proxy server with SpaceDevs event visibility calculations
// Run with: node server/proxyServer.js

const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const port = 5000;

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

// ============= NASA FIRMS — ACTIVE FIRE DATA =============
// Proxied server-side to avoid CORS. Cached for 1 hour (fires update every 12h).

app.get('/api/firms', async (req, res) => {
    const NASA_KEY = process.env.NASA_FIRMS_KEY || process.env.NASA_API_KEY || '55826db0684ca327b51401414c32b5f6';
    const { source = 'VIIRS_SNPP_NRT', days = 1 } = req.query;

    // Only allow known safe sources
    const ALLOWED_SOURCES = ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'MODIS_NRT'];
    if (!ALLOWED_SOURCES.includes(source)) {
        return res.status(400).json({ error: 'Invalid source' });
    }

    const cacheKey = `firms-${source}-${days}`;
    if (cache.has(cacheKey)) {
        const { data, timestamp } = cache.get(cacheKey);
        if (Date.now() - timestamp < 60 * 60 * 1000) { // 1 hour cache
            console.log(`[FIRMS] Serving from cache (${source})`);
            return res.type('text/csv').send(data);
        }
    }

    try {
        const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${NASA_KEY}/${source}/world/${days}`;
        console.log(`[FIRMS] Fetching: ${url}`);

        const response = await axios.get(url, {
            timeout: 20000,
            headers: { 'User-Agent': 'AstroView/1.0' }
        });

        // Validate we got CSV back, not an error page
        const text = response.data;
        if (typeof text !== 'string' || !text.includes('latitude')) {
            throw new Error('FIRMS returned unexpected data format');
        }

        cache.set(cacheKey, { data: text, timestamp: Date.now() });
        console.log(`[FIRMS] Success — ${text.split('\n').length - 2} fire detections`);

        res.type('text/csv').send(text);
    } catch (error) {
        console.error('[FIRMS] Fetch failed:', error.message);
        res.status(502).json({
            error: 'FIRMS fetch failed',
            detail: error.message
        });
    }
});

// ============= NASA EONET — ACTIVE NATURAL EVENTS =============
// Wildfires, severe storms, volcanoes, floods, sea/lake ice, dust/haze.
// Public endpoint, no key required. Cached for 30 minutes.

app.get('/api/eonet', async (req, res) => {
    const { days = 30, status = 'open', limit = 100 } = req.query;

    const cacheKey = `eonet-${days}-${status}-${limit}`;
    if (cache.has(cacheKey)) {
        const { data, timestamp } = cache.get(cacheKey);
        if (Date.now() - timestamp < 30 * 60 * 1000) { // 30 min cache
            console.log('[EONET] Serving from cache');
            return res.json(data);
        }
    }

    try {
        const url = `https://eonet.gsfc.nasa.gov/api/v3/events?days=${days}&status=${status}&limit=${limit}`;
        console.log(`[EONET] Fetching: ${url}`);

        const response = await axios.get(url, {
            timeout: 15000,
            headers: { 'User-Agent': 'AstroView/1.0' }
        });

        const events = response.data.events || [];

        // Group by category for easy consumption on the frontend
        const byCategory = {};
        events.forEach(e => {
            const cat = e.categories?.[0]?.title || 'Other';
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push({
                id:         e.id,
                title:      e.title,
                status:     e.status,
                categories: e.categories,
                // Most recent geometry point
                geometry:   e.geometry?.at(-1) ?? null,
                // Full geometry history (for track rendering)
                track:      e.geometry ?? [],
                link:       e.link,
                closed:     e.closed
            });
        });

        const summary = {
            total:      events.length,
            byCategory: Object.fromEntries(
                Object.entries(byCategory).map(([k, v]) => [k, v.length])
            ),
            categories: byCategory,
            fetchedAt:  new Date().toISOString(),
            source:     'NASA EONET v3'
        };

        cache.set(cacheKey, { data: summary, timestamp: Date.now() });
        console.log(`[EONET] Success — ${events.length} active events across ${Object.keys(byCategory).length} categories`);

        res.json(summary);
    } catch (error) {
        console.error('[EONET] Fetch failed:', error.message);
        res.status(502).json({
            error: 'EONET fetch failed',
            detail: error.message
        });
    }
});

// Chatbot
// ================== AI CHATBOT ENDPOINT ==================
app.use(express.json());

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;

        console.log("Incoming message:", message);

        const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
        model: "mistralai/mistral-7b-instruct",
        messages: [
            { role: "user", content: message }
        ]
    },
    {
        headers: {
            "Authorization": "Bearer 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",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "AstroView"
        }
    }
);

const reply = response.data.choices[0].message.content;


        res.json({ reply });

    } catch (err) {
        console.error("FULL ERROR:", err.response?.data || err.message);
        res.status(500).json({ error: "Chat failed" });
    }
});




// ============= NASA EONET — SINGLE CATEGORY =============
// Convenience route: /api/eonet/wildfires  /api/eonet/severeStorms  etc.

app.get('/api/eonet/:category', async (req, res) => {
    // EONET category IDs
    const CATEGORY_IDS = {
        wildfires:      8,
        severeStorms:   10,
        volcanoes:      12,
        floods:         9,
        seaLakeIce:     15,
        earthquakes:    16,
        drought:        17,
        dustHaze:       7,
        landslides:     14,
        snow:           13,
    };

    const catKey = req.params.category;
    const catId  = CATEGORY_IDS[catKey];

    if (!catId) {
        return res.status(400).json({
            error: `Unknown category. Valid: ${Object.keys(CATEGORY_IDS).join(', ')}`
        });
    }

    const { days = 30, status = 'open' } = req.query;
    const cacheKey = `eonet-cat-${catId}-${days}-${status}`;

    if (cache.has(cacheKey)) {
        const { data, timestamp } = cache.get(cacheKey);
        if (Date.now() - timestamp < 30 * 60 * 1000) {
            return res.json(data);
        }
    }

    try {
        const url = `https://eonet.gsfc.nasa.gov/api/v3/categories/${catId}?days=${days}&status=${status}`;
        const response = await axios.get(url, { timeout: 15000 });

        const events = (response.data.events || []).map(e => ({
            id:         e.id,
            title:      e.title,
            status:     e.status,
            categories: e.categories,
            geometry:   e.geometry?.at(-1) ?? null,
            track:      e.geometry ?? [],
            link:       e.link,
            closed:     e.closed
        }));

        const result = { category: catKey, count: events.length, events, source: 'NASA EONET v3' };
        cache.set(cacheKey, { data: result, timestamp: Date.now() });

        res.json(result);
    } catch (error) {
        res.status(502).json({ error: 'EONET category fetch failed', detail: error.message });
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

  NEW — Earth Impact:
  GET /api/firms?source=VIIRS_SNPP_NRT&days=1   (NASA active fires CSV)
  GET /api/eonet?days=30&status=open             (NASA natural events, all categories)
  GET /api/eonet/wildfires                        (just wildfires)
  GET /api/eonet/severeStorms                     (just storms)
  GET /api/eonet/volcanoes                        (just volcanoes)
    `);
});