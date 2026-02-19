# Quick Setup Guide for Real-Time Features

## Prerequisites
- Node.js 14+ installed
- npm or yarn package manager
- API keys (see below)

## Step 1: Install Dependencies
```bash
cd earth_project
npm install
```

## Step 2: Get API Keys

### NASA API Key (Required)
1. Visit https://api.nasa.gov
2. Fill out the form with your name and email
3. You'll receive an API key instantly
4. Free tier: 1,000 requests per hour

### OpenWeather API Key (Recommended)
1. Visit https://openweathermap.org/api
2. Sign up for a free account
3. Go to API keys section
4. Generate a new key
5. Free tier: 60 calls/minute

### N2YO API Key (Optional - for satellite tracking)
1. Visit https://www.n2yo.com/api/
2. Sign up for an account
3. Subscribe to free tier
4. Get your API key
5. Free tier: 1,000 transactions/hour

## Step 3: Configure Environment

Create a `.env` file in the `earth_project` directory:

```bash
# NASA API Key (required for disasters, NEO, fires)
NASA_API_KEY=your_nasa_key_here

# NASA FIRMS Key (optional - can use NASA_API_KEY)
NASA_FIRMS_KEY=your_nasa_key_here

# OpenWeather API Key (required for weather)
WEATHER_API_KEY=your_openweather_key_here

# N2YO API Key (required for satellite tracking)
N2YO_API_KEY=your_n2yo_key_here
```

## Step 4: Start the Proxy Server

The proxy server handles API requests and avoids CORS issues:

```bash
node server/proxyServer.js
```

You should see:
```
🚀 AstroView proxy server running at http://localhost:3000
```

## Step 5: Open the Application

1. Open your browser
2. Navigate to http://localhost:3000
3. Click "⚙ API Keys" in the top-right
4. Enter your NASA and OpenWeather keys
5. Enter your city name
6. Click "SAVE & LOAD DATA"

## Step 6: Verify Real-Time Updates

### Check ISS Updates (5 second interval)
- Switch to "🌍 Earth Intel" mode
- Watch the ISS chip in the top-left
- Position should update every 5 seconds
- Look for the green pulsing dot

### Check Live Status Indicator
- Look for the live status in the top-right corner
- Should show "🔴 LIVE: iss: Xs ago · disasters: Xs ago"
- Updates every second

### Check Location Data
- Click anywhere on the globe
- Panel should show:
  - Current weather
  - Viewing conditions score
  - Satellite passes
  - Night duration
  - Moon phase

## Troubleshooting

### "API key not configured" errors
- Make sure `.env` file exists in `earth_project/` directory
- Restart the proxy server after adding keys
- Check that keys don't have extra spaces

### No data updates
- Verify proxy server is running
- Check browser console for errors (F12)
- Verify API keys are valid
- Check network tab for failed requests

### Slow performance
- Reduce update frequencies in `services/realtimeService.js`
- Clear browser cache
- Check internet connection speed

### Rate limit errors
- Wait for rate limit to reset (usually 1 hour)
- Upgrade to paid API tier
- Increase cache durations

## Testing Real-Time Features

### Test ISS Tracking
```javascript
// Open browser console (F12)
RealtimeService.forceUpdate('ISS');
// Should see ISS position update immediately
```

### Test Weather Updates
```javascript
// In browser console
const weather = await EnhancedWeatherService.getCurrentWeather(40.7128, -74.0060);
console.log(weather);
```

### Test Satellite Passes
```javascript
// In browser console
const passes = await EnhancedSatelliteService.getMultipleSatellitePasses(40.7128, -74.0060);
console.log(passes);
```

### Check Data Freshness
```javascript
// In browser console
const freshness = LiveDataManager.getFreshness();
console.log(freshness);
```

## Performance Tips

### Optimize for Your Use Case

**For Demo/Presentation:**
- Keep all update intervals as-is
- Enable all data layers
- Use high-quality API keys

**For Development:**
- Increase update intervals to reduce API calls
- Disable unused data layers
- Use mock data when possible

**For Production:**
- Implement request caching on server
- Use CDN for static assets
- Enable service worker for offline support
- Monitor API usage

### Reduce API Calls

Edit `services/realtimeService.js`:
```javascript
const UPDATE_INTERVALS = {
    ISS: 10000,          // 10 seconds instead of 5
    WEATHER: 600000,     // 10 minutes instead of 5
    FIRES: 1800000,      // 30 minutes instead of 10
    SATELLITES: 120000,  // 2 minutes instead of 1
    NEO: 7200000,        // 2 hours instead of 1
    DISASTERS: 3600000,  // 1 hour instead of 30 minutes
};
```

## Advanced Configuration

### Custom Update Intervals

Create a config file `config/realtime.json`:
```json
{
  "updateIntervals": {
    "iss": 5000,
    "weather": 300000,
    "fires": 600000,
    "satellites": 60000,
    "neo": 3600000,
    "disasters": 1800000
  },
  "cacheDurations": {
    "weather": 300000,
    "satellites": 60000,
    "fires": 600000
  }
}
```

### Enable Debug Mode

In browser console:
```javascript
localStorage.setItem('debug_realtime', 'true');
location.reload();
```

This will log all real-time updates to console.

### Monitor API Usage

```javascript
// Check rate limit status
const status = NasaService.getRateLimitStatus();
console.log(`NASA API: ${status.remainingRequests}/${status.maxRequests} remaining`);
```

## Next Steps

1. **Explore the Dashboard**
   - Try different locations
   - Toggle data layers
   - Check satellite passes

2. **Customize Update Frequencies**
   - Adjust based on your needs
   - Monitor API usage
   - Optimize for performance

3. **Add Custom Features**
   - Create new data services
   - Add custom visualizations
   - Implement alerts

4. **Read Full Documentation**
   - See `REALTIME_FEATURES.md` for detailed API docs
   - Check `README.md` for project overview

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify API keys are valid
3. Ensure proxy server is running
4. Check network connectivity
5. Review troubleshooting section above

## Resources

- NASA API Docs: https://api.nasa.gov
- OpenWeather API: https://openweathermap.org/api
- N2YO API: https://www.n2yo.com/api/
- Project GitHub: [Your repo URL]

Happy tracking! 🚀🌍
