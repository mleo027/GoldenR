const fs = require('fs');
const path = require('path');

const candidatePaths = [
    path.join(__dirname, 'adapter.node')
];

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

function getCallable(adapter) {
    if (!adapter) return null;
    if (typeof adapter.callKCBP === 'function') return adapter.callKCBP.bind(adapter);
    if (typeof adapter.default?.callKCBP === 'function') return adapter.default.callKCBP.bind(adapter.default);
    if (typeof adapter === 'function') return adapter;
    return null;
}

function callKCBP(payload) {
    const callable = getCallable(nativeAdapter);

    if (!callable) {
        const detail = loadError instanceof Error ? `: ${loadError.message}` : '';
        throw new Error(`Native KCBP adapter not loaded${detail}`);
    }

    return callable(payload);
}

module.exports = {
    callKCBP,
};
