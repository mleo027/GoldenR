import { parseKcbpResponseStatus } from './kcbp/kcbpResponse';
import type { RequestHistoryEntry } from '../types/requestHistory';

export type ResultFilter = 'all' | 'failed' | 'success';
export type TimeFilter = 'all' | 'hour' | 'day' | 'week';

export function getHistoryEnvironments(entries: RequestHistoryEntry[]): string[] {
    return [...new Set(entries.map((entry) => entry.environmentName).filter(Boolean))] as string[];
}

export function getResultSummary(entry: RequestHistoryEntry): string {
    const status = parseKcbpResponseStatus(entry.response);
    const message = status.businessMsg || entry.outcome.message || entry.response.message || '成功';
    if (entry.outcome.success) return message;
    return `${status.businessCode ?? status.transportCode ?? ''} ${message}`.trim();
}

export function matchesHistoryKeyword(entry: RequestHistoryEntry, query: string): boolean {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return true;
    return [
        entry.caseName,
        entry.projectName,
        entry.request.msgtype,
        entry.request.address,
        getResultSummary(entry),
        entry.response.message,
    ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
}

export function isWithinTime(
    entry: RequestHistoryEntry,
    filter: TimeFilter,
    now = Date.now(),
): boolean {
    if (filter === 'all') return true;
    const limit = filter === 'hour' ? 3_600_000 : filter === 'day' ? 86_400_000 : 604_800_000;
    return now - entry.timestamp <= limit;
}

export function filterHistoryEntries(
    entries: RequestHistoryEntry[],
    options: {
        resultFilter: ResultFilter;
        timeFilter: TimeFilter;
        environment?: string;
        mode?: string;
        query?: string;
        now?: number;
    },
): RequestHistoryEntry[] {
    return entries.filter((entry) => {
        if (options.resultFilter === 'failed' && entry.outcome.success) return false;
        if (options.resultFilter === 'success' && !entry.outcome.success) return false;
        if (options.environment && entry.environmentName !== options.environment) return false;
        if (options.mode && entry.mode !== options.mode) return false;
        if (!isWithinTime(entry, options.timeFilter, options.now)) return false;
        return matchesHistoryKeyword(entry, options.query ?? '');
    });
}

export function getHistoryCounts(entries: RequestHistoryEntry[]): Record<ResultFilter, number> {
    return {
        all: entries.length,
        failed: entries.filter((entry) => !entry.outcome.success).length,
        success: entries.filter((entry) => entry.outcome.success).length,
    };
}
