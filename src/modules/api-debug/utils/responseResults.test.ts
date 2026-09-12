import { describe, expect, it } from 'vitest';
import {
    getResultSetColumns,
    getResultSetLabels,
    getVisibleResultColumns,
    updateResultSetColumnSelection,
} from './responseResults';

describe('responseResults', () => {
    it('labels duplicate names and derives columns from the first row', () => {
        const sets = [
            { name: 'DATA', rows: [{ a: 1, b: 2 }] },
            { name: 'DATA', rows: [{ c: 3 }] },
        ];
        expect(getResultSetLabels(sets)).toEqual(['DATA 1', 'DATA 2']);
        expect(getResultSetColumns(sets[0])).toEqual(['a', 'b']);
        expect(getResultSetColumns({ name: '', rows: [] })).toEqual([]);
    });

    it('keeps selections independent and filters only visible columns', () => {
        const initial = { 0: ['a'], 1: ['c'] };
        const next = updateResultSetColumnSelection(initial, 0, []);
        expect(next).toEqual({ 0: [], 1: ['c'] });
        expect(initial).toEqual({ 0: ['a'], 1: ['c'] });
        expect(getVisibleResultColumns(['missing', 'a'], ['a', 'b'])).toEqual(['a']);
    });
});
