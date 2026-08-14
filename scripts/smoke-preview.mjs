import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const viteBin = path.join(rootDir, '..', 'node_modules', 'vite', 'bin', 'vite.js');
const url = 'http://127.0.0.1:4173';

const child = spawn(
    process.execPath,
    [viteBin, 'preview', '--host', '127.0.0.1', '--port', '4173'],
    {
        cwd: path.join(rootDir, '..'),
        stdio: 'ignore',
    },
);

let passed = false;
try {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                passed = true;
                console.log(`Preview smoke passed: HTTP ${response.status}`);
                break;
            }
        } catch {
            // Vite preview may need a moment to bind the port.
        }
        await new Promise((resolve) => {
            setTimeout(resolve, 250);
        });
    }
} finally {
    child.kill();
}

if (!passed) {
    console.error('Preview smoke failed: index page was not reachable');
    process.exitCode = 1;
}
