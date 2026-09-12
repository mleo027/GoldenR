import type { KcbpResultSet } from '@/shared/kcbp/types';
import type { SqlTraceResult } from '@/shared/kcbp/types';

export interface ResponseData {
    code: string | number;
    message: string;
    /** 恒为结果集数组（IPC 层已归一化） */
    resultSets: KcbpResultSet[];
    calledAt?: number;
    stats?: {
        timecost: number;
        rows: number;
    };
    trace?: SqlTraceResult;
    /** 历史记录仅保存前 200 行时的截断标记。 */
    historyTruncated?: boolean;
}
