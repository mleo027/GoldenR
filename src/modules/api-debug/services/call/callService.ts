import type { TabData } from '../../types/workspace';
import { resolveApiCallExecutor } from './executors';
import type {
    InvokeKcbpCallOptions,
    KcbpCallOutcome,
    KcbpInvokeMode,
    RunNestedKcbpCase,
} from '../kcbp/types';

export type ApiProtocol = 'KCBP' | 'KGBP' | 'KUAB';
export type ApiCallOutcome = KcbpCallOutcome;
export type ApiCallOptions = InvokeKcbpCallOptions;

function withProtocolDispatcher(options: ApiCallOptions): ApiCallOptions {
    if (options.runNestedCase) return options;
    const runNestedCase: RunNestedKcbpCase = (tab, nestedOptions) =>
        invokeApiCall(tab, 'tcd', { ...nestedOptions, runNestedCase });
    return { ...options, runNestedCase };
}

/**
 * Protocol-neutral execution entry point. The request mapper and native bridge
 * preserve the protocol discriminator, while this layer owns lifecycle dispatch.
 */
export function invokeApiCall(
    tab: Pick<
        TabData,
        | 'address'
        | 'name'
        | 'params'
        | 'protocol'
        | 'script'
        | 'requestScript'
        | 'responseScript'
        | 'runInput'
    >,
    editorMode: KcbpInvokeMode = 'script',
    options: ApiCallOptions = {},
): Promise<ApiCallOutcome> {
    return resolveApiCallExecutor(tab.protocol)(tab, editorMode, withProtocolDispatcher(options));
}
