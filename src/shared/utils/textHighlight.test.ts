import { describe, expect, it } from 'vitest';
import { splitTextHighlight } from './textHighlight';

describe('splitTextHighlight', () => {
    it('returns a single non-highlight part when query is blank', () => {
        expect(splitTextHighlight('Hello World', '   ')).toEqual([
            { text: 'Hello World', highlight: false },
        ]);
    });

    it('highlights case-insensitive matches', () => {
        expect(splitTextHighlight('KCBP Query', 'kcbp')).toEqual([
            { text: 'KCBP', highlight: true },
            { text: ' Query', highlight: false },
        ]);
    });

    it('highlights multiple non-overlapping occurrences', () => {
        expect(splitTextHighlight('abXab', 'ab')).toEqual([
            { text: 'ab', highlight: true },
            { text: 'X', highlight: false },
            { text: 'ab', highlight: true },
        ]);
    });
});
