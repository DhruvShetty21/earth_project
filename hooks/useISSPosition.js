// hooks/useISSPosition.js
// Polls ISS position every 5 seconds and calls a callback with updated coords

const useISSPosition = (() => {
    let _intervalId  = null;
    let _callback    = null;
    let _lastPos     = null;

    function start(onUpdate) {
        _callback = onUpdate;
        _poll();
        _intervalId = setInterval(_poll, 5000);
    }

    function stop() {
        if (_intervalId) {
            clearInterval(_intervalId);
            _intervalId = null;
        }
    }

    function getLastPosition() {
        return _lastPos;
    }

    async function _poll() {
        const pos = await NasaService.fetchISS();
        _lastPos  = pos;
        if (_callback) _callback(pos);
    }

    return { start, stop, getLastPosition };
})();

window.useISSPosition = useISSPosition;