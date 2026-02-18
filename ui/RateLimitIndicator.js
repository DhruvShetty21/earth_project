// ui/RateLimitIndicator.js
// Shows NASA API rate limit status to users

const RateLimitIndicator = (() => {
    let _container = null;
    let _updateInterval = null;

    function init(containerId = 'rate-limit-status') {
        _container = document.getElementById(containerId);
        if (!_container) {
            console.warn('Rate limit indicator container not found');
            return;
        }

        // Update every 5 seconds
        update();
        _updateInterval = setInterval(update, 5000);
    }

    function update() {
        if (!_container || !window.NasaService) return;

        const status = NasaService.getRateLimitStatus();
        
        // Determine color based on remaining requests
        let color = '#00ff88'; // Green
        let icon = '✅';
        if (status.remainingRequests < 5) {
            color = '#ff4444'; // Red
            icon = '⚠️';
        } else if (status.remainingRequests < 10) {
            color = '#ffaa00'; // Orange
            icon = '⚡';
        }

        _container.innerHTML = `
            <div style="
                background: rgba(0, 0, 0, 0.6);
                border: 1px solid ${color}40;
                border-radius: 8px;
                padding: 12px 16px;
                font-family: 'Segoe UI', sans-serif;
                font-size: 0.85rem;
                color: #fff;
                display: flex;
                align-items: center;
                gap: 12px;
            ">
                <span style="font-size: 1.2rem;">${icon}</span>
                <div style="flex: 1;">
                    <div style="font-weight: 600; margin-bottom: 4px;">
                        NASA API Rate Limit
                    </div>
                    <div style="color: var(--muted); font-size: 0.75rem;">
                        ${status.requestsInWindow}/${status.maxRequests} requests used
                        · ${status.remainingRequests} remaining
                    </div>
                </div>
                <div style="
                    background: ${color}20;
                    color: ${color};
                    padding: 4px 12px;
                    border-radius: 6px;
                    font-weight: 600;
                    font-size: 0.75rem;
                ">
                    ${status.canMakeRequest ? 'READY' : 
                      `WAIT ${Math.ceil(status.timeUntilReset / 60000)}m`}
                </div>
            </div>
        `;
    }

    function destroy() {
        if (_updateInterval) {
            clearInterval(_updateInterval);
            _updateInterval = null;
        }
    }

    return {
        init,
        update,
        destroy
    };
})();

window.RateLimitIndicator = RateLimitIndicator;