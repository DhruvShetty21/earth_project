// services/realtimeService.js
// Enhanced real-time data service with WebSocket support and auto-refresh

const RealtimeService = (() => {
    const UPDATE_INTERVALS = {
        ISS: 5000,           // 5 seconds - ISS moves fast
        WEATHER: 300000,     // 5 minutes
        FIRES: 600000,       // 10 minutes
        SATELLITES: 60000,   // 1 minute
        NEO: 3600000,        // 1 hour
        DISASTERS: 1800000,  // 30 minutes
    };

    const subscribers = new Map();
    const intervals = new Map();
    let isActive = false;

    // Subscribe to real-time updates
    function subscribe(dataType, callback) {
        if (!subscribers.has(dataType)) {
            subscribers.set(dataType, new Set());
        }
        subscribers.get(dataType).add(callback);
        
        // Start polling if not already active
        if (!intervals.has(dataType)) {
            startPolling(dataType);
        }
        
        console.log(`[Realtime] Subscribed to ${dataType} updates`);
    }

    // Unsubscribe from updates
    function unsubscribe(dataType, callback) {
        if (subscribers.has(dataType)) {
            subscribers.get(dataType).delete(callback);
            
            // Stop polling if no more subscribers
            if (subscribers.get(dataType).size === 0) {
                stopPolling(dataType);
            }
        }
    }

    // Start polling for a data type
    function startPolling(dataType) {
        const interval = UPDATE_INTERVALS[dataType];
        if (!interval) {
            console.warn(`[Realtime] Unknown data type: ${dataType}`);
            return;
        }

        // Fetch immediately
        fetchAndNotify(dataType);

        // Then poll at interval
        const intervalId = setInterval(() => {
            fetchAndNotify(dataType);
        }, interval);

        intervals.set(dataType, intervalId);
        console.log(`[Realtime] Started polling ${dataType} every ${interval}ms`);
    }

    // Stop polling for a data type
    function stopPolling(dataType) {
        if (intervals.has(dataType)) {
            clearInterval(intervals.get(dataType));
            intervals.delete(dataType);
            console.log(`[Realtime] Stopped polling ${dataType}`);
        }
    }

    // Fetch data and notify subscribers
    async function fetchAndNotify(dataType) {
        try {
            let data;
            
            switch (dataType) {
                case 'ISS':
                    data = await NasaService.fetchISS();
                    break;
                    
                case 'WEATHER':
                    const keys = {
                        weather: localStorage.getItem('av_weather'),
                        city: localStorage.getItem('av_city')
                    };
                    if (keys.weather && keys.city) {
                        data = await WeatherService.fetch(keys.weather, keys.city);
                    }
                    break;
                    
                case 'FIRES':
                    if (window.FIRMSService) {
                        data = await FIRMSService.fetchActiveFires({ days: 1 });
                    }
                    break;
                    
                case 'SATELLITES':
                    // Satellite data would need location context
                    // This is handled separately in location-specific updates
                    break;
                    
                case 'NEO':
                    data = await NasaService.fetchNEOWs();
                    break;
                    
                case 'DISASTERS':
                    data = await NasaService.fetchEONET();
                    break;
            }

            // Notify all subscribers
            if (data && subscribers.has(dataType)) {
                subscribers.get(dataType).forEach(callback => {
                    try {
                        callback(data);
                    } catch (err) {
                        console.error(`[Realtime] Subscriber callback error:`, err);
                    }
                });
            }
        } catch (error) {
            console.error(`[Realtime] Failed to fetch ${dataType}:`, error);
        }
    }

    // Start all real-time updates
    function startAll() {
        if (isActive) return;
        
        isActive = true;
        console.log('[Realtime] Starting all real-time updates');
        
        // Start with essential data types
        ['ISS', 'DISASTERS', 'NEO'].forEach(type => {
            if (!intervals.has(type)) {
                startPolling(type);
            }
        });
    }

    // Stop all real-time updates
    function stopAll() {
        isActive = false;
        console.log('[Realtime] Stopping all real-time updates');
        
        intervals.forEach((intervalId, dataType) => {
            clearInterval(intervalId);
        });
        intervals.clear();
    }

    // Get current update status
    function getStatus() {
        const status = {};
        intervals.forEach((_, dataType) => {
            status[dataType] = {
                active: true,
                interval: UPDATE_INTERVALS[dataType],
                subscribers: subscribers.get(dataType)?.size || 0
            };
        });
        return status;
    }

    // Force immediate update for a data type
    async function forceUpdate(dataType) {
        console.log(`[Realtime] Force updating ${dataType}`);
        await fetchAndNotify(dataType);
    }

    return {
        subscribe,
        unsubscribe,
        startAll,
        stopAll,
        getStatus,
        forceUpdate,
        UPDATE_INTERVALS
    };
})();

// Make globally available
if (typeof window !== 'undefined') {
    window.RealtimeService = RealtimeService;
    console.log('✅ RealtimeService loaded');
}
