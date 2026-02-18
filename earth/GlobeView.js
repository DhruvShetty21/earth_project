// earth/GlobeView.js
// globe.gl Earth — now with location click support

const GlobeView = (() => {
    let _globe             = null;
    let _layers            = { iss: true, disasters: true, neo: true, cme: false, launches: false };
    let _onMarkerClick     = null;
    let _onLocationClick   = null;  // NEW: fires when user clicks empty globe
    let _lastClickWasMarker = false;

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

        // Points layer
        .pointLat(d => d.lat)
        .pointLng(d => d.lng)
        .pointAltitude(d => d.altitude || 0.01)
        .pointRadius(d => d.radius || 0.4)
        .pointColor(d => d.color)
        .pointLabel(d =>
            `<div style="font-family:'Segoe UI',sans-serif;font-size:12px;color:#fff;background:rgba(5,5,18,.92);padding:5px 12px;border-radius:5px;border:1px solid ${d.color};white-space:nowrap">${d.label}</div>`
        )
        .onPointClick(d => {
            _lastClickWasMarker = true;
            if (_onMarkerClick) _onMarkerClick(d);
            setTimeout(() => { _lastClickWasMarker = false; }, 100);
        })

        // Rings
        .ringLat(d => d.lat)
        .ringLng(d => d.lng)
        .ringMaxRadius(d => d.maxR || 3)
        .ringPropagationSpeed(2.5)
        .ringRepeatPeriod(750)
        .ringColor(d => t => `rgba(${d.rgb},${Math.max(0, 1 - t)})`)

        // Labels
        .labelLat(d => d.lat)
        .labelLng(d => d.lng)
        .labelText(d => d.text)
        .labelColor(d => d.color)
        .labelSize(d => d.size || 0.5)
        .labelDotRadius(0.25)
        .labelAltitude(0.022)
        .labelResolution(2)

        // ── LOCATION CLICK ──
        // Fires when user clicks on the globe surface (not a marker)
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

        console.log('[GlobeView] Globe initialized with location click support');
        return _globe;
    }

    function refresh(data, layers) {
        if (!_globe) return;
        if (layers) _layers = { ..._layers, ...layers };
        _globe.pointsData(_buildPoints(data));
        _globe.ringsData(_buildRings(data));
        _globe.labelsData(_buildLabels(data));
    }

    function updateISS(issPos, allData) {
        if (!_globe || !_layers.iss) return;
        _globe.pointsData(_buildPoints({ ...allData, iss: issPos }));
    }

    function setLayer(name, visible, data) {
        _layers[name] = visible;
        refresh(data);
    }

    // In GlobeView.js, update the _buildPoints function to use NEOVisualization

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
    
    // NEOs - Using NEOVisualization
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
                    radius: 0.35,
                    altitude: 0.02,
                    label: `🚀 ${launch.name || 'Launch'}`,
                    type: 'launch',
                    raw: launch
                });
            }
        });
    }
    
    return pts;
}

    function _buildRings(data) {
        if (!_layers.disasters || !data.disasters) return [];
        return data.disasters.slice(0, 25).map(ev => {
            const geo = ev.geometry?.[ev.geometry.length - 1];
            if (!geo?.coordinates) return null;
            const [lng, lat] = geo.coordinates;
            const s = Simplifier.category(ev.categories?.[0]?.title || '');
            return { lat, lng, maxR: 3.5, rgb: s.rgb };
        }).filter(Boolean);
    }

    function _buildLabels(data) {
        const labels = [];
        if (_layers.iss && data.iss) {
            labels.push({ lat: data.iss.lat + 5, lng: data.iss.lng, text: '🛸 ISS', color: '#ffd060', size: 0.45 });
        }
        if (_layers.cme && data.cme?.length > 0) {
            labels.push({ lat: 0, lng: 0, text: `🌩 ${data.cme.length} CME`, color: '#ffaa44', size: 0.5 });
        }
        return labels;
    }

    // Add to GlobeView.js - inside the return object

function updateSatellites(satellitePoints) {
    if (!_globe) return;
    
    // Store satellite points separately
    _satellitePoints = satellitePoints;
    
    // Merge with existing points data
    const currentPoints = _globe.pointsData() || [];
    const nonSatellitePoints = currentPoints.filter(p => p.type !== 'satellite');
    _globe.pointsData([...nonSatellitePoints, ...satellitePoints]);
}

function clearLayer(layerName) {
    if (!_globe) return;
    
    if (layerName === 'satellites') {
        const currentPoints = _globe.pointsData() || [];
        const filteredPoints = currentPoints.filter(p => p.type !== 'satellite');
        _globe.pointsData(filteredPoints);
    }
}

function getViewCenter() {
    if (!_globe) return { lat: 0, lng: 0 };
    // Get camera target or return default
    const controls = _globe.controls();
    if (controls && controls.target) {
        return {
            lat: controls.target.lat || 0,
            lng: controls.target.lng || 0
        };
    }
    return { lat: 0, lng: 0 };
}

let _launchPoints = [];

function updateLaunches(launchData) {
    if (!_globe) return;
    
    // Convert launches to globe points
    _launchPoints = launchData.map(launch => {
        const enhanced = launch.enhanced || {};
        const coordinates = enhanced.coordinates || launch.pad;
        if (!coordinates?.lat || !coordinates?.lng) return null;
        
        return {
            lat: coordinates.lat,
            lng: coordinates.lng,
            altitude: 0.02,
            radius: 0.35,
            color: enhanced.status?.color || '#f97316',
            label: `🚀 ${launch.name || 'Launch'} - ${enhanced.daysUntil > 0 ? LaunchService.formatLaunchDate(launch.net) : enhanced.status?.name}`,
            type: 'launch',
            raw: launch
        };
    }).filter(Boolean);
    
    // Merge with existing points
    const currentPoints = _globe.pointsData() || [];
    const nonLaunchPoints = currentPoints.filter(p => p.type !== 'launch');
    _globe.pointsData([...nonLaunchPoints, ..._launchPoints]);
}

function clearLaunches() {
    if (!_globe) return;
    const currentPoints = _globe.pointsData() || [];
    const filteredPoints = currentPoints.filter(p => p.type !== 'launch');
    _globe.pointsData(filteredPoints);
    _launchPoints = [];
}




    function isReady() { return !!_globe; }

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
    isReady
};
})();

window.GlobeView = GlobeView;