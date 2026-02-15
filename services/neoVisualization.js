// services/neoVisualization.js
// NASA NEO visualization service for the globe

const NEOVisualization = (() => {
    // Convert NEO data to globe points
    function neoToGlobePoints(neos, limit = 100) {
        return neos.slice(0, limit).map((neo, index) => {
            // Generate approximate position based on orbital data
            // This is a simplification - in reality we'd use proper orbital mechanics
            const position = calculateNEOPosition(neo, index);
            
            const isHazardous = neo.is_potentially_hazardous_asteroid;
            const diameter = neo.estimated_diameter?.meters?.estimated_diameter_max || 100;
            const closeApproach = neo.close_approach_data?.[0];
            const distance = parseFloat(closeApproach?.miss_distance?.lunar || 999);
            
            // Determine color based on hazard status and distance
            let color = '#00ff88'; // Safe - green
            let radius = 0.2 + Math.min(diameter / 1000, 1) * 0.4;
            
            if (isHazardous) {
                if (distance < 10) {
                    color = '#ff4444'; // Very close hazardous - red
                    radius += 0.2;
                } else if (distance < 30) {
                    color = '#ff8800'; // Close hazardous - orange
                    radius += 0.1;
                } else {
                    color = '#ffaa00'; // Distant hazardous - yellow
                }
            } else {
                if (distance < 10) {
                    color = '#88ff44'; // Close but safe - light green
                }
            }
            
            // Get the simplifier style if available
            const style = window.Simplifier?.asteroid(neo) || {};
            
            return {
                lat: position.lat,
                lng: position.lng,
                altitude: 0.015 + (diameter / 2000),
                radius: radius,
                color: color,
                label: `☄ ${neo.name} - ${style.proximity || ''} - ${Math.round(diameter)}m`,
                type: 'neo',
                raw: neo,
                isHazardous,
                distance,
                diameter,
                style
            };
        });
    }
    
    // Calculate approximate position based on orbital elements
    // This is a simplified model - real position would need proper ephemeris
    function calculateNEOPosition(neo, index) {
        // If we have close approach data, use that position
        if (neo.close_approach_data && neo.close_approach_data[0]) {
            const data = neo.close_approach_data[0];
            
            // Try to parse coordinates from close approach
            // This is approximate - real data would have proper coordinates
            if (data.close_approach_date) {
                // Generate a position based on the date and index
                // This creates a distributed pattern across the sky
                const dayOffset = new Date(data.close_approach_date).getTime() / (1000 * 60 * 60 * 24);
                const lat = Math.sin(dayOffset * 0.1 + index) * 60;
                const lng = (dayOffset * 15 + index * 37) % 360 - 180;
                return { lat, lng };
            }
        }
        
        // Fallback: generate distributed positions
        const lat = ((index * 73) % 140) - 70;
        const lng = ((index * 47) % 340) - 170;
        return { lat, lng };
    }
    
    // Calculate NEO statistics
    function calculateNEOStats(neos) {
        if (!neos || neos.length === 0) {
            return {
                total: 0,
                hazardous: 0,
                closest: null,
                largest: null,
                averageDistance: 0,
                byHazard: { safe: 0, hazardous: 0 }
            };
        }
        
        const hazardous = neos.filter(n => n.is_potentially_hazardous_asteroid);
        const distances = neos.map(n => 
            parseFloat(n.close_approach_data?.[0]?.miss_distance?.lunar || 999)
        );
        
        // Find closest approach
        let closest = null;
        let minDist = Infinity;
        neos.forEach(neo => {
            const dist = parseFloat(neo.close_approach_data?.[0]?.miss_distance?.lunar || 999);
            if (dist < minDist) {
                minDist = dist;
                closest = neo;
            }
        });
        
        // Find largest
        let largest = null;
        let maxSize = 0;
        neos.forEach(neo => {
            const size = neo.estimated_diameter?.meters?.estimated_diameter_max || 0;
            if (size > maxSize) {
                maxSize = size;
                largest = neo;
            }
        });
        
        return {
            total: neos.length,
            hazardous: hazardous.length,
            closest: closest ? {
                name: closest.name,
                distance: minDist,
                date: closest.close_approach_data?.[0]?.close_approach_date
            } : null,
            largest: largest ? {
                name: largest.name,
                size: maxSize
            } : null,
            averageDistance: distances.reduce((a, b) => a + b, 0) / distances.length,
            byHazard: {
                safe: neos.length - hazardous.length,
                hazardous: hazardous.length
            }
        };
    }
    
    // Generate HTML for NEO info panel
    function generateNEOInfoPanel(neo) {
        const style = window.Simplifier?.asteroid(neo) || {};
        const approach = neo.close_approach_data?.[0];
        const isHazardous = neo.is_potentially_hazardous_asteroid;
        const diameter = neo.estimated_diameter?.meters?.estimated_diameter_max || 0;
        const distance = parseFloat(approach?.miss_distance?.lunar || 999);
        const velocity = approach?.relative_velocity?.kilometers_per_hour;
        
        let hazardColor = isHazardous ? '#ff4444' : '#00ff88';
        let hazardText = isHazardous ? 'POTENTIALLY HAZARDOUS' : 'SAFE';
        
        return `
            <div class="ptag neo" style="background: linear-gradient(90deg, ${hazardColor}40, transparent);">
                ☄ NEAR-EARTH OBJECT
            </div>
            <div class="ptitle">${neo.name}</div>
            <div class="psub">${style.proximity || 'Near-Earth Object'}</div>
            
            <div class="div"></div>
            
            <!-- Hazard Status -->
            <div style="
                background: ${hazardColor}20;
                border: 1px solid ${hazardColor};
                border-radius: 8px;
                padding: 12px;
                margin: 16px 0;
                text-align: center;
                color: ${hazardColor};
                font-weight: 600;
            ">${hazardText}</div>
            
            <!-- Quick Stats -->
            <div class="fgrid">
                <div class="fcard">
                    <div class="flbl">Diameter</div>
                    <div class="fval">${Math.round(diameter)} m</div>
                </div>
                <div class="fcard">
                    <div class="flbl">Class</div>
                    <div class="fval">${style.size || 'Unknown'}</div>
                </div>
                <div class="fcard">
                    <div class="flbl">Miss Distance</div>
                    <div class="fval">${distance.toFixed(1)} lunar</div>
                </div>
                <div class="fcard">
                    <div class="flbl">In km</div>
                    <div class="fval">${parseInt(approach?.miss_distance?.kilometers || 0).toLocaleString()}</div>
                </div>
                <div class="fcard">
                    <div class="flbl">Date</div>
                    <div class="fval">${approach?.close_approach_date || 'Unknown'}</div>
                </div>
                <div class="fcard">
                    <div class="flbl">Speed</div>
                    <div class="fval">${Math.round(velocity || 0).toLocaleString()} km/h</div>
                </div>
            </div>
            
            <div class="div"></div>
            
            <!-- Impact Risk Assessment -->
            <div class="section-label">⚠️ Impact Risk Assessment</div>
            <div style="background: rgba(0,0,0,0.2); padding: 16px; border-radius: 12px; margin: 8px 0;">
                ${isHazardous ? `
                    <p style="margin: 0 0 10px 0;">This object meets NASA's criteria for potentially hazardous asteroids based on its size and orbit.</p>
                    <p style="margin: 0; color: var(--muted); font-size: 0.85rem;">No immediate impact risk detected. Continuously monitored by NASA's CNEOS.</p>
                ` : `
                    <p style="margin: 0;">This object poses no significant impact risk. It will safely pass at a distance of ${distance.toFixed(1)} lunar distances (${parseInt(approach?.miss_distance?.kilometers || 0).toLocaleString()} km).</p>
                `}
            </div>
            
            <!-- Orbital Information -->
            <div class="section-label">🔄 Orbital Information</div>
            <div style="background: rgba(0,0,0,0.2); padding: 16px; border-radius: 12px; margin: 8px 0;">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                    <div>
                        <div style="color: var(--muted); font-size: 0.7rem;">ECCENTRICITY</div>
                        <div style="font-weight: 600;">${neo.orbital_data?.eccentricity || 'Unknown'}</div>
                    </div>
                    <div>
                        <div style="color: var(--muted); font-size: 0.7rem;">INCLINATION</div>
                        <div style="font-weight: 600;">${neo.orbital_data?.inclination || 'Unknown'}°</div>
                    </div>
                    <div>
                        <div style="color: var(--muted); font-size: 0.7rem;">PERIOD</div>
                        <div style="font-weight: 600;">${neo.orbital_data?.orbital_period ? Math.round(neo.orbital_data.orbital_period) + ' days' : 'Unknown'}</div>
                    </div>
                    <div>
                        <div style="color: var(--muted); font-size: 0.7rem;">CLASS</div>
                        <div style="font-weight: 600;">${neo.orbital_data?.orbit_class?.name || 'Unknown'}</div>
                    </div>
                </div>
            </div>
            
            <!-- Impact Scenario -->
            <div class="section-label">🌍 Impact Scenario</div>
            <div style="background: rgba(0,0,0,0.2); padding: 16px; border-radius: 12px; margin: 8px 0;">
                <p style="margin: 0; line-height: 1.6;">
                    ${diameter > 1000 ? 'City-killer scale - would cause regional devastation' : 
                      diameter > 300 ? 'Regional impact - significant local damage' :
                      diameter > 100 ? 'Local impact - similar to Tunguska event' :
                      diameter > 50 ? 'Airburst - would cause local shockwave damage' :
                      'Meteor - would burn up in atmosphere'}
                </p>
            </div>
            
            <!-- Source -->
            <div style="margin-top: 16px; font-size: 0.7rem; color: var(--muted); text-align: center;">
                📡 Source: NASA CNEOS / NeoWs
            </div>
        `;
    }
    
    // Public API
    return {
        neoToGlobePoints,
        calculateNEOStats,
        generateNEOInfoPanel
    };
})();

window.NEOVisualization = NEOVisualization;