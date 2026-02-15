// services/cacheMiddleware.js
// Simple in-memory cache for API responses (browser-side)

const CacheMiddleware = (() => {
    const store = {};

    // TTL in milliseconds per data type
    const TTL = {
        APOD:     86_400_000,  // 24 hours
        NEOWS:     3_600_000,  // 1 hour
        EONET:       600_000,  // 10 minutes
        DONKI:     1_800_000,  // 30 minutes
        ISS:             0,   // never cache — always live
        WEATHER:     900_000,  // 15 minutes
        LAUNCHES:  3_600_000,  // 1 hour
    };

    return {
        get(key) {
            const entry = store[key];
            if (!entry) return null;
            if (Date.now() - entry.ts > entry.ttl) {
                delete store[key];
                return null;
            }
            return entry.data;
        },

        set(key, data, type = 'EONET') {
            store[key] = { data, ts: Date.now(), ttl: TTL[type] ?? 600_000 };
        },

        clear(key) {
            if (key) delete store[key];
            else Object.keys(store).forEach(k => delete store[k]);
        },

        // Wrap an async fetch function with caching
        async wrap(key, type, fetchFn) {
            const cached = this.get(key);
            if (cached) return cached;
            const data = await fetchFn();
            this.set(key, data, type);
            return data;
        }
    };
})();

window.CacheMiddleware = CacheMiddleware;