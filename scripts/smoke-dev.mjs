import { execSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const viteBin = path.join(rootDir, '..', 'node_modules', 'vite', 'bin', 'vite.js');
const smokeConfig = path.join(rootDir, '..', 'vite.smoke.config.ts');
const url = 'http://127.0.0.1:5173';

const child = spawn(
    process.execPath,
    [viteBin, '--config', smokeConfig, '--host', '127.0.0.1', '--port', '5173'],
    {
        cwd: path.join(rootDir, '..'),
        stdio: 'ignore',
    },
);

let passed = false;
try {
    for (let attempt = 0; attempt < 30; attempt += 1) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                passed = true;
                console.log(`Dev smoke passed: HTTP ${response.status}`);
                break;
            }
        } catch {
            // Vite dev server may need a moment to bind the port.
        }
        await new Promise((resolve) => {
            setTimeout(resolve, 250);
        });
    }
} finally {
    if (process.platform === 'win32' && child.pid) {
        try {
            execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
        } catch {
            // Process may already be gone.
        }
    } else {
        child.kill();
    }
}

if (!passed) {
    console.error('Dev smoke failed: renderer page was not reachable');
    process.exitCode = 1;
}
