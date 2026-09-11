import type { ResponseData } from '../../types/workspace';
import { formatScriptOutput, paramsToCaseScript } from '../../utils/script/apiScript';
import type { buildKcbpFields } from '../../utils/kcbp/kcbpFields';
import { parseKcbpResponseStatus } from '../../utils/kcbp/kcbpResponse';
import type { createScriptConsole } from '../../utils/script/scriptConsole';
import { isScriptTestResult, ScriptTestFailure } from '../../utils/script/scriptTest';
import { invokeKcbpWithFields } from './singleCall';
import type { ScriptCaseTab, ScriptExecutionState } from './scriptRuntimeTypes';
import type { KcbpCallOutcome, TcdElectronDeps } from './types';

interface OutcomeConfig {
    tab: ScriptCaseTab;
    msgtype: string;
    address: string;
    effectiveParams: ScriptCaseTab['params'];
    fallbackPayload: ReturnType<typeof buildKcbpFields>;
    electronDeps?: TcdElectronDeps;
    consoleCapture: ReturnType<typeof createScriptConsole>;
    state: ScriptExecutionState;
}

function attachCallSteps(config: OutcomeConfig, outcome: KcbpCallOutcome): KcbpCallOutcome {
    return {
        ...outcome,
        callSteps: config.state.callSteps.length > 0 ? config.state.callSteps : undefined,
    };
}

function nextScript(outcome: KcbpCallOutcome): string | undefined {
    return outcome.missingParam
        ? paramsToCaseScript(outcome.nextParams, outcome.msgtype)
        : undefined;
}

function decorateOutcome(
    config: OutcomeConfig,
    outcome: KcbpCallOutcome,
    extra: Partial<KcbpCallOutcome>,
): KcbpCallOutcome {
    return attachCallSteps(config, {
        ...outcome,
        effectiveParams: config.state.activeParams,
        scriptConsole: config.consoleCapture.snapshot(),
        nextScript: nextScript(outcome),
        ...extra,
    });
}

function noResponseOutcome(config: OutcomeConfig): KcbpCallOutcome {
    const message = '脚本未产生 API 响应';
    const response: ResponseData = {
        code: '-1',
        message,
        resultSets: [],
        calledAt: Date.now(),
    };
    return {
        response,
        nextParams: config.tab.params,
        status: parseKcbpResponseStatus(response),
        missingParam: null,
        msgtype: config.msgtype,
    };
}

export function finalizeScriptSuccess(config: OutcomeConfig, result: unknown): KcbpCallOutcome {
    if (!config.state.lastOutcome && !isScriptTestResult(result)) {
        throw new Error('脚本未调用 call()，无法发送请求');
    }
    const outcome = config.state.lastOutcome ?? noResponseOutcome(config);
    if (isScriptTestResult(result)) {
        return decorateOutcome(config, outcome, { scriptResult: result, scriptTest: result });
    }
    if (result !== undefined) config.consoleCapture.append('return', formatScriptOutput(result));
    return decorateOutcome(config, outcome, { scriptResult: result });
}

function finalizeTestFailure(config: OutcomeConfig, error: ScriptTestFailure): KcbpCallOutcome {
    const outcome = config.state.lastOutcome ?? noResponseOutcome(config);
    return decorateOutcome(config, outcome, {
        scriptError: error.result.message,
        scriptTest: error.result,
    });
}

export async function finalizeScriptFailure(
    config: OutcomeConfig,
    error: unknown,
): Promise<KcbpCallOutcome> {
    if (error instanceof ScriptTestFailure) return finalizeTestFailure(config, error);
    const scriptError = error instanceof Error ? error.message : String(error);
    config.consoleCapture.append('error', scriptError);
    if (config.state.lastOutcome) {
        return decorateOutcome(config, config.state.lastOutcome, { scriptError });
    }
    const outcome = await invokeKcbpWithFields({
        tab: config.tab,
        msgtype: config.msgtype,
        fields: config.fallbackPayload.fields,
        binaryFields: config.fallbackPayload.binaryFields,
        baseParams: config.tab.params,
        electronDeps: config.electronDeps,
        addressOverride: config.address,
    });
    return decorateOutcome({ ...config, effectiveParams: config.effectiveParams }, outcome, {
        scriptError,
        effectiveParams: config.effectiveParams,
    });
}

export type { OutcomeConfig as ScriptOutcomeConfig };
