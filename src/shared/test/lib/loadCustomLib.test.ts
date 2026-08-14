import { describe, expect, it } from 'vitest';
import { mergeLibApi, parseCustomLibFromScript } from './loadCustomLib';

describe('custom lib helpers', () => {
    it('merges builtin and custom exports', () => {
        const lib = mergeLibApi({ customFn: () => 1 });
        expect(typeof lib.deepGet).toBe('function');
        expect(typeof lib.customFn).toBe('function');
        expect((lib.custom as { customFn: () => number }).customFn).toBeTypeOf('function');
    });

    it('parses module.exports from a lib script', () => {
        const lib = parseCustomLibFromScript('module.exports = { answer: 42 };', 'test-lib.js');
        expect(lib).toEqual({ answer: 42 });
    });

    it('returns empty for blank source and wraps parse failures', () => {
        expect(parseCustomLibFromScript('', 'empty.js')).toEqual({});
        expect(() => parseCustomLibFromScript('throw new Error("boom")', 'bad.js')).toThrow(
            '加载 test-lib bad.js 失败',
        );
    });
});
