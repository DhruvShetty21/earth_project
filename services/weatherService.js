// services/weatherService.js

const WeatherService = {

    async fetch(apiKey, city) {
        if (!apiKey || !city) return null;
        const cacheKey = `WEATHER_${city.toLowerCase()}`;
        return CacheMiddleware.wrap(cacheKey, 'WEATHER', async () => {
            try {
                const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
                const r = await fetch(url);
                const j = await r.json();
                if (j.cod !== 200) throw new Error(j.message || `Weather API error ${j.cod}`);
                console.log(`[WeatherService] Weather for ${city}: ${j.weather?.[0]?.description}, ${Math.round(j.main?.temp)}°C`);
                return j;
            } catch (err) {
                console.warn('[WeatherService] Failed:', err.message);
                return null;
            }
        });
    }
};

window.WeatherService = WeatherService;