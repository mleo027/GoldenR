import { describe, expect, it } from 'vitest';
import { containsSoh, formatControlCharsForTitle } from './controlCharDisplay';

describe('formatControlCharsForTitle', () => {
    it('replaces SOH with square placeholder', () => {
        expect(formatControlCharsForTitle('9=82\x0135=8')).toBe('9=82□35=8');
    });

    it('leaves plain text unchanged', () => {
        expect(formatControlCharsForTitle('hello')).toBe('hello');
    });
});

describe('containsSoh', () => {
    it('detects SOH in string', () => {
        expect(containsSoh('a\x01b')).toBe(true);
        expect(containsSoh('plain')).toBe(false);
    });
});
