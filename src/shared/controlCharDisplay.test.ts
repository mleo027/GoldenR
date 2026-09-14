import { describe, expect, it } from 'vitest';
import { containsSoh, decodeSohMarkers, formatControlCharsForTitle } from './controlCharDisplay';

describe('formatControlCharsForTitle', () => {
    it('replaces SOH with square placeholder', () => {
        expect(formatControlCharsForTitle('9=82\x0135=8')).toBe('9=82□35=8');
    });

    it('leaves plain text unchanged', () => {
        expect(formatControlCharsForTitle('hello')).toBe('hello');
    });

    it('keeps literal square characters distinct from SOH markers', () => {
        expect(formatControlCharsForTitle('方块□字符')).toBe('方块■字符');
        expect(decodeSohMarkers('方块■字符')).toBe('方块□字符');
    });

    it('decodes display markers back to raw SOH', () => {
        expect(decodeSohMarkers('8=FIXT.1.1□9=82')).toBe(`8=FIXT.1.1${String.fromCharCode(1)}9=82`);
    });
});

describe('containsSoh', () => {
    it('detects SOH in string', () => {
        expect(containsSoh('a\x01b')).toBe(true);
        expect(containsSoh('plain')).toBe(false);
    });
});
