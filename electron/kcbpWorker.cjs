'use strict';

const { parentPort } = require('worker_threads');
const fs = require('fs');
const { createRequire } = require('module');

let cachedCallable = null;
let cancelled = false;

function loadCallable(adapterCandidates) {
    if (cachedCallable) return cachedCallable;

    const req = createRequire(__filename);

    for (const adapterPath of adapterCandidates) {
        if (!fs.existsSync(adapterPath)) continue;

        try {
            const loaded = req(adapterPath);
            if (typeof loaded.callKCBP === 'function') {
                cachedCallable = loaded.callKCBP.bind(loaded);
                return cachedCallable;
            }
        } catch {
            // try next candidate
        }
    }

    return null;
}

function handleCall(message) {
    cancelled = false;

    try {
        const callable = loadCallable(message.adapterCandidates);
        if (!callable) {
            parentPort.postMessage({
                type: 'result',
                callId: message.callId,
                ok: false,
                error: 'Native KCBP adapter not loaded',
            });
            return;
        }

        const raw = callable(message.payload);
        if (cancelled) {
            parentPort.postMessage({
                type: 'result',
                callId: message.callId,
                ok: false,
                error: 'CALL_CANCELLED',
            });
            return;
        }

        parentPort.postMessage({
            type: 'result',
            callId: message.callId,
            ok: true,
            raw,
        });
    } catch (error) {
        if (cancelled) {
            parentPort.postMessage({
                type: 'result',
                callId: message.callId,
                ok: false,
                error: 'CALL_CANCELLED',
            });
            return;
        }

        parentPort.postMessage({
            type: 'result',
            callId: message.callId,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

if (!parentPort) {
    throw new Error('KCBP worker must run as a worker thread');
}

parentPort.on('message', (message) => {
    if (!message || typeof message !== 'object') return;

    if (message.type === 'init') {
        loadCallable(message.adapterCandidates ?? []);
        parentPort.postMessage({ type: 'ready' });
        return;
    }

    if (message.type === 'call') {
        handleCall(message);
        return;
    }

    if (message.type === 'cancel') {
        cancelled = true;
    }
});
