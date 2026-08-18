import { parseKcbpResponseStatus } from '../../utils/kcbp/kcbpResponse';
import type { RequestHistoryEntry } from '../../types/requestHistory';

export type ResultFilter = 'all' | 'failed' | 'success';
export type TimeFilter = 'all' | 'hour' | 'day' | 'week';

export function getResultSummary(entry: RequestHistoryEntry): string {
    const status = parseKcbpResponseStatus(entry.response);
    const message = status.businessMsg || entry.outcome.message || entry.response.message || '成功';
    if (entry.outcome.success) return message;
    return `${status.businessCode ?? status.transportCode ?? ''} ${message}`.trim();
}

export function formatHistoryTime(value: number): string {
    return new Date(value).toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

export function getDayLabel(timestamp: number): string {
    const date = new Date(timestamp);
    const today = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const startYesterday = startToday - 86_400_000;
    const value = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    if (value === startToday) return '今天';
    if (value === startYesterday) return '昨天';
    return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function getDayKey(timestamp: number): string {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function isWithinTime(entry: RequestHistoryEntry, filter: TimeFilter): boolean {
    if (filter === 'all') return true;
    const now = Date.now();
    const limit = filter === 'hour' ? 3_600_000 : filter === 'day' ? 86_400_000 : 604_800_000;
    return now - entry.timestamp <= limit;
}
