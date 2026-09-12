import type { ResponseData } from '../types/workspace';

export const MAX_HISTORY_RESPONSE_ROWS = 200;

export function truncateResponseForHistory(response: ResponseData): ResponseData {
    let remaining = MAX_HISTORY_RESPONSE_ROWS;
    let truncated = false;
    const resultSets = response.resultSets.map((resultSet) => {
        const rows = resultSet.rows.slice(0, remaining);
        remaining -= rows.length;
        if (rows.length < resultSet.rows.length) truncated = true;
        return { ...resultSet, rows };
    });

    return { ...response, resultSets, ...(truncated ? { historyTruncated: true } : {}) };
}
