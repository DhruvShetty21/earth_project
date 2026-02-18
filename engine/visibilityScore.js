// engine/visibilityScore.js
// Calculates sky viewing quality for a given location + weather combo

const VisibilityScore = {

    compute(weatherData) {
        if (!weatherData) return { score: 50, label: 'Unknown', color: '#888888', message: 'Add your city in API Keys to get personalised sky conditions.' };

        const clouds  = weatherData.clouds?.all  || 0;
        const rain    = !!(weatherData.rain || weatherData.snow);
        const humid   = weatherData.main?.humidity || 0;
        const wind    = weatherData.wind?.speed    || 0;

        // Moon phase approximation (based on date — rough but functional)
        const moonPct = VisibilityScore._moonPhase();

        let score = 100;
        score -= clouds * 0.72;
        score -= rain ? 25 : 0;
        score -= humid > 85 ? 10 : humid > 70 ? 5 : 0;
        score -= wind  > 15 ? 5  : 0;
        score -= moonPct > 0.7 ? 15 : moonPct > 0.45 ? 7 : 0;

        score = Math.max(0, Math.min(100, Math.round(score)));

        const label = score > 80 ? 'Excellent' :
                      score > 60 ? 'Good'      :
                      score > 35 ? 'Fair'      : 'Poor';

        const color = score > 75 ? '#00ff88' :
                      score > 50 ? '#ffd060' :
                      score > 25 ? '#ff8800' : '#ff2244';

        const message = score > 75 ? `Clear skies — perfect for stargazing tonight.` :
                        score > 55 ? `Partly cloudy — some viewing windows available.` :
                        score > 30 ? `Mostly cloudy — limited astronomical viewing.` :
                                     `Heavy cloud cover — low chance of seeing stars tonight.`;

        return { score, label, color, message, moonPct: Math.round(moonPct * 100) };
    },

    // Approximate moon phase (0 = new moon, 1 = full moon)
    _moonPhase() {
        const KNOWN_NEW_MOON = new Date('2024-01-11').getTime();
        const CYCLE = 29.53 * 24 * 3600 * 1000;
        const elapsed = (Date.now() - KNOWN_NEW_MOON) % CYCLE;
        return Math.abs(Math.cos((elapsed / CYCLE) * Math.PI));
    },

    moonDescription(pct) {
        if (pct < 0.15) return '🌑 New Moon — darkest skies, best for deep-sky viewing.';
        if (pct < 0.4)  return '🌒 Crescent Moon — minimal light interference.';
        if (pct < 0.6)  return '🌓 Quarter Moon — moderate sky glow.';
        if (pct < 0.85) return '🌖 Gibbous Moon — notable sky glow, affects faint objects.';
        return                  '🌕 Full Moon — bright sky, best for lunar viewing only.';
    }
};

window.VisibilityScore = VisibilityScore;