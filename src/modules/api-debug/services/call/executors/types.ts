import type { TabData } from '../../../types/workspace';
import type { InvokeKcbpCallOptions, KcbpCallOutcome, KcbpInvokeMode } from '../../kcbp/types';

export type ApiCallTab = Pick<
    TabData,
    | 'address'
    | 'name'
    | 'params'
    | 'protocol'
    | 'script'
    | 'requestScript'
    | 'responseScript'
    | 'runInput'
>;
export type ApiCallExecutor = (
    tab: ApiCallTab,
    mode: KcbpInvokeMode,
    options: InvokeKcbpCallOptions,
) => Promise<KcbpCallOutcome>;
