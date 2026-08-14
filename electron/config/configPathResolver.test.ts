import path from 'node:path';
import os from 'node:os';
import { describe, expect, it } from 'vitest';
import { resolveConfigStoragePath } from './configPathResolver';

const CONFIG_DIR = path.join(os.tmpdir(), 'golden-config-resolver');

describe('resolveConfigStoragePath', () => {
    it('joins an allowlisted file name under the config dir', () => {
        expect(resolveConfigStoragePath(CONFIG_DIR, 'project.json')).toBe(
            path.join(CONFIG_DIR, 'project.json'),
        );
    });

    it('rejects absolute paths, traversal, empty names, and unknown files', () => {
        const invalidNames = ['C:\\tmp\\project.json', '..\\project.json', '', 'unknown.json'];
        for (const fileName of invalidNames) {
            expect(() => resolveConfigStoragePath(CONFIG_DIR, fileName)).toThrow();
        }
    });
});
