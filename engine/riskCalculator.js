// engine/riskCalculator.js
// Calculates risk/severity scores from raw event data

const RiskCalculator = {

    disaster(event) {
        const cat       = event.categories?.[0]?.title || '';
        const isOngoing = event.closed === null;
        const lastDate  = event.geometry?.[event.geometry.length - 1]?.date;
        const ageHours  = lastDate ? (Date.now() - new Date(lastDate)) / 3_600_000 : 999;

        let score = 0;
        if (isOngoing)                   score += 40;
        if (ageHours < 6)                score += 30;
        else if (ageHours < 24)          score += 20;
        else if (ageHours < 72)          score += 10;

        // Category weight
        const highCats = ['Wildfires', 'Floods', 'Severe Storms', 'Earthquakes'];
        const medCats  = ['Volcanoes', 'Drought', 'Landslides', 'Temperature Extremes'];
        if (highCats.includes(cat)) score += 25;
        if (medCats.includes(cat))  score += 12;

        const level = score > 70 ? 'critical' :
                      score > 45 ? 'high'     :
                      score > 25 ? 'moderate' : 'low';

        const color = { critical: '#ff2244', high: '#ff6622', moderate: '#ffaa00', low: '#88cc44' }[level];

        return { score: Math.min(100, score), level, color, isOngoing, ageHours: Math.round(ageHours) };
    },

    asteroid(a) {
        const dist    = parseFloat(a.close_approach_data?.[0]?.miss_distance?.lunar || 999);
        const diam    = a.estimated_diameter?.meters?.estimated_diameter_max || 0;
        const hazard  = a.is_potentially_hazardous_asteroid;

        let score = 0;
        if (hazard)     score += 50;
        if (dist < 5)   score += 35;
        else if (dist < 15) score += 20;
        else if (dist < 30) score += 10;
        if (diam > 1000) score += 15;
        else if (diam > 300) score += 8;

        return {
            score: Math.min(100, score),
            level: hazard ? (score > 70 ? 'high' : 'medium') : 'minimal',
            color: hazard ? '#ff4400' : '#00cc66',
        };
    },

    skyVisibility({ cloudCover = 0, moonPhase = 0, lightPollution = 0, hasRain = false }) {
        let score = 100;
        score -= cloudCover * 0.72;
        score -= moonPhase > 0.65 ? 18 : moonPhase > 0.4 ? 8 : 0;  // moon brightness
        score -= lightPollution * 4;   // Bortle scale 0-9
        if (hasRain) score -= 28;
        return {
            score: Math.max(0, Math.min(100, Math.round(score))),
            label: score > 80 ? 'Excellent' : score > 60 ? 'Good' : score > 35 ? 'Fair' : 'Poor',
        };
    },

};

window.RiskCalculator = RiskCalculator;