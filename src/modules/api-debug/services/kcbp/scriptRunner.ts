import { FlowRuntime } from '@/shared/tcd/flow';
import { normalizeRunInput } from '@/shared/tcd/runInputJson';
import { createAssertApi, createNoopAssertApi } from '@/shared/test/assert/createAssertApi';
import { mergeLibApi } from '@/shared/test/lib/loadCustomLib';
import { createVarsApi, createNoopVarsApi } from '@/shared/test/variables/createVarsApi';
import { paramsToVariableMap } from '@/shared/test/variables/resolveScope';
import { executeCaseScript, resolveCaseScript } from '../../utils/script/apiScript';
import { buildKcbpFields } from '../../utils/kcbp/kcbpFields';
import { createScriptConsole } from '../../utils/script/scriptConsole';
import { createScriptTest } from '../../utils/script/scriptTest';
import { mergeCommonParams } from '../../utils/workspace/commonParams';
import { createScriptCall, createScriptQuery } from './scriptCallRuntime';
import { createScriptFlowApi } from './scriptFlowRuntime';
import { finalizeScriptFailure, finalizeScriptSuccess } from './scriptOutcome';
import type { ScriptCaseTab, ScriptExecutionState } from './scriptRuntimeTypes';
import type { InvokeKcbpCallOptions, KcbpCallOutcome, KcbpInvokeMode } from './types';

function createVariableRuntime(tab: ScriptCaseTab, options: InvokeKcbpCallOptions, isTcd: boolean) {
    const testRunContext = {
        ...options.testRunContext,
        caseVariables: {
            ...(options.testRunContext?.caseVariables ?? {}),
            ...(isTcd ? paramsToVariableMap(tab.params) : {}),
        },
    };
    const layers = isTcd
        ? [
              testRunContext.globalVariables ?? {},
              testRunContext.environmentVariables ?? {},
              testRunContext.suiteVariables ?? {},
              testRunContext.caseVariables ?? {},
          ]
        : [];
    return {
        testRunContext,
        varsApi: isTcd ? createVarsApi(layers) : createNoopVarsApi(),
        libApi: mergeLibApi(isTcd ? (options.customLib ?? {}) : {}),
    };
}

export async function runScriptOrTcdCase(
    tab: ScriptCaseTab,
    editorMode: KcbpInvokeMode,
    msgtype: string,
    effectiveAddress: string,
    options: InvokeKcbpCallOptions,
): Promise<KcbpCallOutcome> {
    const isTcd = editorMode === 'tcd';
    const effectiveParams =
        options.commonParams && options.commonParams.length > 0
            ? mergeCommonParams(options.commonParams, tab.params)
            : tab.params;
    const fallbackPayload = buildKcbpFields(effectiveParams);
    const consoleCapture = createScriptConsole();
    const test = createScriptTest(consoleCapture);
    const state: ScriptExecutionState = {
        lastOutcome: null,
        activeParams: tab.params,
        callSteps: [],
        callCounter: 0,
    };
    const variableRuntime = createVariableRuntime(tab, options, isTcd);
    const call = createScriptCall({
        tab,
        msgtype,
        address: effectiveAddress,
        electronDeps: options.electronDeps,
        isTcd,
        interpolate: variableRuntime.varsApi.interpolate,
        consoleCapture,
        state,
    });
    const query = createScriptQuery(options.electronDeps, options.trace?.databaseConfig);
    const flowRuntime = isTcd ? (options.flow ?? new FlowRuntime()) : null;
    const flowApi = createScriptFlowApi({
        flowRuntime,
        caseIndex: options.caseIndex ?? { byId: new Map(), byMsgtype: new Map() },
        options,
        electronDeps: options.electronDeps,
        effectiveAddress,
        testRunContext: variableRuntime.testRunContext,
        state,
    });
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
                input: isTcd
                    ? normalizeRunInput(options.runInput ?? tab.runInput)
                    : normalizeRunInput({}),
                call,
            },
            consoleApi: consoleCapture.api,
            queryFn: query,
            testApi: test,
            flowApi,
            varsApi: variableRuntime.varsApi,
            libApi: variableRuntime.libApi,
            assertApi: isTcd ? createAssertApi(test, query) : createNoopAssertApi(),
        });
        return finalizeScriptSuccess(outcomeConfig, result);
    } catch (error) {
        return finalizeScriptFailure(outcomeConfig, error);
    }
}
