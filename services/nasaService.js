// services/nasaService.js
// All NASA + EONET + Open Notify API calls

const NasaService = (() => {

    function today() {
        return new Date().toISOString().slice(0, 10);
    }
    function daysAgo(n) {
        const d = new Date();
        d.setDate(d.getDate() - n);
        return d.toISOString().slice(0, 10);
    }

    // ── FALLBACK DATA (used if APIs fail / are offline) ────────────────────
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

    // ── API CALLS ──────────────────────────────────────────────────────────

    async function fetchEONET() {
        return CacheMiddleware.wrap('EONET', 'EONET', async () => {
            try {
                const r = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=60&days=20');
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
                const r = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${apiKey}`);
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
                const start = daysAgo(3);
                const end   = today();
                const url   = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${start}&end_date=${end}&api_key=${apiKey}`;
                const r = await fetch(url);
                const j = await r.json();
                if (j.error) throw new Error(j.error.message || JSON.stringify(j.error));
                const all = Object.values(j.near_earth_objects).flat();
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
                const url = `https://api.nasa.gov/DONKI/CME?startDate=${daysAgo(7)}&endDate=${today()}&api_key=${apiKey}`;
                const r = await fetch(url);
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
                ts:  j.timestamp,
                live: true,
            };
        } catch (err) {
            console.warn('[NasaService] ISS fetch failed:', err.message);
            // Return last known approximate position
            return { lat: 28.5, lng: -80.6, live: false };
        }
    }

    return { fetchEONET, fetchAPOD, fetchNEOWs, fetchDONKI, fetchISS, FALLBACK_DISASTERS, FALLBACK_APOD };
})();

window.NasaService = NasaService;