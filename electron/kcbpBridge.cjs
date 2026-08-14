'use strict';

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

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

function loadCallable(adapterCandidates) {
    const req = createRequire(__filename);
    const candidates = Array.isArray(adapterCandidates) ? adapterCandidates : [];

    for (const adapterPath of candidates) {
        if (!adapterPath || !fs.existsSync(adapterPath)) continue;

        try {
            const loaded = req(adapterPath);
            if (typeof loaded.callKCBP === 'function') {
                return loaded.callKCBP.bind(loaded);
            }
        } catch {
            // try next candidate
        }
    }

    return null;
}

function readInputPayload() {
    const raw = fs.readFileSync(0, 'utf8').trim();
    if (!raw) {
        throw new Error('KCBP bridge input is empty');
    }
    return JSON.parse(raw);
}

function main() {
    const { payload, adapterCandidates } = readInputPayload();
    prependAdapterDllToPath(adapterCandidates);
    const callable = loadCallable(adapterCandidates);

    if (!callable) {
        process.stdout.write(
            JSON.stringify({ ok: false, error: 'Native KCBP adapter not loaded' }),
        );
        return;
    }

    const normalized = {
        ...payload,
        param: {
            ...payload.param,
            fields: decodeFields(payload.param?.fields),
        },
    };

    try {
        const raw = callable(normalized);
        process.stdout.write(JSON.stringify({ ok: true, raw }));
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stdout.write(JSON.stringify({ ok: false, error: message }));
    }
}

main();
