# Real-Time Data Enhancements for Earth Impact Dashboard

## Overview
Enhanced real-time data capabilities for the AstroView Earth Impact Dashboard with improved update frequencies, better data accuracy, and live status indicators.

## New Services

### 1. RealtimeService (`services/realtimeService.js`)
Central service for managing all real-time data streams with configurable update intervals.

**Features:**
- Automatic polling for different data types
- Configurable update intervals per data type
- Subscribe/unsubscribe pattern for efficient updates
- Force refresh capability

**Update Intervals:**
- ISS Position: 5 seconds (fast-moving)
- Weather: 5 minutes
- Active Fires: 10 minutes
- Satellites: 1 minute
- NEO Data: 1 hour
- Disasters: 30 minutes

**Usage:**
```javascript
// Subscribe to ISS updates
RealtimeService.subscribe('ISS', (data) => {
    console.log('ISS updated:', data);
});

// Start all real-time updates
RealtimeService.startAll();

// Force immediate update
RealtimeService.forceUpdate('ISS');

// Get status
const status = RealtimeService.getStatus();
```

### 2. EnhancedWeatherService (`services/enhancedWeatherService.js`)
Improved weather service with forecast and detailed viewing conditions.

**Features:**
- Current weather with extended details
- 5-day forecast
- Astronomy viewing conditions calculator
- Night duration and moon phase calculations

**New Data Points:**
- Feels-like temperature
- Wind direction
- Visibility distance
- Sunrise/sunset times
- Viewing quality score (0-100)
- Factors affecting viewing (clouds, humidity, wind, visibility)

**Usage:**
```javascript
// Get current weather
const weather = await EnhancedWeatherService.getCurrentWeather(lat, lon);

// Get 5-day forecast
const forecast = await EnhancedWeatherService.getForecast(lat, lon);

// Calculate viewing conditions
const conditions = EnhancedWeatherService.calculateViewingConditions(weather);
console.log(`Viewing quality: ${conditions.quality} (${conditions.score}/100)`);

// Get night info
const nightInfo = EnhancedWeatherService.calculateNightInfo(lat, lon);
console.log(`Night duration: ${nightInfo.nightHours} hours`);
console.log(`Moon phase: ${nightInfo.phaseIcon} ${nightInfo.phaseName}`);
```

### 3. EnhancedSatelliteService (`services/enhancedSatelliteService.js`)
Real-time satellite tracking with better predictions and quality scoring.

**Features:**
- Satellites currently overhead
- Visual pass predictions for popular satellites
- Pass quality scoring (0-100)
- Next best viewing opportunity finder
- Automatic categorization (Space Station, Communications, Science, etc.)

**Tracked Satellites:**
- ISS (International Space Station)
- Starlink satellites
- Hubble Space Telescope
- GPS satellites
- Tiangong (Chinese Space Station)

**Usage:**
```javascript
// Get satellites overhead
const overhead = await EnhancedSatelliteService.getSatellitesOverhead(lat, lon);
console.log(`${overhead.count} satellites overhead`);

// Get visual passes for multiple satellites
const passes = await EnhancedSatelliteService.getMultipleSatellitePasses(lat, lon, 7);

// Find next best pass
const bestPass = await EnhancedSatelliteService.getNextBestPass(lat, lon);
if (bestPass) {
    console.log(`Best pass: ${bestPass.satellite.name} - Score: ${bestPass.pass.score}/100`);
}
```

### 4. LiveDataManager (`services/liveDataManager.js`)
Central manager coordinating all live data streams.

**Features:**
- Unified state management
- Event-based updates
- Data freshness tracking
- Location-specific data updates
- Status display

**Usage:**
```javascript
// Initialize
LiveDataManager.init();

// Add listener
LiveDataManager.addListener('iss', (data) => {
    updateISSDisplay(data);
});

// Update location-specific data
await LiveDataManager.updateLocationData(lat, lon);

// Get current state
const state = LiveDataManager.getState();

// Check data freshness
const freshness = LiveDataManager.getFreshness();
console.log(`ISS data age: ${freshness.iss.age} seconds`);

// Force refresh all
await LiveDataManager.refreshAll();
```

## Enhanced NASA Service

### Updated ISS Data
The ISS fetch now includes:
- Altitude (408 km)
- Velocity (7.66 km/s)
- Last update timestamp
- Live status indicator

## UI Improvements

### Live Status Indicator
A new live status indicator appears in the top-right corner showing:
- Active data streams
- Time since last update
- Visual pulse animation

**Location:** Top-right corner of screen
**Visibility:** Only shown when data is actively updating

### Enhanced Location Panel
When clicking on the globe, the location panel now shows:
- Real-time weather with viewing conditions
- Satellite passes with quality scores
- Night duration and moon phase
- Nearby active fires
- Space weather conditions

## Performance Optimizations

### Caching Strategy
- Short cache (5 min): Weather, ISS position
- Medium cache (30 min): Disasters, satellite passes
- Long cache (1 hour): NEO data, forecasts

### Update Throttling
- ISS: Updates every 5 seconds (moves ~38 km between updates)
- Weather: Updates every 5 minutes (conditions don't change faster)
- Fires: Updates every 10 minutes (FIRMS updates every 3 hours)
- Satellites: Updates every minute (orbital positions)

### Bandwidth Optimization
- Only active data types are polled
- Automatic pause when tab is not visible
- Configurable update intervals
- Smart caching with TTL

## API Requirements

### Required API Keys
1. **NASA API Key** (api.nasa.gov)
   - Used for: EONET, NeoWs, DONKI, FIRMS
   - Free tier: 1000 requests/day
   - Enhanced tier: 10,000 requests/day

2. **OpenWeather API Key** (openweathermap.org)
   - Used for: Current weather, forecasts
   - Free tier: 60 calls/minute, 1M calls/month

3. **N2YO API Key** (n2yo.com)
   - Used for: Satellite tracking, ISS passes
   - Free tier: 1000 transactions/hour

### Environment Variables (.env)
```bash
NASA_API_KEY=your_nasa_key_here
WEATHER_API_KEY=your_openweather_key_here
N2YO_API_KEY=your_n2yo_key_here
```

## Data Update Frequencies

| Data Type | Update Interval | Source Update | Cache Duration |
|-----------|----------------|---------------|----------------|
| ISS Position | 5 seconds | Real-time | No cache |
| Weather | 5 minutes | 10 minutes | 5 minutes |
| Satellites | 1 minute | Real-time | 1 minute |
| Active Fires | 10 minutes | 3 hours | 10 minutes |
| Disasters | 30 minutes | 1 hour | 30 minutes |
| NEO Data | 1 hour | Daily | 1 hour |
| Launches | 1 hour | Real-time | 1 hour |

## Usage Examples

### Basic Setup
```javascript
// In your app initialization
window.addEventListener('load', () => {
    // Initialize live data manager
    LiveDataManager.init();
    
    // Subscribe to updates
    LiveDataManager.addListener('iss', updateISS);
    LiveDataManager.addListener('weather', updateWeather);
    LiveDataManager.addListener('satellites', updateSatellites);
});
```

### Location-Based Updates
```javascript
// When user clicks on globe
async function onGlobeClick(lat, lon) {
    // Update all location-specific data
    await LiveDataManager.updateLocationData(lat, lon);
    
    // Get enhanced weather
    const weather = await EnhancedWeatherService.getCurrentWeather(lat, lon);
    const conditions = EnhancedWeatherService.calculateViewingConditions(weather);
    
    // Get satellite passes
    const passes = await EnhancedSatelliteService.getMultipleSatellitePasses(lat, lon);
    
    // Display in panel
    showLocationPanel(lat, lon, weather, conditions, passes);
}
```

### Real-Time Dashboard
```javascript
// Create a real-time dashboard
function createDashboard() {
    // Subscribe to all data types
    ['iss', 'weather', 'satellites', 'fires', 'disasters', 'neo'].forEach(type => {
        LiveDataManager.addListener(type, (data) => {
            updateDashboardSection(type, data);
        });
    });
    
    // Show freshness indicators
    setInterval(() => {
        const freshness = LiveDataManager.getFreshness();
        updateFreshnessIndicators(freshness);
    }, 1000);
}
```

## Troubleshooting

### Data Not Updating
1. Check API keys are configured
2. Verify proxy server is running (`node server/proxyServer.js`)
3. Check browser console for errors
4. Verify network connectivity

### Slow Updates
1. Check update intervals in RealtimeService
2. Verify cache is working properly
3. Check API rate limits
4. Monitor network tab for failed requests

### High API Usage
1. Increase cache durations
2. Reduce update frequencies
3. Implement request batching
4. Use conditional requests (If-Modified-Since)

## Future Enhancements

### Planned Features
- [ ] WebSocket support for ISS tracking
- [ ] Server-sent events for real-time alerts
- [ ] Predictive caching based on user behavior
- [ ] Offline mode with service workers
- [ ] Push notifications for important events
- [ ] Historical data playback
- [ ] Custom alert thresholds
- [ ] Data export functionality

### Performance Improvements
- [ ] Request deduplication
- [ ] Intelligent prefetching
- [ ] Progressive data loading
- [ ] Background sync API
- [ ] IndexedDB for large datasets

## Contributing

When adding new real-time features:
1. Add service to appropriate file in `services/`
2. Register with LiveDataManager
3. Add update interval to RealtimeService
4. Update this documentation
5. Add tests for new functionality

## License

Same as main project (see root LICENSE file)
