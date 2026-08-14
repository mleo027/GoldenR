import { describe, expect, it } from 'vitest';
import { compareValues, filterRowsByKeyword, matchesSearchRow } from './table';

describe('compareValues', () => {
    it('sorts numbers ascending', () => {
        expect(compareValues(2, 10, 'ascend')).toBeLessThan(0);
        expect(compareValues(10, 2, 'ascend')).toBeGreaterThan(0);
    });

    it('sorts strings with locale', () => {
        expect(compareValues('apple', 'banana', 'ascend')).toBeLessThan(0);
    });
});

describe('matchesSearchRow', () => {
    it('matches cell content case-insensitively', () => {
        expect(matchesSearchRow({ name: 'Hello' }, 'hello')).toBe(true);
        expect(matchesSearchRow({ name: 'Hello' }, 'world')).toBe(false);
    });

    it('returns true for empty keyword', () => {
        expect(matchesSearchRow({ name: 'Hello' }, '  ')).toBe(true);
    });
});

describe('filterRowsByKeyword', () => {
    it('filters rows by keyword', () => {
        const rows = [{ id: '1' }, { id: '2', tag: 'demo' }];
        expect(filterRowsByKeyword(rows, 'demo')).toEqual([{ id: '2', tag: 'demo' }]);
    });
});
