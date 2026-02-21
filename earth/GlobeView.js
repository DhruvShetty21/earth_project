// earth/GlobeView.js
// globe.gl Earth — with location click + pin support

const GlobeView = (() => {
    let _globe              = null;
    let _layers             = { iss: true, disasters: true, neo: true, cme: false, launches: false };
    let _onMarkerClick      = null;
    let _onLocationClick    = null;
    let _lastClickWasMarker = false;
    let _locationPin        = null;
    let _pinActive          = false;   // FIX: was `pin_active` — wrong name caused ReferenceError
    let _launchPoints       = [];
    let _satellitePoints    = [];

    // ─── init ────────────────────────────────────────────────────────────────
    function init(containerId, onMarkerClick, onLocationClick) {
        _onMarkerClick   = onMarkerClick;
        _onLocationClick = onLocationClick;

        _globe = Globe({ rendererConfig: { antialias: true, alpha: false } })(
            document.getElementById(containerId)
        )
        .width(window.innerWidth)
        .height(window.innerHeight)
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
        .showAtmosphere(true)
        .atmosphereColor('#3388ff')
        .atmosphereAltitude(0.16)

        // Points
        .pointLat(d => d.lat)
        .pointLng(d => d.lng)
        .pointAltitude(d => d.altitude || 0.01)
        .pointRadius(d => d.radius || 0.4)
        .pointColor(d => d.color)
        .pointLabel(d => {
            // Pin points supply their own full HTML; others get the default wrapper
            if (d.type === 'location-pin') return d.label || '';
            return `<div style="font-family:'Segoe UI',sans-serif;font-size:12px;color:#fff;background:rgba(5,5,18,.92);padding:5px 12px;border-radius:5px;border:1px solid ${d.color};white-space:nowrap">${d.label}</div>`;
        })
        .onPointClick(d => {
            _lastClickWasMarker = true;
            if (_onMarkerClick) _onMarkerClick(d);
            setTimeout(() => { _lastClickWasMarker = false; }, 100);
        })

        // Rings
        .ringLat(d => d.lat)
        .ringLng(d => d.lng)
        .ringMaxRadius(d => d.maxR || 3)
        .ringPropagationSpeed(d => d.propagationSpeed || 2.5)
        .ringRepeatPeriod(d => d.repeatPeriod || 750)
        .ringColor(d => t => `rgba(${d.rgb},${Math.max(0, 1 - t)})`)

        // Labels
        .labelLat(d => d.lat)
        .labelLng(d => d.lng)
        .labelText(d => d.text)
        .labelColor(d => d.color)
        .labelSize(d => d.size || 0.5)
        .labelDotRadius(d => d.type === 'pin-label' ? 0 : 0.25)  // FIX: no dot for pin label — it rendered as a second stray point
        .labelAltitude(0.022)
        .labelResolution(2)

        // Globe click (not on a marker)
        .onGlobeClick(({ lat, lng }) => {
            if (_lastClickWasMarker) return;
            if (_onLocationClick) _onLocationClick(lat, lng);
        });

        // Enhance globe material
        const mat = _globe.globeMaterial();
        mat.bumpScale = 10;
        const loader = new THREE.TextureLoader();
        loader.load('https://unpkg.com/three-globe/example/img/earth-water.png', tex => {
            mat.specularMap = tex;
            mat.specular    = new THREE.Color('grey');
            mat.shininess   = 20;
        });

        _globe.controls().autoRotate      = true;
        _globe.controls().autoRotateSpeed = 0.3;
        _globe.controls().enableZoom      = true;
        _globe.controls().minDistance     = 150;
        _globe.controls().maxDistance     = 700;

        window.addEventListener('resize', () => {
            _globe.width(window.innerWidth).height(window.innerHeight);
        });

        console.log('[GlobeView] Initialized');
        return _globe;
    }

    // ─── refresh ─────────────────────────────────────────────────────────────
    // FIX: rebuild rings = disaster rings + pin rings (if active)
    // Previously refresh() called _buildRings() alone, wiping pin rings on every update.
    function refresh(data, layers) {
        if (!_globe) return;
        if (layers) _layers = { ..._layers, ...layers };

        _globe.pointsData(_buildPoints(data));
        _globe.labelsData(_buildLabels(data));

        // Always merge disaster rings + pin rings so neither wipes the other
        _globe.ringsData(_buildAllRings(data));
    }

    // ─── ISS live update ─────────────────────────────────────────────────────
    function updateISS(issPos, allData) {
        if (!_globe || !_layers.iss) return;
        _globe.pointsData(_buildPoints({ ...allData, iss: issPos }));
    }

    // ─── layer toggle ─────────────────────────────────────────────────────────
    function setLayer(name, visible, data) {
        _layers[name] = visible;
        refresh(data);
    }

    // ─── points builder ───────────────────────────────────────────────────────
    function _buildPoints(data) {
        const pts = [];

        // ISS
        if (_layers.iss && data.iss) {
            pts.push({
                lat: data.iss.lat, lng: data.iss.lng,
                color: '#ffd060', radius: 0.55, altitude: 0.055,
                label: `🛸 ISS — ${data.iss.lat.toFixed(2)}°, ${data.iss.lng.toFixed(2)}° ${data.iss.live === false ? '(offline)' : '· LIVE'}`,
                type: 'iss', raw: data.iss,
            });
        }

        // Disasters
        if (_layers.disasters && data.disasters) {
            data.disasters.forEach(ev => {
                const geo = ev.geometry?.[ev.geometry.length - 1];
                if (!geo?.coordinates) return;
                const [lng, lat] = geo.coordinates;
                const cat = ev.categories?.[0]?.title || 'Unknown';
                const s = Simplifier.category(cat);
                pts.push({
                    lat, lng, color: s.color, radius: 0.38, altitude: 0.01,
                    label: `${s.icon} ${ev.title}`, type: 'disaster', raw: ev, style: s, cat
                });
            });
        }

        // NEOs
        if (_layers.neo && data.neo && window.NEOVisualization) {
            const neoPoints = NEOVisualization.neoToGlobePoints(data.neo, 50);
            pts.push(...neoPoints);
        }

        // Launches
        if (_layers.launches && data.launches) {
            data.launches.forEach(launch => {
                if (launch.enhanced?.coordinates) {
                    pts.push({
                        lat: launch.enhanced.coordinates.lat,
                        lng: launch.enhanced.coordinates.lng,
                        color: launch.enhanced.status?.color || '#f97316',
                        radius: 0.35, altitude: 0.02,
                        label: `🚀 ${launch.name || 'Launch'}`,
                        type: 'launch', raw: launch
                    });
                }
            });
        }

        // Location pin point (preserve across refreshes)
        if (_pinActive && _locationPin) {
            pts.push({
                lat:      _locationPin.lat,
                lng:      _locationPin.lng,
                color:    '#00ffcc',
                radius:   0.45,
                altitude: 0.01,
                label:    `📍 ${_locationPin.label}`,
                type:     'location-pin',
                raw:      _locationPin
            });
        }

        return pts;
    }

    // ─── rings builder ────────────────────────────────────────────────────────
    function _buildDisasterRings(data) {
        if (!_layers.disasters || !data.disasters) return [];
        return data.disasters.slice(0, 25).map(ev => {
            const geo = ev.geometry?.[ev.geometry.length - 1];
            if (!geo?.coordinates) return null;
            const [lng, lat] = geo.coordinates;
            const s = Simplifier.category(ev.categories?.[0]?.title || '');
            return { lat, lng, maxR: 3.5, rgb: s.rgb };   // no type = disaster ring
        }).filter(Boolean);
    }

    function _buildPinRings() {
        if (!_pinActive || !_locationPin) return [];
        return [
            {
                lat:              _locationPin.lat,
                lng:              _locationPin.lng,
                maxR:             3,
                propagationSpeed: 1.5,
                repeatPeriod:     600,
                rgb:              '0,255,200',
                type:             'pin-ring'
            },
            {
                lat:              _locationPin.lat,
                lng:              _locationPin.lng,
                maxR:             5.5,
                propagationSpeed: 1.5,
                repeatPeriod:     900,
                rgb:              '0,200,255',
                type:             'pin-ring'
            }
        ];
    }

    // FIX: single source of truth for ringsData — always disaster + pin
    function _buildAllRings(data) {
        return [..._buildDisasterRings(data), ..._buildPinRings()];
    }

    // ─── labels builder ───────────────────────────────────────────────────────
    function _buildLabels(data) {
        const labels = [];
        if (_layers.iss && data.iss) {
            labels.push({ lat: data.iss.lat + 5, lng: data.iss.lng, text: '🛸 ISS', color: '#ffd060', size: 0.45 });
        }
        if (_layers.cme && data.cme?.length > 0) {
            labels.push({ lat: 0, lng: 0, text: `🌩 ${data.cme.length} CME`, color: '#ffaa44', size: 0.5 });
        }
        // Pin label — NO emoji prefix (WebGL renders 📍 as "?" square)
        // The glowing point dot already marks the spot visually
        if (_pinActive && _locationPin) {
            labels.push({
                lat:   _locationPin.lat + 3.5,
                lng:   _locationPin.lng,
                text:  _locationPin.label,   // plain text only
                color: '#00ffcc',
                size:  0.48,
                type:  'pin-label'
            });
        }
        return labels;
    }

    // ─── setLocationPin ───────────────────────────────────────────────────────
    function setLocationPin(pin) {
        _locationPin = pin;
        _pinActive   = !!pin;
        if (!_globe) return;

        if (pin) {
            // Points: strip old pin, add new
            const existingPoints = (_globe.pointsData() || []).filter(p => p.type !== 'location-pin');
            _globe.pointsData([
                ...existingPoints,
                {
                    lat:      pin.lat,
                    lng:      pin.lng,
                    color:    '#00ffcc',
                    radius:   0.45,
                    altitude: 0.01,
                    label:    `📍 ${pin.label}`,
                    type:     'location-pin',
                    raw:      pin
                }
            ]);

            // Labels: strip old pin label, add new
            const existingLabels = (_globe.labelsData() || []).filter(l => l.type !== 'pin-label');
            _globe.labelsData([
                ...existingLabels,
                {
                    lat:   pin.lat + 3.5,
                    lng:   pin.lng,
                    text:  pin.label,   // no emoji — WebGL renders 📍 as "?"
                    color: '#00ffcc',
                    size:  0.48,
                    type:  'pin-label'
                }
            ]);

            // Rings: strip old pin rings only, keep disaster rings intact
            const disasterRings = (_globe.ringsData() || []).filter(r => r.type !== 'pin-ring');
            _globe.ringsData([
                ...disasterRings,
                ..._buildPinRings()
            ]);

        } else {
            // Clear pin from all layers
            _globe.pointsData((_globe.pointsData() || []).filter(p => p.type !== 'location-pin'));
            _globe.labelsData((_globe.labelsData() || []).filter(l => l.type !== 'pin-label'));
            _globe.ringsData((_globe.ringsData()   || []).filter(r => r.type !== 'pin-ring'));
        }
    }

    // ─── satellites ───────────────────────────────────────────────────────────
    function updateSatellites(satellitePoints) {
        if (!_globe) return;
        _satellitePoints = satellitePoints;
        const current = (_globe.pointsData() || []).filter(p => p.type !== 'satellite');
        _globe.pointsData([...current, ...satellitePoints]);
    }

    function clearLayer(layerName) {
        if (!_globe) return;
        if (layerName === 'satellites') {
            _globe.pointsData((_globe.pointsData() || []).filter(p => p.type !== 'satellite'));
        }
    }

    // ─── launches ─────────────────────────────────────────────────────────────
    function updateLaunches(launchData) {
        if (!_globe) return;
        _launchPoints = launchData.map(launch => {
            const enhanced    = launch.enhanced || {};
            const coordinates = enhanced.coordinates || launch.pad;
            if (!coordinates?.lat || !coordinates?.lng) return null;
            return {
                lat: coordinates.lat, lng: coordinates.lng,
                altitude: 0.02, radius: 0.35,
                color: enhanced.status?.color || '#f97316',
                label: `🚀 ${launch.name || 'Launch'} - ${enhanced.daysUntil > 0 ? LaunchService.formatLaunchDate(launch.net) : enhanced.status?.name}`,
                type: 'launch', raw: launch
            };
        }).filter(Boolean);
        const current = (_globe.pointsData() || []).filter(p => p.type !== 'launch');
        _globe.pointsData([...current, ..._launchPoints]);
    }

    function clearLaunches() {
        if (!_globe) return;
        _globe.pointsData((_globe.pointsData() || []).filter(p => p.type !== 'launch'));
        _launchPoints = [];
    }

    // ─── misc ──────────────────────────────────────────────────────────────────
    function getViewCenter() {
        if (!_globe) return { lat: 0, lng: 0 };
        const controls = _globe.controls();
        if (controls?.target) return { lat: controls.target.lat || 0, lng: controls.target.lng || 0 };
        return { lat: 0, lng: 0 };
    }

    function isReady() { return !!_globe; }

    // ─── public API ────────────────────────────────────────────────────────────
    return {
        init,
        refresh,
        updateISS,
        setLayer,
        updateSatellites,
        updateLaunches,
        clearLaunches,
        clearLayer,
        getViewCenter,
        isReady,
        setLocationPin,
        _getGlobeInstance: () => _globe
    };
})();

window.GlobeView = GlobeView;