import { describe, expect, it } from 'vitest';
import { createNoopVarsApi, createVarsApi } from './createVarsApi';

describe('createVarsApi', () => {
    it('merges layers and honors runtime overrides', () => {
        const vars = createVarsApi([{ host: 'a' }, { port: 'b' }]);

        expect(vars.get('host')).toBe('a');
        expect(vars.all()).toEqual({ host: 'a', port: 'b' });
        vars.set('port', 'c');
        expect(vars.get('port')).toBe('c');
    });

    it('interpolates templates from the merged variable map', () => {
        const vars = createVarsApi([{ host: '127.0.0.1' }]);
        expect(vars.interpolate('${host}:21000')).toBe('127.0.0.1:21000');
    });

    it('noop vars return empty values', () => {
        const vars = createNoopVarsApi();
        expect(vars.get('host')).toBeUndefined();
        expect(vars.all()).toEqual({});
        expect(vars.interpolate('${host}')).toBe('${host}');
    });
});
