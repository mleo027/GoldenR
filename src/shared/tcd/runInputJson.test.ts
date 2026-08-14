import { describe, expect, it } from 'vitest';
import {
    EMPTY_RUN_INPUT,
    normalizeRunInput,
    parseRunInputJson,
    stringifyRunInput,
} from './runInputJson';

describe('TCD run input JSON helpers', () => {
    it('parses valid, empty, and invalid JSON', () => {
        expect(parseRunInputJson('{ "fundid": "8" }')).toEqual({
            ok: true,
            value: { fundid: '8' },
        });
        expect(parseRunInputJson('  ')).toEqual({ ok: true, value: {} });
        expect(parseRunInputJson('[]').ok).toBe(false);
        expect(parseRunInputJson('{bad').ok).toBe(false);
    });

    it('stringifies and normalizes run input', () => {
        expect(EMPTY_RUN_INPUT).toEqual({});
        expect(stringifyRunInput(undefined)).toContain('{');
        expect(stringifyRunInput({ fundid: '8' })).toContain('"fundid": "8"');
        expect(normalizeRunInput(null)).toEqual({});
        expect(normalizeRunInput([])).toEqual({});
        expect(normalizeRunInput({ fundid: '8' })).toEqual({ fundid: '8' });
    });
});
