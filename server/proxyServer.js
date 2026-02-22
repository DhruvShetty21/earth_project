// server/proxyServer.js
// Node.js proxy server with SpaceDevs event visibility calculations
// Run with: node server/proxyServer.js
require('dotenv').config();

const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '..')));
app.use(express.json()); // ← must come before route definitions

// Cache for API responses
const cache = new Map();


const nodemailer = require('nodemailer');
const cron = require('node-cron');

require('dotenv').config();

let reminders = [];

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
// ============= ASTRONOMICAL CALCULATION FUNCTIONS =============

function degToRad(deg) { return deg * Math.PI / 180; }
function radToDeg(rad) { return rad * 180 / Math.PI; }

function julianDate(date = new Date()) {
    return date.getTime() / 86400000 + 2440587.5;
}

function gmst(date = new Date()) {
    const jd = julianDate(date);
    const d = jd - 2451545.0;
    const t = d / 36525.0;
    let theta = 280.46061837 + 360.98564736629 * d + 0.000387933 * t * t - t * t * t / 38710000;
    theta = theta % 360;
    if (theta < 0) theta += 360;
    return theta;
}

function lst(lon, date = new Date()) {
    const gst = gmst(date);
    let l = gst + lon;
    l = l % 360;
    if (l < 0) l += 360;
    return l;
}

function calculateAltitude(dec, ra, lat, lon, date = new Date()) {
    const lstDeg = lst(lon, date);
    const ha = (lstDeg - ra * 15) * Math.PI / 180;
    const decRad = degToRad(dec);
    const latRad = degToRad(lat);
    const alt = Math.asin(
        Math.sin(latRad) * Math.sin(decRad) +
        Math.cos(latRad) * Math.cos(decRad) * Math.cos(ha)
    );
    return radToDeg(alt);
}

function isAboveHorizon(dec, ra, lat, lon, date = new Date()) {
    return calculateAltitude(dec, ra, lat, lon, date) > 0;
}

function findNextRiseTime(dec, ra, lat, lon, startDate = new Date()) {
    const maxIterations = 48;
    const hourMs = 60 * 60 * 1000;
    for (let i = 0; i < maxIterations; i++) {
        const checkDate = new Date(startDate.getTime() + i * hourMs);
        const alt = calculateAltitude(dec, ra, lat, lon, checkDate);
        const nextAlt = calculateAltitude(dec, ra, lat, lon, new Date(checkDate.getTime() + hourMs));
        if (alt <= 0 && nextAlt > 0) {
            const fraction = (0 - alt) / (nextAlt - alt);
            return new Date(checkDate.getTime() + fraction * hourMs);
        }
    }
    return null;
}

function findNextSetTime(dec, ra, lat, lon, startDate = new Date()) {
    const maxIterations = 48;
    const hourMs = 60 * 60 * 1000;
    for (let i = 0; i < maxIterations; i++) {
        const checkDate = new Date(startDate.getTime() + i * hourMs);
        const alt = calculateAltitude(dec, ra, lat, lon, checkDate);
        const nextAlt = calculateAltitude(dec, ra, lat, lon, new Date(checkDate.getTime() + hourMs));
        if (alt > 0 && nextAlt <= 0) {
            const fraction = alt / (alt - nextAlt);
            return new Date(checkDate.getTime() + fraction * hourMs);
        }
    }
    return null;
}

function calculateEventVisibility(event, lat, lon) {
    const eventDate = new Date(event.date);
    const now = new Date();
    if (eventDate < now) return null;

    if (event.location && event.location.includes('ISS')) {
        return {
            isVisible: true,
            visibilityWindows: [{
                start: new Date(eventDate.getTime() - 2 * 60 * 60 * 1000),
                end: new Date(eventDate.getTime() + 2 * 60 * 60 * 1000),
                type: 'approximate',
                description: 'Visible if ISS passes over your location during this window'
            }],
            bestViewing: 'Check Heavens-Above app for precise ISS pass times'
        };
    }

    let ra, dec;
    const eventType = event.type?.name?.toLowerCase() || '';

    if (eventType.includes('eclipse')) {
        return {
            isVisible: Math.abs(lat) < 60,
            visibilityWindows: [{
                start: new Date(eventDate.getTime() - 30 * 60 * 1000),
                end: new Date(eventDate.getTime() + 30 * 60 * 1000),
                type: 'event time'
            }],
            bestViewing: 'Check local eclipse timings for exact visibility'
        };
    }

    if (eventType.includes('meteor')) {
        const month = eventDate.getMonth();
        if (month === 7) { ra = 3.08; dec = 58; }
        else if (month === 11) { ra = 7.5; dec = 32; }
        else if (month === 3) { ra = 18.08; dec = 34; }
        else {
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

function calculateMaxAltitude(dec, ra, lat, lon, start, end) {
    let maxAlt = -90;
    let maxAltTime = start;
    const checkInterval = 10 * 60 * 1000;
    for (let t = start.getTime(); t < end.getTime(); t += checkInterval) {
        const alt = calculateAltitude(dec, ra, lat, lon, new Date(t));
        if (alt > maxAlt) { maxAlt = alt; maxAltTime = new Date(t); }
    }
    return { altitude: Math.round(maxAlt * 10) / 10, time: maxAltTime };
}

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ============= SPACEDEVS API INTEGRATION =============

async function fetchSpaceDevsEvents(limit = 50, daysAhead = 90) {
    const cacheKey = `spacedevs-events-${limit}-${daysAhead}`;
    if (cache.has(cacheKey)) {
        const { data, timestamp } = cache.get(cacheKey);
        if (Date.now() - timestamp < 60 * 60 * 1000) return data;
    }
    try {
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const response = await axios.get(
            `https://ll.thespacedevs.com/2.3.0/events/?limit=${limit}&date__gte=${startDate}&date__lte=${endDate}&format=json`
        );
        const events = response.data.results || [];
        cache.set(cacheKey, { data: events, timestamp: Date.now() });
        return events;
    } catch (error) {
        console.error('SpaceDevs API error:', error.message);
        return [];
    }
}

// ============= EXPRESS ENDPOINTS =============

app.get('/api/n2yo/above', async (req, res) => {
    try {
        const { lat, lon, radius = 70, category = 0 } = req.query;
        const apiKey = process.env.N2YO_API_KEY;
        if (!apiKey) return res.status(400).json({ error: 'N2YO API key not configured' });
        const url = `https://api.n2yo.com/rest/v1/satellite/above/${lat}/${lon}/0/${radius}/${category}?apiKey=${apiKey}`;
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error("N2YO ABOVE ERROR:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/events/location', async (req, res) => {
    try {
        const { lat, lon, days = 90 } = req.query;
        if (!lat || !lon) return res.status(400).json({ error: 'Latitude and longitude are required' });
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        const events = await fetchSpaceDevsEvents(50, days);
        const eventsWithVisibility = events.map(event => {
            const visibility = calculateEventVisibility(event, latNum, lonNum);
            return { ...event, visibility, localTime: { eventTime: new Date(event.date).toLocaleString('en-US', { timeZone: 'UTC' }), timezone: 'UTC' } };
        }).filter(event => event.visibility !== null);
        eventsWithVisibility.sort((a, b) => new Date(a.date) - new Date(b.date));
        res.json({ location: { lat: latNum, lon: lonNum }, count: eventsWithVisibility.length, events: eventsWithVisibility });
    } catch (error) {
        console.error('Events location error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/events/:eventId/visibility', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { lat, lon } = req.query;
        if (!lat || !lon) return res.status(400).json({ error: 'Latitude and longitude are required' });
        const response = await axios.get(`https://ll.thespacedevs.com/2.3.0/events/${eventId}/?format=json`);
        const event = response.data;
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        const visibility = calculateEventVisibility(event, latNum, lonNum);
        const eventDate = new Date(event.date);
        res.json({
            event: { id: event.id, name: event.name, description: event.description, type: event.type, location: event.location },
            yourLocation: { lat: latNum, lon: lonNum },
            visibility,
            localTimes: { utc: event.date, yourLocalTime: eventDate.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }) }
        });
    } catch (error) {
        console.error('Event visibility error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/spacedevs/*', async (req, res) => {
    try {
        const apiPath = req.params[0];
        const url = `https://ll.thespacedevs.com/2.3.0/${apiPath}?format=json`;
        const queryParams = new URLSearchParams(req.query).toString();
        const fullUrl = queryParams ? `${url}&${queryParams}` : url;
        const cacheKey = `spacedevs-${fullUrl}`;
        if (cache.has(cacheKey)) {
            const { data, timestamp } = cache.get(cacheKey);
            if (Date.now() - timestamp < 30 * 60 * 1000) return res.json(data);
        }
        const response = await axios.get(fullUrl);
        cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/events/types', async (req, res) => {
    try {
        const response = await axios.get('https://ll.thespacedevs.com/2.3.0/events/types/?format=json');
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/nasa/*', async (req, res) => {
    try {
        const apiPath = req.params[0];
        const apiKey = process.env.NASA_API_KEY;
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
        if (!apiKey) return res.status(400).json({ error: 'Weather API key not configured' });
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
        const apiKey = process.env.N2YO_API_KEY;
        if (!lat || !lon) return res.status(400).json({ error: 'Latitude and longitude required' });
        if (!apiKey) return res.status(400).json({ error: 'N2YO API key not configured' });
        const url = `https://api.n2yo.com/rest/v1/satellite/visualpasses/25544/${lat}/${lon}/0/3/10?apiKey=${apiKey}`;
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error("ISS PASS ERROR:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/firms', async (req, res) => {
    const NASA_KEY = process.env.NASA_FIRMS_KEY || process.env.NASA_API_KEY;
    const { source = 'VIIRS_SNPP_NRT', days = 1 } = req.query;
    const ALLOWED_SOURCES = ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'MODIS_NRT'];
    if (!ALLOWED_SOURCES.includes(source)) return res.status(400).json({ error: 'Invalid source' });
    const cacheKey = `firms-${source}-${days}`;
    if (cache.has(cacheKey)) {
        const { data, timestamp } = cache.get(cacheKey);
        if (Date.now() - timestamp < 60 * 60 * 1000) return res.type('text/csv').send(data);
    }
    try {
        const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${NASA_KEY}/${source}/world/${days}`;
        const response = await axios.get(url, { timeout: 20000, headers: { 'User-Agent': 'AstroView/1.0' } });
        const text = response.data;
        if (typeof text !== 'string' || !text.includes('latitude')) throw new Error('FIRMS returned unexpected data format');
        cache.set(cacheKey, { data: text, timestamp: Date.now() });
        res.type('text/csv').send(text);
    } catch (error) {
        console.error('[FIRMS] Fetch failed:', error.message);
        res.status(502).json({ error: 'FIRMS fetch failed', detail: error.message });
    }
});

app.get('/api/eonet', async (req, res) => {
    const { days = 30, status = 'open', limit = 100 } = req.query;
    const cacheKey = `eonet-${days}-${status}-${limit}`;
    if (cache.has(cacheKey)) {
        const { data, timestamp } = cache.get(cacheKey);
        if (Date.now() - timestamp < 30 * 60 * 1000) return res.json(data);
    }
    try {
        const url = `https://eonet.gsfc.nasa.gov/api/v3/events?days=${days}&status=${status}&limit=${limit}`;
        const response = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'AstroView/1.0' } });
        const events = response.data.events || [];
        const byCategory = {};
        events.forEach(e => {
            const cat = e.categories?.[0]?.title || 'Other';
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push({ id: e.id, title: e.title, status: e.status, categories: e.categories, geometry: e.geometry?.at(-1) ?? null, track: e.geometry ?? [], link: e.link, closed: e.closed });
        });
        const summary = { total: events.length, byCategory: Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, v.length])), categories: byCategory, fetchedAt: new Date().toISOString(), source: 'NASA EONET v3' };
        cache.set(cacheKey, { data: summary, timestamp: Date.now() });
        res.json(summary);
    } catch (error) {
        console.error('[EONET] Fetch failed:', error.message);
        res.status(502).json({ error: 'EONET fetch failed', detail: error.message });
    }
});

app.get('/api/moon-phase', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        const apiKey = process.env.WEATHERAPI_KEY;

        if (!lat || !lon)
            return res.status(400).json({ error: 'Latitude and longitude required' });

        const url = `https://api.weatherapi.com/v1/astronomy.json?key=${apiKey}&q=${lat},${lon}`;

        const response = await axios.get(url);
        res.json(response.data);

    } catch (error) {
        console.error('Moon phase error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "mistralai/mistral-7b-instruct",
                messages: [
                    {
                        role: "system",
                        content: `You are AstroBot, an expert space assistant embedded in AstroView — a real-time space intelligence dashboard. Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Answer questions about planets, ISS, asteroids, space weather, launches, and astronomy. Be concise and engaging.`
                    },
                    { role: "user", content: message }
                ]
            },
            {
                headers: {
                    "Authorization": "Bearer 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",
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "AstroView"
                }
            }
        );
        res.json({ reply: response.data.choices[0].message.content });
    } catch (err) {
        console.error("FULL ERROR:", err.response?.data || err.message);
        res.status(500).json({ error: "Chat failed" });
    }
});

app.get('/api/n2yo/visual-passes', async (req, res) => {
    try {
        const { id, lat, lon, days = 7, min_elevation = 10 } = req.query;
        const apiKey = process.env.N2YO_API_KEY;
        if (!apiKey) return res.status(400).json({ error: 'N2YO API key not configured' });
        const url = `https://api.n2yo.com/rest/v1/satellite/visualpasses/${id}/${lat}/${lon}/0/${days}/${min_elevation}?apiKey=${apiKey}`;
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/eonet/:category', async (req, res) => {
    const CATEGORY_IDS = { wildfires: 8, severeStorms: 10, volcanoes: 12, floods: 9, seaLakeIce: 15, earthquakes: 16, drought: 17, dustHaze: 7, landslides: 14, snow: 13 };
    const catKey = req.params.category;
    const catId = CATEGORY_IDS[catKey];
    if (!catId) return res.status(400).json({ error: `Unknown category. Valid: ${Object.keys(CATEGORY_IDS).join(', ')}` });
    const { days = 30, status = 'open' } = req.query;
    const cacheKey = `eonet-cat-${catId}-${days}-${status}`;
    if (cache.has(cacheKey)) {
        const { data, timestamp } = cache.get(cacheKey);
        if (Date.now() - timestamp < 30 * 60 * 1000) return res.json(data);
    }
    try {
        const url = `https://eonet.gsfc.nasa.gov/api/v3/categories/${catId}?days=${days}&status=${status}`;
        const response = await axios.get(url, { timeout: 15000 });
        const events = (response.data.events || []).map(e => ({ id: e.id, title: e.title, status: e.status, categories: e.categories, geometry: e.geometry?.at(-1) ?? null, track: e.geometry ?? [], link: e.link, closed: e.closed }));
        const result = { category: catKey, count: events.length, events, source: 'NASA EONET v3' };
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        res.json(result);
    } catch (error) {
        res.status(502).json({ error: 'EONET category fetch failed', detail: error.message });
    }
});

app.get('/api/geocode/reverse', async (req, res) => {
    const { lat, lon } = req.query;
    try {
        const response = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            { headers: { 'User-Agent': 'AstroView/1.0', 'Accept-Language': 'en' } }
        );
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/space-weather/location', async (req, res) => {
    const { lat } = req.query;
    const NASA_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';
    try {
        const end = new Date();
        const start = new Date(Date.now() - 7 * 86400000);
        const fmt = d => d.toISOString().slice(0, 10);
        let cmeData = [];
        try {
            const cmeRes = await axios.get(`https://api.nasa.gov/DONKI/CME?startDate=${fmt(start)}&endDate=${fmt(end)}&api_key=${NASA_KEY}`);
            cmeData = Array.isArray(cmeRes.data) ? cmeRes.data : [];
        } catch (_) {}
        const absLat = Math.abs(parseFloat(lat));
        const auroraProb = absLat > 60 ? 'High' : absLat > 45 ? 'Moderate' : absLat > 30 ? 'Low' : 'Very Low';
        const auroraColor = absLat > 60 ? '#00ff88' : absLat > 45 ? '#ffd700' : '#ff6b6b';
        res.json({
            aurora: { probability: auroraProb, color: auroraColor, latitude: absLat },
            cme_activity: { count: cmeData.length, events: cmeData.slice(0, 3) },
            summary: cmeData.length > 0
                ? `${cmeData.length} CME event(s) detected this week. Aurora chance: ${auroraProb}.`
                : `Space weather calm. Aurora chance from your latitude: ${auroraProb}.`
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/impact/risk', async (req, res) => {
    const NASA_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';
    try {
        const end = new Date();
        const start = new Date(Date.now() - 7 * 86400000);
        const fmt = d => d.toISOString().slice(0, 10);
        let hazardousCount = 0;
        try {
            const neoRes = await axios.get(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${fmt(start)}&end_date=${fmt(end)}&api_key=${NASA_KEY}`);
            if (neoRes.data?.near_earth_objects) {
                Object.values(neoRes.data.near_earth_objects).forEach(day => {
                    hazardousCount += day.filter(a => a.is_potentially_hazardous_asteroid).length;
                });
            }
        } catch (_) {}
        res.json({ hazardous_count: hazardousCount, location_risk: null });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// ▶▶▶  SHARE FEATURE — EMAIL & SMS  ◀◀◀
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a clean plain-text version of location intel for SMS (short).
 */
function buildSMSMessage(payload) {
    const { location, sections } = payload;
    const lines = [`🌌 AstroView — ${location}`, ''];

    if (sections.sky) {
        lines.push(`🌌 Sky Tonight: ${sections.sky.label} (${sections.sky.score}/100)`);
        if (sections.sky.weather) lines.push(`   ${sections.sky.weather}`);
        if (sections.sky.moon)    lines.push(`   🌙 ${sections.sky.moon}`);
        lines.push('');
    }

    if (sections.iss) {
        lines.push(`🛸 ISS Pass: ${sections.iss}`);
        lines.push('');
    }

    if (sections.events && sections.events.length > 0) {
        lines.push('🚀 Upcoming Events:');
        sections.events.slice(0, 3).forEach(e => lines.push(`   • ${e}`));
        lines.push('');
    }

    if (sections.satellites && sections.satellites.length > 0) {
        lines.push('🛰️ Satellite Passes:');
        sections.satellites.slice(0, 2).forEach(s => lines.push(`   • ${s}`));
        lines.push('');
    }

    if (sections.launches && sections.launches.length > 0) {
        lines.push('🚀 Nearby Launches:');
        sections.launches.slice(0, 2).forEach(l => lines.push(`   • ${l}`));
        lines.push('');
    }

    if (sections.neo) {
        lines.push(`☄️ NEO Watch: ${sections.neo}`);
        lines.push('');
    }

    lines.push('Powered by AstroView · astroview.app');
    return lines.join('\n');
}

/**
 * Build a rich HTML email version.
 */
function buildEmailHTML(payload) {
    const { location, coords, sections, generatedAt } = payload;

    const sectionHTML = (icon, title, content) => `
        <div style="margin-bottom:24px;background:#0d1a2e;border-radius:12px;overflow:hidden;border:1px solid #1e3a5f;">
            <div style="background:linear-gradient(135deg,#0f2744,#0a1e38);padding:12px 18px;border-bottom:1px solid #1e3a5f;display:flex;align-items:center;gap:8px;">
                <span style="font-size:1.1rem;">${icon}</span>
                <span style="color:#7ab8ff;font-size:0.8rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">${title}</span>
            </div>
            <div style="padding:16px 18px;color:#c8d8f0;font-size:0.88rem;line-height:1.65;">
                ${content}
            </div>
        </div>`;

    let sectionsHTML = '';

    // Sky Tonight
    if (sections.sky) {
        const scoreColor = sections.sky.score > 70 ? '#00ff88' : sections.sky.score > 45 ? '#ffd700' : '#ff4455';
        const skyContent = `
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;">
                <div style="font-size:2.5rem;font-weight:700;color:${scoreColor};">${sections.sky.score}<span style="font-size:1rem;color:#4a6080;">/100</span></div>
                <div>
                    <div style="color:${scoreColor};font-weight:600;margin-bottom:4px;">${sections.sky.label} viewing conditions</div>
                    ${sections.sky.weather ? `<div style="color:#8899aa;font-size:0.8rem;">${sections.sky.weather}</div>` : ''}
                </div>
            </div>
            ${sections.sky.message ? `<div style="background:#071520;border-left:3px solid #1e4080;padding:10px 14px;border-radius:6px;color:#8aabcc;">${sections.sky.message}</div>` : ''}
            ${sections.sky.moon ? `<div style="margin-top:10px;color:#9ab8d8;">🌙 ${sections.sky.moon}</div>` : ''}
            ${sections.sky.nightHours ? `<div style="margin-top:8px;color:#7a9ab8;">🌃 ${sections.sky.nightHours} hours of darkness tonight</div>` : ''}`;
        sectionsHTML += sectionHTML('🌌', 'Sky Tonight', skyContent);
    }

    // ISS Pass
    if (sections.iss) {
        sectionsHTML += sectionHTML('🛸', 'ISS Pass', `<div style="color:#00ff88;font-weight:500;">${sections.iss}</div><div style="margin-top:8px;color:#5a7a9a;font-size:0.8rem;">The ISS is the 3rd brightest object in the sky — moves fast, no blinking.</div>`);
    }

    // Events
    if (sections.events && sections.events.length > 0) {
        const evHTML = sections.events.map(e => `
            <div style="padding:10px 12px;background:#071a30;border-radius:8px;margin-bottom:8px;border-left:3px solid #3a6faa;">
                ${e}
            </div>`).join('');
        sectionsHTML += sectionHTML('🚀', 'Events Visible From Here', evHTML);
    }

    // Satellites
    if (sections.satellites && sections.satellites.length > 0) {
        const satHTML = sections.satellites.map(s => `
            <div style="padding:10px 12px;background:#071a30;border-radius:8px;margin-bottom:8px;border-left:3px solid #4a9aaa;">
                ${s}
            </div>`).join('');
        sectionsHTML += sectionHTML('🛰️', 'Upcoming Satellite Passes', satHTML);
    }

    // Launches
    if (sections.launches && sections.launches.length > 0) {
        const launchHTML = sections.launches.map(l => `
            <div style="padding:10px 12px;background:#071a30;border-radius:8px;margin-bottom:8px;border-left:3px solid #f97316;">
                ${l}
            </div>`).join('');
        sectionsHTML += sectionHTML('🚀', 'Launches Near You', launchHTML);
    }

    // Space Weather
    if (sections.spaceWeather) {
        sectionsHTML += sectionHTML('☀️', 'Space Weather', `<div style="color:#ffd700;">${sections.spaceWeather}</div>`);
    }

    // NEO
    if (sections.neo) {
        sectionsHTML += sectionHTML('☄️', 'NEO Watch', `<div style="color:#ff8855;">${sections.neo}</div>`);
    }

    // Nearby Disaster
    if (sections.disaster) {
        sectionsHTML += sectionHTML('⚠️', 'Space-Earth Connection', `<div style="color:#ff6655;">${sections.disaster}</div>`);
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AstroView — ${location} Intel Report</title>
</head>
<body style="margin:0;padding:0;background:#04080f;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:620px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0a1628,#060e1e);border:1px solid #1a3a6e;border-radius:16px;padding:28px 24px;margin-bottom:20px;text-align:center;">
        <div style="font-size:2rem;margin-bottom:8px;">🌌</div>
        <div style="font-size:1.5rem;font-weight:700;color:#ffffff;margin-bottom:4px;">AstroView Location Intel</div>
        <div style="font-size:1rem;color:#7ab8ff;margin-bottom:4px;">${location}</div>
        <div style="font-size:0.75rem;color:#3a5a80;">${coords}</div>
        <div style="margin-top:12px;font-size:0.7rem;color:#2a4060;border-top:1px solid #0f2040;padding-top:10px;">
            Report generated ${generatedAt} · Data: NASA EONET · SpaceDevs · N2YO · OpenWeather
        </div>
    </div>

    <!-- Sections -->
    ${sectionsHTML}

    <!-- Footer -->
    <div style="text-align:center;padding:16px;color:#2a4060;font-size:0.7rem;">
        <div style="margin-bottom:4px;">Powered by <strong style="color:#4a7aaa;">AstroView</strong></div>
        <div>NASA · SpaceDevs · Open-Notify · OpenWeather · N2YO</div>
        <div style="margin-top:8px;color:#1a3050;">This report was generated automatically from your AstroView session.</div>
    </div>
</div>
</body>
</html>`;
}

// ── POST /api/share/email ─────────────────────────────────────────────────
app.post('/api/share/email', async (req, res) => {
    const { to, payload } = req.body;

    if (!to || !payload) {
        return res.status(400).json({ error: 'Missing required fields: to, payload' });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return res.status(400).json({ error: 'Invalid email address' });
    }

    // Check if nodemailer is available
    let nodemailer;
    try {
        nodemailer = require('nodemailer');
    } catch {
        return res.status(500).json({ error: 'nodemailer not installed. Run: npm install nodemailer' });
    }

    // Check env vars
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailFrom = process.env.EMAIL_FROM || emailUser;

    if (!emailUser || !emailPass) {
        return res.status(500).json({ error: 'Email not configured. Add EMAIL_USER and EMAIL_PASS to .env' });
    }

    try {
        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: { user: emailUser, pass: emailPass },
        });

        const htmlBody = buildEmailHTML(payload);
        const textBody = buildSMSMessage(payload); // plain text fallback

        await transporter.sendMail({
            from: `"AstroView 🌌" <${emailFrom}>`,
            to,
            subject: `🌌 AstroView Location Intel — ${payload.location}`,
            text: textBody,
            html: htmlBody,
        });

        console.log(`[Share] Email sent to ${to} for location: ${payload.location}`);
        res.json({ success: true, message: `Intel report sent to ${to}` });

    } catch (err) {
        console.error('[Share] Email error:', err.message);
        res.status(500).json({ error: 'Failed to send email', detail: err.message });
    }
});

// ── POST /api/share/sms ───────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════

// Start server
app.listen(port, () => {
    console.log(`🚀 AstroView proxy server running at http://localhost:${port}`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, '..')}`);
    console.log(`
Available endpoints:
  GET  /api/events/location?lat=XX&lon=YY&days=90
  GET  /api/events/:eventId/visibility?lat=XX&lon=YY
  GET  /api/spacedevs/*
  GET  /api/events/types
  GET  /api/iss
  GET  /api/iss-pass?lat=XX&lon=YY
  GET  /api/weather?lat=XX&lon=YY
  GET  /api/nasa/*
  GET  /api/firms
  GET  /api/eonet
  GET  /api/geocode/reverse
  GET  /api/space-weather/location
  GET  /api/impact/risk

  POST /api/share/email   { to, payload }
  POST /api/share/sms     { to, payload }
    `);
});