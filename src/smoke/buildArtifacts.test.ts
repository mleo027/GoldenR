import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');

describe('build smoke baseline', () => {
    it('produces renderer and electron build artifacts', () => {
        expect(existsSync(path.join(ROOT, 'dist/index.html'))).toBe(true);
        expect(existsSync(path.join(ROOT, 'dist-electron/main.js'))).toBe(true);
        expect(existsSync(path.join(ROOT, 'dist-electron/preload.cjs'))).toBe(true);
    });
});
