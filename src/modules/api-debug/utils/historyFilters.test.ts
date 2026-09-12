import { describe, expect, it } from 'vitest';
import type { RequestHistoryEntry } from '../types/requestHistory';
import {
    filterHistoryEntries,
    getHistoryCounts,
    getHistoryEnvironments,
    isWithinTime,
} from './historyFilters';

const entry = (
    id: string,
    timestamp: number,
    success: boolean,
    extra: Partial<RequestHistoryEntry> = {},
): RequestHistoryEntry => ({
    id,
    timestamp,
    projectName: 'Project',
    caseName: id,
    mode: 'ui',
    request: { address: 'host/100', msgtype: '100', params: [] },
    response: { code: '0', message: success ? 'ok' : 'failed', resultSets: [] },
    outcome: { success },
    ...extra,
});

describe('historyFilters', () => {
    const now = 1_000_000_000;
    const entries = [
        entry('success', now - 1_000, true, { environmentName: 'dev' }),
        entry('failed', now - 3_600_000, false, { environmentName: 'prod', mode: 'script' }),
        entry('old', now - 604_800_001, true, { environmentName: 'dev' }),
    ];

    it('deduplicates environments and counts outcomes', () => {
        expect(
            getHistoryEnvironments([
                ...entries,
                entry('other', now, true, { environmentName: 'dev' }),
            ]),
        ).toEqual(['dev', 'prod']);
        expect(getHistoryCounts(entries)).toEqual({ all: 3, failed: 1, success: 2 });
    });

    it('combines result, environment, mode, keyword and time filters', () => {
        expect(
            filterHistoryEntries(entries, {
                resultFilter: 'success',
                timeFilter: 'day',
                environment: 'dev',
                query: 'SUCCESS',
                now,
            }).map((item) => item.id),
        ).toEqual(['success']);
        expect(
            filterHistoryEntries(entries, {
                resultFilter: 'failed',
                timeFilter: 'all',
                mode: 'script',
                now,
            }).map((item) => item.id),
        ).toEqual(['failed']);
    });

    it('uses an injected now and includes the exact time boundary', () => {
        expect(isWithinTime(entry('x', now - 86_400_000, true), 'day', now)).toBe(true);
        expect(isWithinTime(entry('x', now - 86_400_001, true), 'day', now)).toBe(false);
    });
});
