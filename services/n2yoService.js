// services/n2yoService.js
// N2YO API service for satellite tracking
// FIX: getSatellitesAbove and getVisualPasses call the proxy (/api/n2yo/*)
//      The proxy already appends the N2YO_API_KEY from .env — no key needed client-side.
//      FIX: Added proper null checks and improved error handling throughout.

const N2YOService = (() => {

    const POPULAR_SATELLITES = {
        25544: { name: 'ISS (Zarya)',            category: 'Human Spaceflight', icon: '🛸', color: '#ffd060' },
        20580: { name: 'Hubble Space Telescope', category: 'Telescope',         icon: '🔭', color: '#9966ff' },
        48274: { name: 'Tiangong Space Station', category: 'Human Spaceflight', icon: '🇨🇳', color: '#ff3333' },
        43013: { name: 'NOAA-20',                category: 'Weather',           icon: '🌦️', color: '#4fa3e0' },
        41866: { name: 'GOES-16',                category: 'Weather',           icon: '🌪️', color: '#00d4ff' },
        33591: { name: 'Terra',                  category: 'Earth Observation', icon: '🌍', color: '#22c55e' },
        27424: { name: 'Aqua',                   category: 'Earth Observation', icon: '💧', color: '#3b82f6' },
        39084: { name: 'Landsat-8',              category: 'Earth Observation', icon: '🛰️', color: '#10b981' },
        40697: { name: 'Sentinel-2A',            category: 'Earth Observation', icon: '🌎', color: '#06b6d4' },
        44713: { name: 'Starlink-1000',          category: 'Communications',    icon: '📡', color: '#94a3b8' },
        41918: { name: 'Iridium NEXT',           category: 'Communications',    icon: '📞', color: '#ec4899' },
        24876: { name: 'GPS BIIF-2',             category: 'Navigation',        icon: '📍', color: '#4ade80' },
        25994: { name: 'TerraSAR-X',             category: 'Radar',             icon: '📡', color: '#a855f7' },
        36411: { name: 'Swift Observatory',      category: 'Astrophysics',      icon: '🌠', color: '#f59e0b' },
        29155: { name: 'CALIPSO',                category: 'Climate',           icon: '☁️', color: '#60a5fa' },
        32789: { name: 'Jason-2',                category: 'Oceanography',      icon: '🌊', color: '#3b82f6' },
    };

    /**
     * Get satellites currently above a location.
     * FIX: Proxy appends N2YO_API_KEY — no key needed here.
     * Returns null (not throws) on failure so callers can handle gracefully.
     */
    async function getSatellitesAbove(lat, lon, radius = 70, category = 0) {
        try {
            const r = await fetch(`/api/n2yo/above?lat=${lat}&lon=${lon}&radius=${radius}&category=${category}`);
            if (!r.ok) {
                console.warn(`[N2YO] getSatellitesAbove failed: HTTP ${r.status}`);
                return null;
            }
            const data = await r.json();
            if (data.error) {
                console.warn('[N2YO] getSatellitesAbove error:', data.error);
                return null;
            }
            console.log(`[N2YO] ${data.above?.length || 0} satellites above location`);
            return data;
        } catch (err) {
            console.warn('[N2YO] getSatellitesAbove exception:', err.message);
            return null;
        }
    }

    /**
     * Get visual passes for a satellite.
     * FIX: Returns { info, passes: [] } on any failure — never throws.
     *      Callers (.length checks) are safe even when N2YO key is missing.
     */
    async function getVisualPasses(satId, lat, lon, days = 7, minElevation = 10) {
        try {
            const r = await fetch(`/api/n2yo/visual-passes?id=${satId}&lat=${lat}&lon=${lon}&days=${days}&min_elevation=${minElevation}`);
            if (!r.ok) {
                console.warn(`[N2YO] visualPasses HTTP ${r.status} for sat ${satId}`);
                return { info: null, passes: [] };
            }
            const data = await r.json();

            // N2YO returns { info, passes } or just { info } when no passes
            if (!data.passes || data.passes.length === 0) {
                return { info: data.info || null, passes: [] };
            }

            // Enrich with satellite info from our local DB if N2YO doesn't include it
            if (data.info && !data.info.satname && POPULAR_SATELLITES[satId]) {
                data.info.satname = POPULAR_SATELLITES[satId].name;
            }

            console.log(`[N2YO] ${data.passes.length} passes for ${data.info?.satname || satId}`);
            return data;
        } catch (err) {
            console.warn(`[N2YO] getVisualPasses exception for ${satId}:`, err.message);
            return { info: null, passes: [] };
        }
    }

    /**
     * Returns the curated popular satellite list.
     */
    async function getPopularSatellites() {
        return Object.entries(POPULAR_SATELLITES).map(([id, data]) => ({
            id:       parseInt(id),
            name:     data.name,
            category: data.category,
            icon:     data.icon,
            color:    data.color,
        }));
    }

    /** Format a UNIX timestamp as a readable pass time. */
    function formatPassTime(timestamp) {
        return new Date(timestamp * 1000).toLocaleString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    }

    /**
     * Score a pass 0–100 based on elevation, duration, and magnitude.
     * Higher = better viewing opportunity.
     */
    function calculatePassScore(pass) {
        if (!pass) return 0;
        let score = 0;

        // Elevation (how high in sky)
        const el = pass.maxEl || 0;
        if (el > 80)      score += 40;
        else if (el > 60) score += 30;
        else if (el > 40) score += 20;
        else if (el > 20) score += 10;

        // Duration
        const dur = (pass.endUTC || 0) - (pass.startUTC || 0);
        if (dur > 600)      score += 30;
        else if (dur > 300) score += 20;
        else if (dur > 120) score += 10;

        // Brightness (lower magnitude = brighter)
        const mag = pass.mag;
        if (mag !== undefined && mag !== null) {
            if (mag < 0)      score += 30;
            else if (mag < 2) score += 20;
            else if (mag < 4) score += 10;
        }

        return Math.min(100, Math.max(0, score));
    }

    return {
        getSatellitesAbove,
        getVisualPasses,
        getPopularSatellites,
        formatPassTime,
        calculatePassScore,
        POPULAR_SATELLITES,
    };
})();

window.N2YOService = N2YOService;
console.log('✅ N2YOService loaded — calls proxy (uses N2YO_API_KEY from .env)');