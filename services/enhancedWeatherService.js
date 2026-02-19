// services/enhancedWeatherService.js
// Enhanced weather service with forecast and alerts

const EnhancedWeatherService = (() => {
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    // Get current weather with more details
    async function getCurrentWeather(lat, lon) {
        const cacheKey = `weather_current_${lat}_${lon}`;
        return CacheMiddleware.wrap(cacheKey, 'WEATHER', async () => {
            try {
                const apiKey = localStorage.getItem('av_weather');
                if (!apiKey) throw new Error('Weather API key not configured');

                const response = await fetch(
                    `/api/weather?lat=${lat}&lon=${lon}`
                );
                
                if (!response.ok) throw new Error(`Weather API error: ${response.status}`);
                
                const data = await response.json();
                
                return {
                    temperature: Math.round(data.main.temp),
                    feelsLike: Math.round(data.main.feels_like),
                    humidity: data.main.humidity,
                    pressure: data.main.pressure,
                    windSpeed: data.wind.speed,
                    windDirection: data.wind.deg,
                    cloudCover: data.clouds.all,
                    visibility: data.visibility / 1000, // Convert to km
                    description: data.weather[0].description,
                    icon: data.weather[0].icon,
                    sunrise: new Date(data.sys.sunrise * 1000),
                    sunset: new Date(data.sys.sunset * 1000),
                    location: data.name,
                    timestamp: new Date()
                };
            } catch (error) {
                console.error('[EnhancedWeather] Current weather failed:', error);
                return null;
            }
        });
    }

    // Get 5-day forecast
    async function getForecast(lat, lon) {
        const cacheKey = `weather_forecast_${lat}_${lon}`;
        return CacheMiddleware.wrap(cacheKey, 'WEATHER', async () => {
            try {
                const apiKey = localStorage.getItem('av_weather');
                if (!apiKey) throw new Error('Weather API key not configured');

                const response = await fetch(
                    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
                );
                
                if (!response.ok) throw new Error(`Forecast API error: ${response.status}`);
                
                const data = await response.json();
                
                // Group by day
                const dailyForecasts = {};
                data.list.forEach(item => {
                    const date = new Date(item.dt * 1000).toDateString();
                    if (!dailyForecasts[date]) {
                        dailyForecasts[date] = {
                            date: new Date(item.dt * 1000),
                            temps: [],
                            conditions: [],
                            clouds: [],
                            rain: 0
                        };
                    }
                    dailyForecasts[date].temps.push(item.main.temp);
                    dailyForecasts[date].conditions.push(item.weather[0].description);
                    dailyForecasts[date].clouds.push(item.clouds.all);
                    if (item.rain) dailyForecasts[date].rain += item.rain['3h'] || 0;
                });

                // Calculate daily summaries
                const forecast = Object.values(dailyForecasts).slice(0, 5).map(day => ({
                    date: day.date,
                    tempMin: Math.round(Math.min(...day.temps)),
                    tempMax: Math.round(Math.max(...day.temps)),
                    avgCloudCover: Math.round(day.clouds.reduce((a, b) => a + b, 0) / day.clouds.length),
                    condition: day.conditions[Math.floor(day.conditions.length / 2)],
                    rainTotal: Math.round(day.rain * 10) / 10
                }));

                return forecast;
            } catch (error) {
                console.error('[EnhancedWeather] Forecast failed:', error);
                return [];
            }
        });
    }

    // Calculate astronomy viewing conditions
    function calculateViewingConditions(weather) {
        if (!weather) return { score: 0, quality: 'Unknown', factors: [] };

        const factors = [];
        let score = 100;

        // Cloud cover (most important)
        if (weather.cloudCover > 80) {
            score -= 40;
            factors.push({ factor: 'Heavy clouds', impact: -40 });
        } else if (weather.cloudCover > 50) {
            score -= 25;
            factors.push({ factor: 'Moderate clouds', impact: -25 });
        } else if (weather.cloudCover > 20) {
            score -= 10;
            factors.push({ factor: 'Light clouds', impact: -10 });
        } else {
            factors.push({ factor: 'Clear skies', impact: 0 });
        }

        // Humidity
        if (weather.humidity > 85) {
            score -= 15;
            factors.push({ factor: 'High humidity', impact: -15 });
        } else if (weather.humidity > 70) {
            score -= 8;
            factors.push({ factor: 'Moderate humidity', impact: -8 });
        }

        // Visibility
        if (weather.visibility < 5) {
            score -= 20;
            factors.push({ factor: 'Poor visibility', impact: -20 });
        } else if (weather.visibility < 10) {
            score -= 10;
            factors.push({ factor: 'Reduced visibility', impact: -10 });
        }

        // Wind (affects telescope stability)
        if (weather.windSpeed > 10) {
            score -= 10;
            factors.push({ factor: 'Strong winds', impact: -10 });
        } else if (weather.windSpeed > 5) {
            score -= 5;
            factors.push({ factor: 'Moderate winds', impact: -5 });
        }

        score = Math.max(0, Math.min(100, score));

        let quality;
        if (score >= 80) quality = 'Excellent';
        else if (score >= 60) quality = 'Good';
        else if (score >= 40) quality = 'Fair';
        else if (score >= 20) quality = 'Poor';
        else quality = 'Very Poor';

        return { score, quality, factors };
    }

    // Get night duration and moon phase
    function calculateNightInfo(lat, lon, date = new Date()) {
        // Simplified calculation - in production use a proper astronomy library
        const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
        const declination = 23.45 * Math.sin((dayOfYear - 81) * 360 / 365 * Math.PI / 180);
        
        const latRad = lat * Math.PI / 180;
        const decRad = declination * Math.PI / 180;
        
        let nightHours = 12;
        try {
            const cosHA = -Math.tan(latRad) * Math.tan(decRad);
            if (cosHA < -1) nightHours = 0;   // Polar day
            else if (cosHA > 1) nightHours = 24; // Polar night
            else {
                const hourAngle = Math.acos(cosHA) * 180 / Math.PI;
                nightHours = Math.round(24 - (2 * hourAngle / 15));
            }
        } catch (e) {
            nightHours = 12;
        }

        // Moon phase (simplified)
        const moonAge = (date.getTime() / 86400000) % 29.53;
        const moonPhase = moonAge / 29.53;
        
        let phaseName, phaseIcon;
        if (moonPhase < 0.06) { phaseName = 'New Moon'; phaseIcon = '🌑'; }
        else if (moonPhase < 0.25) { phaseName = 'Waxing Crescent'; phaseIcon = '🌒'; }
        else if (moonPhase < 0.31) { phaseName = 'First Quarter'; phaseIcon = '🌓'; }
        else if (moonPhase < 0.50) { phaseName = 'Waxing Gibbous'; phaseIcon = '🌔'; }
        else if (moonPhase < 0.56) { phaseName = 'Full Moon'; phaseIcon = '🌕'; }
        else if (moonPhase < 0.75) { phaseName = 'Waning Gibbous'; phaseIcon = '🌖'; }
        else if (moonPhase < 0.81) { phaseName = 'Last Quarter'; phaseIcon = '🌗'; }
        else { phaseName = 'Waning Crescent'; phaseIcon = '🌘'; }

        return {
            nightHours,
            moonPhase: Math.round(moonPhase * 100),
            phaseName,
            phaseIcon,
            moonIllumination: Math.round(Math.abs(Math.cos((moonPhase - 0.5) * 2 * Math.PI)) * 100)
        };
    }

    return {
        getCurrentWeather,
        getForecast,
        calculateViewingConditions,
        calculateNightInfo
    };
})();

if (typeof window !== 'undefined') {
    window.EnhancedWeatherService = EnhancedWeatherService;
    console.log('✅ EnhancedWeatherService loaded');
}
