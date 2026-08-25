'use strict';

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const readline = require('readline');

const BINARY_KEY = '__kcbpBinaryBase64';

function prependAdapterDllToPath(adapterCandidates) {
    const dirs = [];

    const pushDir = (dir) => {
        if (!dir || !fs.existsSync(dir)) return;
        if (dirs.includes(dir)) return;
        dirs.push(dir);
    };

    pushDir(path.join(__dirname, 'adapter', 'dll'));
    pushDir(path.join(__dirname, 'adapter'));

    const candidates = Array.isArray(adapterCandidates) ? adapterCandidates : [];
    for (const candidate of candidates) {
        if (!candidate) continue;
        pushDir(path.dirname(candidate));
        pushDir(path.join(path.dirname(candidate), 'dll'));
    }

    if (dirs.length === 0) return;
    process.env.PATH = `${dirs.join(';')};${process.env.PATH ?? ''}`;
}

function decodeFields(fields) {
    if (!fields || typeof fields !== 'object') return fields ?? {};

    const decoded = {};
    for (const [key, value] of Object.entries(fields)) {
        if (value && typeof value === 'object' && BINARY_KEY in value) {
            decoded[key] = Buffer.from(String(value[BINARY_KEY]), 'base64');
            continue;
        }
        decoded[key] = value;
    }
    return decoded;
}

function loadAdapter(adapterCandidates) {
    const req = createRequire(__filename);
    const candidates = Array.isArray(adapterCandidates) ? adapterCandidates : [];

    for (const adapterPath of candidates) {
        if (!adapterPath || !fs.existsSync(adapterPath)) continue;

        try {
            const loaded = req(adapterPath);
            if (typeof loaded.callKCBP === 'function') {
                return loaded;
            }
        } catch {
            // try next candidate
        }
    }

    return null;
}

function getProtocolCallable(adapter, type) {
    if (!adapter) return null;
    if (type === 'KGBP') {
        return typeof adapter.callKGBP === 'function' ? adapter.callKGBP.bind(adapter) : null;
    }
    return typeof adapter.callKCBP === 'function' ? adapter.callKCBP.bind(adapter) : null;
}

let adapter = null;
let initialized = false;

function writeMessage(message) {
    process.stdout.write(`${JSON.stringify(message)}\n`);
}

function handleMessage(message) {
    if (!message || typeof message !== 'object') return;
    const { payload, adapterCandidates, callId } = message;
    if (!initialized) {
        prependAdapterDllToPath(adapterCandidates);
        adapter = loadAdapter(adapterCandidates);
        initialized = true;
    }

    const callable = getProtocolCallable(adapter, payload?.type);
    if (!callable) {
        const wanted = payload?.type === 'KGBP' ? 'KGBP' : 'KCBP';
        writeMessage({ callId, ok: false, error: `Native ${wanted} adapter not loaded` });
        return;
    }

    const normalized = {
        ...payload,
        param: { ...payload?.param, fields: decodeFields(payload?.param?.fields) },
    };
    try {
        writeMessage({ callId, ok: true, raw: callable(normalized) });
    } catch (error) {
        writeMessage({
            callId,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on('line', (line) => {
    if (!line.trim()) return;
    try {
        handleMessage(JSON.parse(line));
    } catch (error) {
        writeMessage({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
input.on('close', () => process.exit(0));
