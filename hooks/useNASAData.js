// hooks/useNASAData.js
// Orchestrates all NASA data fetching, stores results globally, fires callbacks

const useNASAData = (() => {
    const _data = {
        disasters: [],
        neo:       [],
        cme:       [],
        apod:      null,
        weather:   null,
        iss:       null,
    };

    const _listeners = {};

    function on(event, fn) {
        if (!_listeners[event]) _listeners[event] = [];
        _listeners[event].push(fn);
    }

    function _emit(event, data) {
        (_listeners[event] || []).forEach(fn => fn(data));
    }

    function get(key) {
        return _data[key];
    }

    async function loadAll(keys) {
        const { nasa: nasaKey, weather: weatherKey, city } = keys;

        // Run independent fetches in parallel
        const [disasters, neo, cme, apod, weather] = await Promise.all([
            NasaService.fetchEONET(),
            NasaService.fetchNEOWs(nasaKey),
            NasaService.fetchDONKI(nasaKey),
            NasaService.fetchAPOD(nasaKey),
            WeatherService.fetch(weatherKey, city),
        ]);

        _data.disasters = disasters;
        _data.neo       = neo;
        _data.cme       = cme;
        _data.apod      = apod;
        _data.weather   = weather;

        _emit('ready', _data);

        // Fire individual events
        if (disasters.length) _emit('disasters', disasters);
        if (neo.length)       _emit('neo', neo);
        if (cme.length)       _emit('cme', cme);
        if (apod)             _emit('apod', apod);
        if (weather)          _emit('weather', weather);

        return _data;
    }

    function updateISS(pos) {
        _data.iss = pos;
        _emit('iss', pos);
    }

    return { loadAll, on, get, updateISS };
})();

window.useNASAData = useNASAData;