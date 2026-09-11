import { executeKcbp } from './kcbpExecutor';
import { executeKgbp } from './kgbpExecutor';
import { executeKuab } from './kuabExecutor';
import type { ApiCallExecutor } from './types';

export function resolveApiCallExecutor(protocol?: string): ApiCallExecutor {
    if (protocol === 'KGBP') return executeKgbp;
    if (protocol === 'KUAB') return executeKuab;
    return executeKcbp;
}

export type { ApiCallExecutor, ApiCallTab } from './types';
