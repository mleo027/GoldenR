import { createAssertApi } from '@/shared/test/assert/createAssertApi';
import { mergeLibApi } from '@/shared/test/lib/loadCustomLib';
import { createNoopVarsApi } from '@/shared/test/variables/createVarsApi';
import { executeCaseScript, resolveCaseScript } from '../../utils/script/apiScript';
import { buildKcbpFields } from '../../utils/kcbp/kcbpFields';
import { createScriptConsole } from '../../utils/script/scriptConsole';
import { createScriptTest } from '../../utils/script/scriptTest';
import { mergeCommonParams } from '../../utils/workspace/commonParams';
import { createScriptCall, createScriptQuery } from './scriptCallRuntime';
import { finalizeScriptFailure, finalizeScriptSuccess } from './scriptOutcome';
import type { ScriptCaseTab } from './scriptRuntimeTypes';
import type { InvokeKcbpCallOptions, KcbpCallOutcome } from './types';

const unavailableFlow = {
    set: () => undefined,
    get: () => undefined,
    runCase: async () => {
        throw new Error('flow.runCase is not available');
    },
};

export async function runScriptCase(
    tab: ScriptCaseTab,
    msgtype: string,
    effectiveAddress: string,
    options: InvokeKcbpCallOptions,
): Promise<KcbpCallOutcome> {
    const effectiveParams =
        options.commonParams && options.commonParams.length > 0
            ? mergeCommonParams(options.commonParams, tab.params)
            : tab.params;
    const fallbackPayload = buildKcbpFields(effectiveParams);
    const consoleCapture = createScriptConsole();
    const test = createScriptTest(consoleCapture);
    const state = { lastOutcome: null, activeParams: tab.params };
    const call = createScriptCall({
        tab,
        msgtype,
        address: effectiveAddress,
        electronDeps: options.electronDeps,
        interpolate: (value) => value,
        consoleCapture,
        state,
    });
    const query = createScriptQuery(options.electronDeps, options.trace?.databaseConfig);
    const script = options.resolveScript?.(tab, msgtype) ?? resolveCaseScript(tab, msgtype);
    const outcomeConfig = {
        tab,
        msgtype,
        address: effectiveAddress,
        effectiveParams,
        fallbackPayload,
        electronDeps: options.electronDeps,
        consoleCapture,
        state,
    };

    try {
        const result = await executeCaseScript({
            script,
            ctx: {
                msgtype,
                address: effectiveAddress,
                params: tab.params,
                fields: fallbackPayload.fields,
                input: {},
                call,
            },
            consoleApi: consoleCapture.api,
            queryFn: query,
            testApi: test,
            flowApi: unavailableFlow,
            varsApi: createNoopVarsApi(),
            libApi: mergeLibApi({}),
            assertApi: createAssertApi(test, query),
        });
        return finalizeScriptSuccess(outcomeConfig, result);
    } catch (error) {
        return finalizeScriptFailure(outcomeConfig, error);
    }
}
