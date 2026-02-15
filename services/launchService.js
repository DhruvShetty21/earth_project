// services/launchService.js
// SpaceDevs Launch Library API service

const LaunchService = (() => {
    // Base URL for the Launch Library API
    const BASE_URL = 'https://ll.thespacedevs.com/2.3.0';
    
    // Cache for API responses
    const cache = new Map();
    
    // Launch status mappings
    const LAUNCH_STATUS = {
        1: { name: 'Go for Launch', color: '#4ade80', icon: '✅' },
        2: { name: 'TBD', color: '#94a3b8', icon: '⏳' },
        3: { name: 'Launch Successful', color: '#22c55e', icon: '🚀' },
        4: { name: 'Launch Failure', color: '#ef4444', icon: '❌' },
        5: { name: 'On Hold', color: '#f97316', icon: '⏸️' },
        6: { name: 'Launch in Progress', color: '#3b82f6', icon: '🔄' },
        7: { name: 'Launch Scheduled', color: '#a855f7', icon: '📅' },
        8: { name: 'Launch Delayed', color: '#eab308', icon: '⏰' }
    };

    // Fetch upcoming launches
    async function getUpcomingLaunches(limit = 25) {
        const cacheKey = `upcoming-launches-${limit}`;
        
        // Check cache (5 minutes)
        if (cache.has(cacheKey)) {
            const { data, timestamp } = cache.get(cacheKey);
            if (Date.now() - timestamp < 5 * 60 * 1000) {
                return data;
            }
        }

        try {
            const response = await fetch(
                `${BASE_URL}/launches/upcoming/?limit=${limit}&format=json&mode=detailed`
            );
            
            if (!response.ok) {
                throw new Error(`Launch API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Process and enhance launch data
            const launches = data.results.map(launch => enhanceLaunchData(launch));
            
            // Cache the response
            cache.set(cacheKey, { data: launches, timestamp: Date.now() });
            
            return launches;
        } catch (error) {
            console.error('Failed to fetch launches:', error);
            return getMockLaunches(); // Return mock data on error
        }
    }

    // Fetch launches for a specific location (by pad coordinates)
    async function getLaunchesByLocation(lat, lon, radius = 1000) {
        try {
            // First get all upcoming launches
            const launches = await getUpcomingLaunches(50);
            
            // Filter launches by proximity to location
            return launches.filter(launch => {
                if (!launch.pad?.latitude || !launch.pad?.longitude) return false;
                
                const distance = calculateDistance(
                    lat, lon,
                    launch.pad.latitude, launch.pad.longitude
                );
                
                return distance <= radius;
            }).map(launch => ({
                ...launch,
                distance: calculateDistance(
                    lat, lon,
                    launch.pad.latitude, launch.pad.longitude
                )
            })).sort((a, b) => a.distance - b.distance);
        } catch (error) {
            console.error('Failed to get launches by location:', error);
            return [];
        }
    }

    // Fetch launches by space agency
    async function getLaunchesByAgency(agencyId) {
        try {
            const response = await fetch(
                `${BASE_URL}/launches/upcoming/?lsp__id=${agencyId}&format=json&mode=detailed`
            );
            
            if (!response.ok) {
                throw new Error(`Launch API error: ${response.status}`);
            }
            
            const data = await response.json();
            return data.results.map(launch => enhanceLaunchData(launch));
        } catch (error) {
            console.error('Failed to fetch agency launches:', error);
            return [];
        }
    }

    // Fetch previous launches (for historical context)
    async function getPreviousLaunches(limit = 10) {
        try {
            const response = await fetch(
                `${BASE_URL}/launches/previous/?limit=${limit}&format=json&mode=detailed`
            );
            
            if (!response.ok) {
                throw new Error(`Launch API error: ${response.status}`);
            }
            
            const data = await response.json();
            return data.results.map(launch => enhanceLaunchData(launch));
        } catch (error) {
            console.error('Failed to fetch previous launches:', error);
            return [];
        }
    }

    // Get a single launch by ID
    async function getLaunchById(launchId) {
        try {
            const response = await fetch(
                `${BASE_URL}/launches/${launchId}/?format=json&mode=detailed`
            );
            
            if (!response.ok) {
                throw new Error(`Launch API error: ${response.status}`);
            }
            
            const data = await response.json();
            return enhanceLaunchData(data);
        } catch (error) {
            console.error('Failed to fetch launch:', error);
            return null;
        }
    }

    // Enhance launch data with additional info
    function enhanceLaunchData(launch) {
        const status = LAUNCH_STATUS[launch.status?.id] || {
            name: launch.status?.name || 'Unknown',
            color: '#94a3b8',
            icon: '❓'
        };
        
        // Calculate days until launch
        const launchDate = new Date(launch.net);
        const now = new Date();
        const daysUntil = Math.ceil((launchDate - now) / (1000 * 60 * 60 * 24));
        
        // Determine if launch is soon
        const isSoon = daysUntil <= 7 && daysUntil >= 0;
        
        return {
            ...launch,
            enhanced: {
                status,
                daysUntil,
                isSoon,
                launchDate: launchDate.toLocaleString(),
                missionName: launch.mission?.name || launch.name,
                rocketName: launch.rocket?.configuration?.full_name || 'Unknown rocket',
                padName: launch.pad?.name || 'Unknown pad',
                location: launch.pad?.location?.name || 'Unknown location',
                coordinates: launch.pad ? {
                    lat: launch.pad.latitude,
                    lng: launch.pad.longitude
                } : null,
                provider: launch.launch_service_provider?.name || 'Unknown provider',
                providerAbbrev: launch.launch_service_provider?.abbrev || 'Unknown'
            }
        };
    }

    // Calculate distance between two points (Haversine formula)
    function calculateDistance(lat1, lon1, lat2, lon2) {
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

    // Get all space agencies
    async function getSpaceAgencies() {
        try {
            const response = await fetch(`${BASE_URL}/agencies/?featured=true&format=json`);
            
            if (!response.ok) {
                throw new Error(`Agencies API error: ${response.status}`);
            }
            
            const data = await response.json();
            return data.results;
        } catch (error) {
            console.error('Failed to fetch agencies:', error);
            return [];
        }
    }

    // Mock data for when API fails
    function getMockLaunches() {
        const now = new Date();
        const mockLaunches = [
            {
                id: 'mock-1',
                name: 'Falcon 9 Block 5 | Starlink Group 6-45',
                net: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                status: { id: 1, name: 'Go for Launch' },
                launch_service_provider: { name: 'SpaceX', abbrev: 'SpaceX' },
                rocket: { configuration: { full_name: 'Falcon 9 Block 5' } },
                mission: { name: 'Starlink Group 6-45', description: 'Launch of Starlink satellites' },
                pad: {
                    name: 'SLC-40',
                    latitude: 28.561,
                    longitude: -80.577,
                    location: { name: 'Cape Canaveral, FL, USA' }
                },
                image: { image_url: null }
            },
            {
                id: 'mock-2',
                name: 'Ariane 5 ECA | Galileo FOC FM27 & FM28',
                net: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                status: { id: 7, name: 'Launch Scheduled' },
                launch_service_provider: { name: 'Arianespace', abbrev: 'Arianespace' },
                rocket: { configuration: { full_name: 'Ariane 5 ECA' } },
                mission: { name: 'Galileo FOC FM27 & FM28', description: 'Galileo navigation satellites' },
                pad: {
                    name: 'Ariane Launch Area 3',
                    latitude: 5.232,
                    longitude: -52.778,
                    location: { name: 'Kourou, French Guiana' }
                },
                image: { image_url: null }
            },
            {
                id: 'mock-3',
                name: 'Soyuz 2.1b | OneWeb #18',
                net: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                status: { id: 1, name: 'Go for Launch' },
                launch_service_provider: { name: 'Roscosmos', abbrev: 'RFSA' },
                rocket: { configuration: { full_name: 'Soyuz 2.1b' } },
                mission: { name: 'OneWeb #18', description: 'OneWeb broadband constellation' },
                pad: {
                    name: 'Site 31/6',
                    latitude: 45.996,
                    longitude: 63.564,
                    location: { name: 'Baikonur Cosmodrome, Kazakhstan' }
                },
                image: { image_url: null }
            }
        ];
        
        return mockLaunches.map(launch => enhanceLaunchData(launch));
    }

    // Format launch date for display
    function formatLaunchDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'Launched';
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 7) return `In ${diffDays} days`;
        if (diffDays < 30) return `In ${Math.floor(diffDays / 7)} weeks`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // Public API
    return {
        getUpcomingLaunches,
        getLaunchesByLocation,
        getLaunchesByAgency,
        getPreviousLaunches,
        getLaunchById,
        getSpaceAgencies,
        formatLaunchDate,
        LAUNCH_STATUS
    };
})();

window.LaunchService = LaunchService;
console.log('✅ LaunchService loaded');