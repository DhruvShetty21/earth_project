// engine/simplifier.js
// Rule-based engine: converts raw API data into plain English

const Simplifier = {

    category(cat) {
        const map = {
            'Wildfires':        { icon: '🔥', color: '#ff4400', rgb: '255,68,0',   severity: 'high'   },
            'Floods':           { icon: '🌊', color: '#2277ff', rgb: '34,119,255', severity: 'high'   },
            'Volcanoes':        { icon: '🌋', color: '#ff6600', rgb: '255,102,0',  severity: 'medium' },
            'Severe Storms':    { icon: '🌀', color: '#aa44ff', rgb: '170,68,255', severity: 'high'   },
            'Drought':          { icon: '🏜', color: '#cc8800', rgb: '204,136,0',  severity: 'medium' },
            'Sea and Lake Ice': { icon: '🧊', color: '#aaddff', rgb: '170,221,255',severity: 'low'    },
            'Landslides':       { icon: '⛰', color: '#886633', rgb: '136,102,51', severity: 'medium' },
            'Dust and Haze':    { icon: '🌫', color: '#998866', rgb: '153,136,102',severity: 'low'    },
            'Earthquakes':      { icon: '🫨', color: '#cc6622', rgb: '204,102,34', severity: 'high'   },
            'Manmade':          { icon: '🏭', color: '#ff9944', rgb: '255,153,68', severity: 'medium' },
            'Snow':             { icon: '❄️', color: '#cceeff', rgb: '204,238,255',severity: 'low'    },
            'Temperature Extremes': { icon: '🌡', color: '#ff3366', rgb: '255,51,102', severity: 'medium' },
        };
        return map[cat] || { icon: '⚠️', color: '#ffaa00', rgb: '255,170,0', severity: 'low' };
    },

    asteroid(a) {
        const dist  = parseFloat(a.close_approach_data?.[0]?.miss_distance?.lunar  || 999);
        const distKm = parseInt(a.close_approach_data?.[0]?.miss_distance?.kilometers || 0).toLocaleString();
        const diam  = a.estimated_diameter?.meters?.estimated_diameter_max || 0;
        const hazard = a.is_potentially_hazardous_asteroid;
        return {
            proximity: dist < 5  ? '🚨 Extremely close pass' :
                       dist < 15 ? '⚠️ Very close approach' :
                       dist < 30 ? 'Close approach' : 'Distant flyby',
            size:  diam < 50  ? 'House-sized'       :
                   diam < 300 ? 'Building-sized'    :
                   diam < 1000? 'City-block-sized'  : 'City-sized',
            risk:  hazard ? '⚠️ Flagged hazardous' : '✅ No impact risk',
            color: hazard ? '#ff2244' : '#00cc88',
            dist:  dist.toFixed(1),
            distKm,
            diam:  Math.round(diam),
            hazard,
        };
    },

    weather(w) {
        if (!w) return null;
        const clouds = w.clouds?.all  || 0;
        const rain   = w.rain || w.snow;
        const score  = Math.max(0, Math.min(100, Math.round(100 - clouds * 0.75 - (rain ? 20 : 0))));
        return {
            score,
            label:  score > 75 ? '✨ Excellent — clear skies!' :
                    score > 55 ? '⛅ Good — some cloud breaks' :
                    score > 30 ? '☁️ Poor — mostly overcast'  : '🌧 Bad — heavy cloud/rain',
            clouds,
            temp: Math.round(w.main?.temp || 0),
            desc: w.weather?.[0]?.description || '',
            wind: Math.round(w.wind?.speed  || 0),
            humidity: w.main?.humidity || 0,
        };
    },

    cme(c) {
        const speed = c.cmeAnalyses?.[0]?.speed || 0;
        if (speed > 1500) return { level: 'Severe',   color: '#ff2200', msg: 'Strong CME detected — satellite disruption & mid-latitude auroras likely.' };
        if (speed > 800)  return { level: 'Moderate', color: '#ff8800', msg: 'Moderate CME — high-latitude auroras possible, minor GPS interference.' };
        return              { level: 'Minor',    color: '#ffd060', msg: 'Minor CME. No significant Earth impact expected.' };
    },

    cloudCover(pct) {
        if (pct < 20) return 'Clear skies — great for stargazing tonight.';
        if (pct < 50) return 'Partly cloudy — some viewing windows available.';
        if (pct < 80) return 'Mostly cloudy — limited visibility.';
        return 'Overcast — low chance of observing stars tonight.';
    },

    disasterImpact(cat) {
        const impacts = {
            'Wildfires':        'Air quality degradation, CO₂ release, habitat destruction, potential community displacement.',
            'Floods':           'Infrastructure damage, contaminated water supply, agricultural losses, displacement risk.',
            'Volcanoes':        'Ash cloud aviation hazard, SO₂ air quality impact, agricultural disruption, lava flow risk.',
            'Severe Storms':    'Wind damage, storm surge, coastal flooding, infrastructure failure.',
            'Earthquakes':      'Building collapse, infrastructure damage, tsunami risk in coastal areas.',
            'Drought':          'Agricultural crop failure, water scarcity, increased wildfire risk, food security impact.',
            'Landslides':       'Road closures, infrastructure damage, community displacement.',
            'Dust and Haze':    'Respiratory health risk, reduced visibility, aviation disruption.',
        };
        return impacts[cat] || 'Ongoing natural event — monitor local authorities for impact data.';
    },

    disasterSpaceHelp(cat) {
        const help = {
            'Wildfires':     'NASA satellites detect heat signatures within hours of ignition. FIRMS (Fire Information for Resource Management System) provides near-real-time fire data feeding emergency evacuations.',
            'Floods':        'SAR (Synthetic Aperture Radar) satellites see through clouds to map flooded areas, letting aid agencies route relief before ground teams can access affected zones.',
            'Volcanoes':     'Satellite SO₂ sensors detect eruptions before they are visible to ground observers, giving aviation authorities time to reroute flight paths away from ash clouds.',
            'Severe Storms': 'Geostationary weather satellites track storm intensification every 5 minutes — critical for issuing accurate landfall warnings 48–72 hours ahead.',
            'Earthquakes':   'Post-quake satellite imagery identifies building collapse patterns and ground deformation to guide search-and-rescue team prioritization.',
            'Drought':       'NDVI (vegetation index) from satellites monitors crop health over millions of km² weekly — providing early warning of food security crises months in advance.',
        };
        return help[cat] || 'NASA EONET aggregates satellite imagery to provide near-real-time event tracking for emergency managers worldwide.';
    }
};

// Make available globally
window.Simplifier = Simplifier;