// engine/locationEvents.js
// Location-aware astronomical events database with geographic filtering

const LocationEvents = (() => {
    // Astronomical events database with geographic visibility
    const ASTRONOMICAL_EVENTS = [
        // Meteor Showers
        {
            id: 'perseids-2025',
            title: 'Perseid Meteor Shower Peak',
            type: 'meteor_shower',
            startDate: '2025-07-17',
            peakDate: '2025-08-12',
            endDate: '2025-08-24',
            hemisphere: 'northern',
            latMin: 10,
            latMax: 70,
            baseVisibilityScore: 9,
            description: 'One of the best meteor showers of the year. Up to 100 meteors per hour at peak. Best viewed after midnight in dark skies.',
            viewingTips: 'Find a dark location away from city lights. Lie back and look straight up. The radiant is in constellation Perseus.',
            moonInterference: 'New moon in 2025 - excellent conditions',
        },
        {
            id: 'geminids-2025',
            title: 'Geminid Meteor Shower Peak',
            type: 'meteor_shower',
            startDate: '2025-12-04',
            peakDate: '2025-12-14',
            endDate: '2025-12-17',
            hemisphere: 'both',
            latMin: -90,
            latMax: 90,
            baseVisibilityScore: 9,
            description: 'Strong, reliable meteor shower. Often 100+ meteors per hour. Bright meteors and fireballs common.',
            viewingTips: 'Bundle up! December nights are cold. The radiant is in Gemini, which rises around sunset.',
            moonInterference: 'Waning crescent moon - minimal interference',
        },
        {
            id: 'quadrantids-2026',
            title: 'Quadrantid Meteor Shower Peak',
            type: 'meteor_shower',
            startDate: '2026-01-01',
            peakDate: '2026-01-03',
            endDate: '2026-01-05',
            hemisphere: 'northern',
            latMin: 30,
            latMax: 90,
            baseVisibilityScore: 7,
            description: 'Short, sharp peak (only ~6 hours). Best in Northern Hemisphere. Can produce 60-120 meteors per hour.',
            viewingTips: 'Timing is critical - the narrow peak window means you need to observe at the right moment.',
            moonInterference: 'Full moon - significant interference',
        },
        {
            id: 'lyrids-2025',
            title: 'Lyrid Meteor Shower Peak',
            type: 'meteor_shower',
            startDate: '2025-04-16',
            peakDate: '2025-04-22',
            endDate: '2025-04-25',
            hemisphere: 'northern',
            latMin: 10,
            latMax: 70,
            baseVisibilityScore: 7,
            description: 'One of the oldest known showers. Typically 10–20 meteors per hour at peak, with occasional outbursts.',
            viewingTips: 'The radiant is in Lyra, which rises in late evening. Best viewing after midnight.',
            moonInterference: 'Waning crescent - minimal',
        },
        {
            id: 'orionids-2025',
            title: 'Orionid Meteor Shower Peak',
            type: 'meteor_shower',
            startDate: '2025-10-02',
            peakDate: '2025-10-21',
            endDate: '2025-11-07',
            hemisphere: 'both',
            latMin: -90,
            latMax: 90,
            baseVisibilityScore: 7,
            description: 'Produced by Halley\'s Comet debris. Fast meteors, sometimes with persistent trains.',
            viewingTips: 'Look away from the radiant in Orion for longer streaks. Best after midnight.',
            moonInterference: 'Waxing crescent - good conditions',
        },
        {
            id: 'leonids-2025',
            title: 'Leonid Meteor Shower Peak',
            type: 'meteor_shower',
            startDate: '2025-11-06',
            peakDate: '2025-11-17',
            endDate: '2025-11-30',
            hemisphere: 'both',
            latMin: -90,
            latMax: 90,
            baseVisibilityScore: 6,
            description: 'Known for occasional storms (every 33 years). Normally 15-20 meteors per hour.',
            viewingTips: 'Best viewed in early morning hours. Meteors appear to radiate from Leo.',
            moonInterference: 'Waning crescent - minimal',
        },
        
        // Eclipses
        {
            id: 'solar-eclipse-2025-03',
            title: 'Total Solar Eclipse',
            type: 'eclipse',
            date: '2025-03-29',
            visibilityRegions: ['Europe', 'North Africa', 'Russia'],
            latMin: 35,
            latMax: 70,
            lonMin: -20,
            lonMax: 60,
            baseVisibilityScore: 10,
            description: 'Total solar eclipse visible from parts of Europe and North Africa. Path of totality crosses Spain, France, Italy, Balkans, Russia.',
            viewingTips: 'Use proper solar filters for partial phases. During totality, remove filters to see corona.',
            duration: 'Up to 4 minutes 30 seconds',
        },
        {
            id: 'solar-eclipse-2025-09',
            title: 'Annular Solar Eclipse',
            type: 'eclipse',
            date: '2025-09-21',
            visibilityRegions: ['Pacific', 'South America', 'Antarctica'],
            latMin: -80,
            latMax: 10,
            lonMin: -180,
            lonMax: 180,
            baseVisibilityScore: 8,
            description: 'Annular eclipse where Moon covers Sun\'s center, creating "ring of fire" effect.',
            viewingTips: 'View with proper solar filters throughout. Best viewed from Pacific Ocean region.',
            duration: 'Up to 7 minutes',
        },
        {
            id: 'lunar-eclipse-2025-03',
            title: 'Penumbral Lunar Eclipse',
            type: 'eclipse',
            date: '2025-03-14',
            visibilityRegions: ['Americas', 'Europe', 'Africa'],
            latMin: -60,
            latMax: 70,
            lonMin: -120,
            lonMax: 60,
            baseVisibilityScore: 6,
            description: 'Penumbral eclipse of the Moon. Visible from Americas, Europe, Africa. Subtle darkening of the lunar disk.',
            viewingTips: 'Look for subtle shading on one side of the Moon. No special equipment needed.',
        },
        {
            id: 'lunar-eclipse-2025-09',
            title: 'Total Lunar Eclipse - Blood Moon',
            type: 'eclipse',
            date: '2025-09-07',
            visibilityRegions: ['Americas', 'Europe', 'Africa', 'Asia'],
            latMin: -60,
            latMax: 70,
            baseVisibilityScore: 9,
            description: 'Total lunar eclipse visible across most of the world. Moon will take on a reddish "blood moon" color.',
            viewingTips: 'No special equipment needed. Eclipse visible to naked eye. Best viewing in dark location.',
            duration: 'Totality lasts 1 hour 22 minutes',
        },
        
        // Planetary Events
        {
            id: 'mars-opposition-2025',
            title: 'Mars at Opposition',
            type: 'planetary',
            date: '2025-01-16',
            hemisphere: 'both',
            latMin: -90,
            latMax: 90,
            baseVisibilityScore: 8,
            description: 'Mars is directly opposite the Sun, making it appear larger and brighter. Best time to observe the Red Planet.',
            viewingTips: 'Any telescope will show surface details. Look for polar ice caps and dark markings.',
            magnitude: -1.5,
        },
        {
            id: 'jupiter-opposition-2025',
            title: 'Jupiter at Opposition',
            type: 'planetary',
            date: '2025-12-07',
            hemisphere: 'both',
            latMin: -90,
            latMax: 90,
            baseVisibilityScore: 9,
            description: 'Jupiter at its closest and brightest. Great opportunity to observe the Great Red Spot and Galilean moons.',
            viewingTips: 'Even small telescopes show cloud bands and moons. Look for shadow transits of moons.',
            magnitude: -2.8,
        },
        {
            id: 'saturn-opposition-2025',
            title: 'Saturn at Opposition',
            type: 'planetary',
            date: '2025-09-21',
            hemisphere: 'both',
            latMin: -90,
            latMax: 90,
            baseVisibilityScore: 9,
            description: 'Saturn\'s rings are tilted for spectacular viewing. Best time to observe the ringed planet.',
            viewingTips: 'Any telescope will show rings. Look for Cassini Division and subtle banding on the planet.',
            magnitude: 0.4,
        },
        {
            id: 'venus-elongation-2025',
            title: 'Venus at Greatest Eastern Elongation',
            type: 'planetary',
            date: '2025-06-04',
            hemisphere: 'both',
            latMin: -90,
            latMax: 90,
            baseVisibilityScore: 7,
            description: 'Venus appears highest above horizon after sunset. Brilliant "evening star" visible.',
            viewingTips: 'Look west after sunset. Venus will be unmistakable - the brightest object after Moon.',
        },
        
        // Supermoons
        {
            id: 'supermoon-2025-09',
            title: 'Harvest Supermoon',
            type: 'moon',
            date: '2025-09-18',
            hemisphere: 'both',
            latMin: -90,
            latMax: 90,
            baseVisibilityScore: 8,
            description: 'Full Moon near perigee. Slightly larger (14%) and brighter (30%) than average. Good for naked-eye and binocular viewing.',
            viewingTips: 'Best viewed near horizon where moon illusion makes it appear even larger.',
            distance: '357,000 km',
        },
        {
            id: 'supermoon-2025-10',
            title: 'Hunter\'s Supermoon',
            type: 'moon',
            date: '2025-10-17',
            hemisphere: 'both',
            latMin: -90,
            latMax: 90,
            baseVisibilityScore: 8,
            description: 'Second of three supermoons in 2025. Moon appears larger than average.',
            viewingTips: 'Perfect for photography - capture it rising behind landmarks.',
            distance: '358,000 km',
        },
        {
            id: 'supermoon-2025-11',
            title: 'Beaver Supermoon',
            type: 'moon',
            date: '2025-11-15',
            hemisphere: 'both',
            latMin: -90,
            latMax: 90,
            baseVisibilityScore: 8,
            description: 'Final supermoon of 2025. Moon appears larger and brighter than average.',
            viewingTips: 'Best viewed at moonrise when near horizon.',
            distance: '356,000 km',
        },
        
        // Comets (predicted)
        {
            id: 'comet-2025',
            title: 'Comet C/2023 A3 (Tsuchinshan-ATLAS)',
            type: 'comet',
            startDate: '2025-09-01',
            peakDate: '2025-10-15',
            endDate: '2025-12-01',
            hemisphere: 'southern',
            latMin: -90,
            latMax: -20,
            baseVisibilityScore: 6,
            description: 'Potential naked-eye comet. May become visible to naked eye in October. Best viewed from southern hemisphere.',
            viewingTips: 'Binoculars recommended. Look low in eastern sky before dawn.',
            predictedMagnitude: 3.5,
        },
        
        // Conjunctions
        {
            id: 'venus-jupiter-2025',
            title: 'Venus-Jupiter Conjunction',
            type: 'conjunction',
            date: '2025-08-12',
            hemisphere: 'both',
            latMin: -90,
            latMax: 90,
            baseVisibilityScore: 7,
            description: 'Venus and Jupiter appear extremely close in the sky - a spectacular sight.',
            viewingTips: 'Look west after sunset. The two brightest planets will be close enough to fit in same telescope field.',
            separation: '0.5 degrees',
        },
        {
            id: 'moon-mars-2025',
            title: 'Moon Occults Mars',
            type: 'conjunction',
            date: '2025-02-09',
            visibilityRegions: ['North America', 'Europe'],
            latMin: 20,
            latMax: 70,
            lonMin: -120,
            lonMax: 30,
            baseVisibilityScore: 8,
            description: 'Moon passes directly in front of Mars, hiding it from view temporarily.',
            viewingTips: 'Timing varies by location. Check local predictions. Visible to naked eye.',
        },
    ];

    // Light pollution database (simplified - in production use Light Pollution Map API)
    const MAJOR_CITIES = [
        { name: 'New York', lat: 40.71, lon: -74.01, population: 8.4e6 },
        { name: 'Los Angeles', lat: 34.05, lon: -118.24, population: 3.8e6 },
        { name: 'London', lat: 51.51, lon: -0.13, population: 8.9e6 },
        { name: 'Paris', lat: 48.86, lon: 2.35, population: 2.1e6 },
        { name: 'Tokyo', lat: 35.68, lon: 139.76, population: 14e6 },
        { name: 'Shanghai', lat: 31.23, lon: 121.47, population: 24e6 },
        { name: 'Mumbai', lat: 19.08, lon: 72.88, population: 20e6 },
        { name: 'Delhi', lat: 28.61, lon: 77.23, population: 31e6 },
        { name: 'Sydney', lat: -33.87, lon: 151.21, population: 5.3e6 },
        { name: 'Sao Paulo', lat: -23.55, lon: -46.63, population: 12e6 },
        { name: 'Moscow', lat: 55.76, lon: 37.62, population: 12e6 },
        { name: 'Cairo', lat: 30.04, lon: 31.24, population: 20e6 },
        { name: 'Mexico City', lat: 19.43, lon: -99.13, population: 21e6 },
        { name: 'Lagos', lat: 6.45, lon: 3.40, population: 14e6 },
        { name: 'Istanbul', lat: 41.01, lon: 28.98, population: 15e6 },
    ];

    // Space agency locations for region-specific facts
    const SPACE_AGENCIES = [
        { name: 'NASA Kennedy Space Center', lat: 28.57, lon: -80.65, country: 'USA', agencies: ['NASA'] },
        { name: 'ESA Kourou', lat: 5.16, lon: -52.65, country: 'French Guiana', agencies: ['ESA', 'Arianespace'] },
        { name: 'Baikonur Cosmodrome', lat: 45.96, lon: 63.31, country: 'Kazakhstan', agencies: ['Roscosmos'] },
        { name: 'JAXA Tanegashima', lat: 30.38, lon: 130.96, country: 'Japan', agencies: ['JAXA'] },
        { name: 'ISRO Satish Dhawan', lat: 13.73, lon: 80.23, country: 'India', agencies: ['ISRO'] },
        { name: 'CNSA Jiuquan', lat: 40.96, lon: 100.29, country: 'China', agencies: ['CNSA'] },
        { name: 'Vandenberg SFB', lat: 34.73, lon: -120.57, country: 'USA', agencies: ['NASA', 'SpaceX', 'USSF'] },
        { name: 'Cape Canaveral', lat: 28.39, lon: -80.60, country: 'USA', agencies: ['NASA', 'SpaceX', 'ULA'] },
        { name: 'Wallops Flight Facility', lat: 37.85, lon: -75.47, country: 'USA', agencies: ['NASA', 'Rocket Lab'] },
        { name: 'Mahia Launch Complex', lat: -39.26, lon: 177.86, country: 'New Zealand', agencies: ['Rocket Lab'] },
        { name: 'Sutherland Spaceport', lat: -32.38, lon: 20.81, country: 'South Africa', agencies: ['SANSA'] },
        { name: 'Andøya Space', lat: 69.29, lon: 16.02, country: 'Norway', agencies: ['Andøya', 'ESA'] },
        { name: 'Esrange', lat: 67.89, lon: 21.10, country: 'Sweden', agencies: ['SSC', 'ESA'] },
    ];

    // Observatory locations
    const OBSERVATORIES = [
        { name: 'Mauna Kea Observatories', lat: 19.82, lon: -155.47, altitude: 4205 },
        { name: 'Paranal Observatory', lat: -24.63, lon: -70.40, altitude: 2635 },
        { name: 'La Silla Observatory', lat: -29.26, lon: -70.73, altitude: 2400 },
        { name: 'Cerro Tololo', lat: -30.17, lon: -70.80, altitude: 2200 },
        { name: 'Roque de los Muchachos', lat: 28.76, lon: -17.88, altitude: 2396 },
        { name: 'Teide Observatory', lat: 28.30, lon: -16.51, altitude: 2390 },
        { name: 'Kitt Peak', lat: 31.96, lon: -111.60, altitude: 2096 },
        { name: 'Palomar Observatory', lat: 33.36, lon: -116.86, altitude: 1706 },
        { name: 'Mount Wilson', lat: 34.22, lon: -118.06, altitude: 1742 },
        { name: 'Arecibo (inactive)', lat: 18.34, lon: -66.75, altitude: 497 },
        { name: 'Green Bank Observatory', lat: 38.43, lon: -79.82, altitude: 807 },
        { name: 'SKA Site', lat: -30.72, lon: 21.41, altitude: 1000 },
        { name: 'ALMA', lat: -23.02, lon: -67.75, altitude: 5058 },
    ];

    // Helper: Calculate distance between two lat/lon points (Haversine formula)
    function _haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Check if event is visible from given coordinates
    function _isEventVisible(event, lat, lon) {
        // Check hemisphere
        if (event.hemisphere === 'northern' && lat < 0) return false;
        if (event.hemisphere === 'southern' && lat > 0) return false;
        
        // Check latitude range
        if (event.latMin !== undefined && lat < event.latMin) return false;
        if (event.latMax !== undefined && lat > event.latMax) return false;
        
        // Check longitude range (for region-specific events like eclipses)
        if (event.lonMin !== undefined && event.lonMax !== undefined) {
            if (event.lonMin <= event.lonMax) {
                if (lon < event.lonMin || lon > event.lonMax) return false;
            } else {
                // Handles wrap-around (e.g., 160° to -160°)
                if (lon < event.lonMin && lon > event.lonMax) return false;
            }
        }
        
        return true;
    }

    // Calculate location-specific visibility score
    function _calculateVisibilityScore(event, lat) {
        let score = event.baseVisibilityScore || 5;
        const absLat = Math.abs(lat);
        
        // Adjust score based on event type and location
        switch (event.type) {
            case 'meteor_shower':
                // Better at higher latitudes (longer nights)
                if (absLat > 50) score += 1;
                else if (absLat < 20) score -= 1;
                break;
                
            case 'eclipse':
                // If in path of totality, max score
                if (event.latMin && event.latMax) {
                    if (lat >= event.latMin && lat <= event.latMax) {
                        score = 10;
                    } else {
                        score = 4; // Partial eclipse only
                    }
                }
                break;
                
            case 'planetary':
                // Planets lower in sky at poles
                if (absLat > 70) score -= 2;
                else if (absLat > 60) score -= 1;
                break;
                
            case 'comet':
                // Comets better at their designated hemisphere
                if (event.hemisphere === 'northern' && lat > 30) score += 1;
                else if (event.hemisphere === 'southern' && lat < -30) score += 1;
                break;
        }
        
        return Math.max(1, Math.min(10, Math.round(score)));
    }

    // Get events visible from a specific location
    function getEventsForLocation(lat, lon, startDate = null, endDate = null) {
        const today = new Date();
        const start = startDate ? new Date(startDate) : today;
        const end = endDate ? new Date(endDate) : new Date(today.setMonth(today.getMonth() + 3)); // 3 months default
        
        const events = [];
        
        ASTRONOMICAL_EVENTS.forEach(event => {
            // Check geographic visibility
            if (!_isEventVisible(event, lat, lon)) return;
            
            // Check date range
            const eventDate = new Date(event.date || event.peakDate || event.startDate);
            if (eventDate >= start && eventDate <= end) {
                const eventCopy = { ...event };
                eventCopy.visibilityScore = _calculateVisibilityScore(event, lat);
                eventCopy.bestViewingTime = _getBestViewingTime(event, lat);
                events.push(eventCopy);
            }
        });
        
        // Sort by date
        events.sort((a, b) => {
            const dateA = new Date(a.date || a.peakDate || a.startDate);
            const dateB = new Date(b.date || b.peakDate || b.startDate);
            return dateA - dateB;
        });
        
        return events;
    }

    // Get space agencies near location
    function getNearbySpaceAgencies(lat, lon, radiusKm = 1000) {
        const nearby = [];
        
        SPACE_AGENCIES.forEach(agency => {
            const dist = _haversineDistance(lat, lon, agency.lat, agency.lon);
            if (dist <= radiusKm) {
                nearby.push({
                    ...agency,
                    distanceKm: Math.round(dist)
                });
            }
        });
        
        return nearby.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    // Get observatories near location
    function getNearbyObservatories(lat, lon, radiusKm = 1000) {
        const nearby = [];
        
        OBSERVATORIES.forEach(obs => {
            const dist = _haversineDistance(lat, lon, obs.lat, obs.lon);
            if (dist <= radiusKm) {
                nearby.push({
                    ...obs,
                    distanceKm: Math.round(dist)
                });
            }
        });
        
        return nearby.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    // Estimate light pollution at location
    function estimateLightPollution(lat, lon) {
        // Find nearest major city
        let minDist = Infinity;
        let nearestCity = null;
        
        MAJOR_CITIES.forEach(city => {
            const dist = _haversineDistance(lat, lon, city.lat, city.lon);
            if (dist < minDist) {
                minDist = dist;
                nearestCity = city;
            }
        });
        
        // Calculate Bortle scale and visibility based on distance
        let bortle, level, score, desc;
        
        if (minDist < 30) {
            bortle = 8;
            level = 'Severe';
            score = 20;
            desc = 'Inner city - only Moon, planets, brightest stars visible';
        } else if (minDist < 80) {
            bortle = 7;
            level = 'High';
            score = 35;
            desc = 'City/suburb transition - Milky Way invisible';
        } else if (minDist < 150) {
            bortle = 6;
            level = 'Moderate';
            score = 50;
            desc = 'Bright suburban - Milky Way faint at zenith';
        } else if (minDist < 300) {
            bortle = 5;
            level = 'Low';
            score = 65;
            desc = 'Suburban/rural transition - some Milky Way visible';
        } else if (minDist < 500) {
            bortle = 4;
            level = 'Minimal';
            score = 80;
            desc = 'Rural - Milky Way clearly visible';
        } else {
            bortle = 3;
            level = 'Dark';
            score = 95;
            desc = 'Dark sky - excellent for deep sky observing';
        }
        
        return {
            bortle,
            level,
            score,
            description: desc,
            nearestCity: nearestCity ? nearestCity.name : 'None',
            distanceToCityKm: Math.round(minDist),
        };
    }

    // Get region-specific space facts
    function getRegionSpaceFacts(lat, lon) {
        const facts = [];
        const absLat = Math.abs(lat);
        
        // Latitude-based facts
        if (absLat > 66.5) {
            facts.push({
                icon: '❄️',
                text: 'Inside the Arctic/Antarctic Circle - experiences midnight sun in summer and polar night in winter. Satellites in polar orbits pass overhead frequently.',
            });
        }
        
        if (absLat > 50 && absLat < 70) {
            facts.push({
                icon: '🌌',
                text: 'Prime aurora territory. During geomagnetic storms, charged particles create spectacular light shows in the ionosphere.',
            });
        }
        
        if (absLat < 10) {
            facts.push({
                icon: '🚀',
                text: 'Near-equatorial location provides extra 1,670 km/h boost from Earth\'s rotation for eastward launches - reason major spaceports are near equator.',
            });
        }
        
        // South Atlantic Anomaly
        if (lat > -50 && lat < -10 && lon > -90 && lon < 40) {
            facts.push({
                icon: '🧲',
                text: 'South Atlantic Anomaly - weakened magnetic field region causes satellites to experience increased radiation and occasional glitches.',
            });
        }
        
        // Major spaceports by region
        const spaceports = getNearbySpaceAgencies(lat, lon, 2000);
        if (spaceports.length > 0) {
            facts.push({
                icon: '🛰',
                text: `Near ${spaceports[0].name} (${spaceports[0].distanceKm} km away) - ${spaceports[0].agencies.join(', ')} launch site.`,
            });
        }
        
        // Observatories
        const observatories = getNearbyObservatories(lat, lon, 2000);
        if (observatories.length > 0) {
            facts.push({
                icon: '🔭',
                text: `Near ${observatories[0].name} - major astronomical observatory at ${observatories[0].altitude}m altitude.`,
            });
        }
        
        // If no region-specific facts, add general ones
        if (facts.length === 0) {
            facts.push({
                icon: '🌐',
                text: `This latitude receives about ${Math.round(342 * Math.cos(lat * Math.PI/180))} W/m² average solar irradiance - key for climate modeling.`,
            });
            facts.push({
                icon: '🛰',
                text: 'NASA\'s Landsat program has photographed every point on Earth every 16 days since 1972 - the longest continuous satellite record.',
            });
        }
        
        return facts.slice(0, 4); // Return top 4 facts
    }

    // Get best viewing time based on location and event type
    function _getBestViewingTime(event, lat) {
        const absLat = Math.abs(lat);
        const month = new Date().getMonth();
        
        switch (event.type) {
            case 'meteor_shower':
                return 'Best viewing after midnight until dawn, when radiant is highest';
            case 'eclipse':
                return 'Check local timing - varies by location';
            case 'planetary':
                if (absLat > 60) return 'Visible in evening - but low in sky';
                return 'Best around midnight when highest in sky';
            case 'moon':
                return 'Best viewed at moonrise/moonset near horizon for optical illusion';
            case 'comet':
                return 'Best in early morning before dawn';
            default:
                if (absLat > 60) {
                    return month > 9 || month < 3 ? 'Long winter nights - excellent' : 'Summer - limited night hours';
                }
                return 'Evening hours after sunset, when sky is dark';
        }
    }

    // Get comprehensive location analysis for the location panel
    function getLocationAnalysis(lat, lon, weatherData = null) {
        const absLat = Math.abs(lat);
        const today = new Date();
        
        // Upcoming events for this location
        const upcomingEvents = getEventsForLocation(lat, lon, today, new Date(today.setMonth(today.getMonth() + 1)));
        
        // Light pollution estimate
        const lightPollution = estimateLightPollution(lat, lon);
        
        // Region space facts
        const regionFacts = getRegionSpaceFacts(lat, lon);
        
        // Nearby space infrastructure
        const nearbySpaceports = getNearbySpaceAgencies(lat, lon, 1500);
        const nearbyObservatories = getNearbyObservatories(lat, lon, 1500);
        
        // Calculate astronomical twilight length (simplified)
        let nightLength, twilightDesc;
        if (absLat > 66.5) {
            const month = today.getMonth();
            if (lat > 0) { // North
                if (month >= 4 && month <= 7) {
                    nightLength = 0;
                    twilightDesc = 'Midnight sun - no true night';
                } else {
                    nightLength = 24;
                    twilightDesc = 'Polar night - continuous darkness';
                }
            } else { // South
                if (month >= 10 || month <= 2) {
                    nightLength = 0;
                    twilightDesc = 'Midnight sun - no true night';
                } else {
                    nightLength = 24;
                    twilightDesc = 'Polar night - continuous darkness';
                }
            }
        } else {
            // Approximate night length based on latitude and season
            const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
            const summerFactor = Math.abs(23.5 * Math.sin(2 * Math.PI * (dayOfYear - 80) / 365));
            const dayLength = 12 + summerFactor * Math.cos(absLat * Math.PI / 180);
            nightLength = 24 - dayLength;
            twilightDesc = nightLength < 4 ? 'Short night - limited viewing' :
                          nightLength > 10 ? 'Long night - excellent conditions' :
                          'Moderate night - good viewing';
        }
        
        return {
            coordinates: { lat, lon },
            analysis: {
                nightHours: Math.round(nightLength * 10) / 10,
                nightDescription: twilightDesc,
                lightPollution,
                upcomingEvents: upcomingEvents.slice(0, 5), // Top 5 events
                regionFacts,
                spaceInfrastructure: {
                    nearbySpaceports: nearbySpaceports.slice(0, 2),
                    nearbyObservatories: nearbyObservatories.slice(0, 2),
                },
                viewingRecommendation: _getBestViewingTime({ type: 'general' }, lat),
            }
        };
    }

    // Public API
    return {
        getEventsForLocation,
        getLocationAnalysis,
        estimateLightPollution,
        getRegionSpaceFacts,
        getNearbySpaceAgencies,
        getNearbyObservatories,
    };
})();

// Make available globally
window.LocationEvents = LocationEvents;