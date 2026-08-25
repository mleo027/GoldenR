const fs = require('fs');
const path = require('path');

const candidatePaths = [path.join(__dirname, 'adapter.node')];

let nativeAdapter = null;
let loadError = null;

for (const adapterPath of candidatePaths) {
    if (!fs.existsSync(adapterPath)) continue;

    try {
        nativeAdapter = require(adapterPath);
        break;
    } catch (error) {
        loadError = error;
    }
}

function getAdapter() {
    return nativeAdapter ?? nativeAdapter?.default ?? null;
}

function getProtocolCallable(adapter, type) {
    if (!adapter) return null;
    if (type === 'KGBP') {
        if (typeof adapter.callKGBP === 'function') return adapter.callKGBP.bind(adapter);
        if (typeof adapter.default?.callKGBP === 'function')
            return adapter.default.callKGBP.bind(adapter.default);
        return null;
    }
    if (typeof adapter.callKCBP === 'function') return adapter.callKCBP.bind(adapter);
    if (typeof adapter.default?.callKCBP === 'function')
        return adapter.default.callKCBP.bind(adapter.default);
    if (typeof adapter === 'function') return adapter;
    return null;
}

class NativeAdapterNotLoadedError extends Error {
    constructor(type) {
        const detail = loadError instanceof Error ? `: ${loadError.message}` : '';
        super(`Native ${type} adapter not loaded${detail}`);
    }
}

function dispatch(type, payload) {
    const callable = getProtocolCallable(getAdapter(), type);
    if (!callable) {
        throw new NativeAdapterNotLoadedError(type);
    }
    return callable(payload);
}

function callKCBP(payload) {
    return dispatch('KCBP', payload);
}

function callKGBP(payload) {
    return dispatch('KGBP', payload);
}

module.exports = {
    callKCBP,
    callKGBP,
};
