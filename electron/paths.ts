import fsSync from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const electronBundleDir = dirname(fileURLToPath(import.meta.url));

export function getPreloadScriptPath(): string {
    return path.join(electronBundleDir, 'preload.cjs');
}

export function getBuildIconPath(): string | undefined {
    const candidates = [
        path.join(process.cwd(), 'build', 'icon.png'),
        path.join(electronBundleDir, '..', 'build', 'icon.png'),
    ];

    for (const candidate of candidates) {
        if (fsSync.existsSync(candidate)) {
            return candidate;
        }
    }

    return undefined;
}
