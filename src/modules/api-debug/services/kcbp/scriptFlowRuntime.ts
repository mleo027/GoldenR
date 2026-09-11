import { createNoopFlowApi, type FlowRuntime } from '@/shared/tcd/flow';
import { cloneCaseTab, resolveCaseRef } from '@/shared/tcd/resolveCase';
import type { TcdCaseIndex } from '@/shared/tcd/resolveCase';
import type { TcdCaseTab } from '@/shared/tcd/types';
import { normalizeRunInput } from '@/shared/tcd/runInputJson';
import type { TestRunContext } from '@/shared/test/types';
import { applyKcxpEnvironmentToAddress } from '../../utils/workspace/kcxpEnvironment';
import type { ScriptCaseTab, ScriptExecutionState } from './scriptRuntimeTypes';
import type { InvokeKcbpCallOptions, TcdElectronDeps } from './types';

interface FlowConfig {
    flowRuntime: FlowRuntime | null;
    caseIndex: TcdCaseIndex;
    options: InvokeKcbpCallOptions;
    electronDeps?: TcdElectronDeps;
    effectiveAddress: string;
    testRunContext: TestRunContext;
    state: ScriptExecutionState;
}

function createNestedTab(source: TcdCaseTab): ScriptCaseTab {
    const protocol = (source as TcdCaseTab & { protocol?: string }).protocol ?? 'KCBP';
    return { ...cloneCaseTab(source), protocol };
}

function nestedAddress(tab: ScriptCaseTab, config: FlowConfig): string {
    return config.options.kcxpEnvironment
        ? applyKcxpEnvironmentToAddress(tab.address, config.options.kcxpEnvironment)
        : config.effectiveAddress;
}

async function runNestedCase(
    ref: string,
    input: Record<string, unknown> | undefined,
    config: FlowConfig,
) {
    const nestedTab = createNestedTab(resolveCaseRef(ref, config.caseIndex));
    const runInput = input
        ? { ...normalizeRunInput(nestedTab.runInput), ...input }
        : normalizeRunInput(nestedTab.runInput);
    const outcome = await config.options.runNestedCase?.(nestedTab, {
        runInput,
        flow: config.flowRuntime ?? undefined,
        caseIndex: config.caseIndex,
        electronDeps: config.electronDeps,
        resolveScript: config.options.resolveScript,
        effectiveAddress: nestedAddress(nestedTab, config),
        testRunContext: config.testRunContext,
        customLib: config.options.customLib,
        kcxpEnvironment: config.options.kcxpEnvironment,
    });
    if (!outcome) throw new Error('runNestedCase is required for TCD flow.runCase');
    config.state.lastOutcome ??= outcome;
    return outcome.response;
}

export function createScriptFlowApi(config: FlowConfig) {
    const flow = config.flowRuntime;
    if (!flow) return createNoopFlowApi();
    return {
        set: (key: string, value: unknown) => flow.set(key, value),
        get: (key: string) => flow.get(key),
        runCase: async (ref: string, input?: Record<string, unknown>) => {
            flow.enterRunCase();
            try {
                return await runNestedCase(ref, input, config);
            } finally {
                flow.leaveRunCase();
            }
        },
    };
}
