import { describe, expect, it } from 'vitest';
import {
    getDefaultModuleId,
    getModuleById,
    isRegisteredModuleId,
    resolveActiveModuleId,
} from './helpers';
import { APP_MODULES } from './app-modules';

describe('platform registry helpers', () => {
    it('getDefaultModuleId returns the first module by order', () => {
        const sorted = [...APP_MODULES].sort((a, b) => a.order - b.order);
        expect(getDefaultModuleId()).toBe(sorted[0]?.id);
    });

    it('isRegisteredModuleId recognizes known module ids', () => {
        expect(isRegisteredModuleId('api-debug')).toBe(true);
        expect(isRegisteredModuleId('exchange-file')).toBe(false);
        expect(isRegisteredModuleId('unknown-module')).toBe(false);
    });

    it('resolveActiveModuleId keeps valid ids', () => {
        expect(resolveActiveModuleId('api-debug')).toBe('api-debug');
        expect(resolveActiveModuleId('  api-debug  ')).toBe('api-debug');
    });

    it('resolveActiveModuleId falls back for blank or unknown ids', () => {
        const fallback = getDefaultModuleId();
        expect(resolveActiveModuleId()).toBe(fallback);
        expect(resolveActiveModuleId('')).toBe(fallback);
        expect(resolveActiveModuleId('   ')).toBe(fallback);
        expect(resolveActiveModuleId('removed-module')).toBe(fallback);
    });

    it('getModuleById returns module definition or undefined', () => {
        expect(getModuleById('api-debug')?.label).toBe('API 调试');
        expect(getModuleById('missing')).toBeUndefined();
    });
});
