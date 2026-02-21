// services/liveDataManager.js
// Central manager for all live data streams

const LiveDataManager = (() => {
    const state = {
        iss: null,
        weather: null,
        satellites: [],
        fires: null,
        disasters: [],
        neo: [],
        lastUpdate: {}
    };

    const listeners = new Map();
    let updateInterval = null;

    // Initialize live data streams
    function init() {
        console.log('[LiveData] Initializing live data manager');
        
        // Start real-time service
        if (window.RealtimeService) {
            RealtimeService.startAll();
            
            // Subscribe to updates
            RealtimeService.subscribe('ISS', (data) => {
                state.iss = data;
                state.lastUpdate.iss = Date.now();
                notifyListeners('iss', data);
            });
            
            RealtimeService.subscribe('DISASTERS', (data) => {
                state.disasters = data;
                state.lastUpdate.disasters = Date.now();
                notifyListeners('disasters', data);
            });
            
            RealtimeService.subscribe('NEO', (data) => {
                state.neo = data;
                state.lastUpdate.neo = Date.now();
                notifyListeners('neo', data);
            });
        }
        
        // Start periodic status updates
        updateInterval = setInterval(updateStatus, 1000);
    }

    // Stop all live data streams
    function stop() {
        console.log('[LiveData] Stopping live data manager');
        
        if (window.RealtimeService) {
            RealtimeService.stopAll();
        }
        
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
    }

    // Add listener for data updates
    function addListener(dataType, callback) {
        if (!listeners.has(dataType)) {
            listeners.set(dataType, new Set());
        }
        listeners.get(dataType).add(callback);
    }

    // Remove listener
    function removeListener(dataType, callback) {
        if (listeners.has(dataType)) {
            listeners.get(dataType).delete(callback);
        }
    }

    // Notify listeners of data updates
    function notifyListeners(dataType, data) {
        if (listeners.has(dataType)) {
            listeners.get(dataType).forEach(callback => {
                try {
                    callback(data);
                } catch (err) {
                    console.error('[LiveData] Listener error:', err);
                }
            });
        }
    }

    // Update status display
    function updateStatus() {
        const statusEl = document.getElementById('live-status');
        if (!statusEl) return;
        
        const now = Date.now();
        const updates = [];
        
        Object.entries(state.lastUpdate).forEach(([type, timestamp]) => {
            const age = Math.floor((now - timestamp) / 1000);
            if (age < 60) {
                updates.push(`${type}: ${age}s ago`);
            }
        });
        
        if (updates.length > 0) {
            statusEl.textContent = `🔴 LIVE: ${updates.join(' · ')}`;
            statusEl.style.display = 'block';
        }
    }

    // Get current state
    function getState() {
        return { ...state };
    }

    // Force refresh all data
    async function refreshAll() {
        console.log('[LiveData] Force refreshing all data');
        
        if (window.RealtimeService) {
            await Promise.all([
                RealtimeService.forceUpdate('ISS'),
                RealtimeService.forceUpdate('DISASTERS'),
                RealtimeService.forceUpdate('NEO')
            ]);
        }
    }

    // Get data freshness
    function getFreshness() {
        const now = Date.now();
        const freshness = {};
        
        Object.entries(state.lastUpdate).forEach(([type, timestamp]) => {
            const age = now - timestamp;
            freshness[type] = {
                age: Math.floor(age / 1000),
                fresh: age < 60000, // Fresh if < 1 minute old
                stale: age > 300000 // Stale if > 5 minutes old
            };
        });
        
        return freshness;
    }

    // Update location-specific data
    async function updateLocationData(lat, lon) {
        console.log(`[LiveData] Updating location data for ${lat}, ${lon}`);
        
        try {
            // Get weather
            if (window.EnhancedWeatherService) {
                const weather = await EnhancedWeatherService.getCurrentWeather(lat, lon);
                state.weather = weather;
                state.lastUpdate.weather = Date.now();
                notifyListeners('weather', weather);
            }
            
            // Get satellites overhead
            if (window.EnhancedSatelliteService) {
                const satellites = await EnhancedSatelliteService.getSatellitesOverhead(lat, lon);
                state.satellites = satellites.satellites || [];
                state.lastUpdate.satellites = Date.now();
                notifyListeners('satellites', satellites);
            }
            
            // Get nearby fires
            if (window.FIRMSService) {
                const fires = await FIRMSService.fetchFiresNearLocation(lat, lon, 5);
                state.fires = fires;
                state.lastUpdate.fires = Date.now();
                notifyListeners('fires', fires);
            }
        } catch (error) {
            console.error('[LiveData] Location update failed:', error);
        }
    }

    return {
        init,
        stop,
        addListener,
        removeListener,
        getState,
        refreshAll,
        getFreshness,
        updateLocationData
    };
})();

if (typeof window !== 'undefined') {
    window.LiveDataManager = LiveDataManager;
    console.log('✅ LiveDataManager loaded');
}
