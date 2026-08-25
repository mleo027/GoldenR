import type { KcbpResultSet } from '@/shared/kcbp/types';

export interface ResponseData {
    code: string | number;
    message: string;
    data: Record<string, unknown>[];
    resultSets?: KcbpResultSet[];
    calledAt?: number;
    stats?: {
        timecost: number;
        rows: number;
    };
}
