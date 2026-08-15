import { describe, expect, it } from 'vitest';
import {
    CONFIG_STORAGE_FILES,
    assertConfigStorageFileName,
    isConfigStorageFileName,
} from './files';

describe('config storage allowlist', () => {
    it('accepts every registered config file', () => {
        for (const fileName of CONFIG_STORAGE_FILES) {
            expect(isConfigStorageFileName(fileName)).toBe(true);
            expect(assertConfigStorageFileName(fileName)).toBe(fileName);
        }
        expect(isConfigStorageFileName('request-history.json')).toBe(true);
    });

    it('rejects absolute paths, traversal, empty names, and unknown files', () => {
        const invalidNames = ['C:\\tmp\\project.json', '..\\project.json', '', 'unknown.json'];
        for (const fileName of invalidNames) {
            expect(isConfigStorageFileName(fileName)).toBe(false);
            expect(() => assertConfigStorageFileName(fileName)).toThrow();
        }
    });
});
