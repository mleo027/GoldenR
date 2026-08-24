#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const preload = readFileSync('electron/preload.ts', 'utf8');
function sourceFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) return sourceFiles(path);
        return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [path] : [];
    });
}

const ipcSources = sourceFiles('electron')
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');

const registered = new Set(
    [...ipcSources.matchAll(/ipcMain\.(?:handle|on)\(\s*['"]([^'"]+)['"]/g)].map((match) => match[1]),
);
const emitted = new Set(
    [...ipcSources.matchAll(/(?:webContents|sender)\.send\(\s*['"]([^'"]+)['"]/g)].map((match) => match[1]),
);
const invoked = new Set(
    [...preload.matchAll(/invoke(?:<[^>]+>)?\(\s*['"]([^'"]+)['"]/g)].map((match) => match[1]),
);
const listened = new Set(
    [...preload.matchAll(/ipcRenderer\.on\(\s*['"]([^'"]+)['"]/g)].map((match) => match[1]),
);
const sent = new Set(
    [...preload.matchAll(/ipcRenderer\.send\(\s*['"]([^'"]+)['"]/g)].map((match) => match[1]),
);
const missingInvokes = [...invoked].filter((channel) => !registered.has(channel));
const missingEvents = [...listened].filter((channel) => !emitted.has(channel));
const missingSends = [...sent].filter((channel) => !registered.has(channel));
const missing = [...new Set([...missingInvokes, ...missingEvents, ...missingSends])];

if (missing.length > 0) {
    console.error(`IPC channels exposed by preload but not registered in main: ${missing.join(', ')}`);
    process.exitCode = 1;
} else {
    console.log(`[ipc-check] ${invoked.size + listened.size + sent.size} preload IPC usage(s) are registered or emitted`);
}
