import { describe, expect, it } from 'vitest';
import type { ResponseData } from '../types/workspace';
import { MAX_HISTORY_RESPONSE_ROWS, truncateResponseForHistory } from './historyResponse';

describe('truncateResponseForHistory', () => {
    it('keeps the first 200 rows across result sets and marks truncation', () => {
        const response: ResponseData = {
            code: '0',
            message: 'ok',
            resultSets: [
                { name: 'DATA', rows: Array.from({ length: 150 }, (_, index) => ({ index })) },
                { name: 'DETAIL', rows: Array.from({ length: 100 }, (_, index) => ({ index })) },
            ],
        };
        const result = truncateResponseForHistory(response);
        expect(result.resultSets[0].rows).toHaveLength(150);
        expect(result.resultSets[1].rows).toHaveLength(50);
        expect(result.historyTruncated).toBe(true);
        expect(response.resultSets[1].rows).toHaveLength(100);
        expect(MAX_HISTORY_RESPONSE_ROWS).toBe(200);
    });

    it('does not add a warning field when no rows are removed', () => {
        const response: ResponseData = {
            code: '0',
            message: 'ok',
            resultSets: [{ name: '', rows: [{ id: 1 }] }],
        };
        expect(truncateResponseForHistory(response)).toEqual(response);
    });
});
