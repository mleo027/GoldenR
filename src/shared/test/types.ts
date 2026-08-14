import type { KcxpEnvironment } from '@/modules/api-debug/types/kcxp';
import type {
    TcdCallStep,
    TcdScriptConsoleSnapshot,
    TcdScriptTestResult,
    TcdStepResponse,
} from '@/shared/tcd/types';

export type TestVariableValue =
    | string
    | number
    | boolean
    | null
    | Record<string, unknown>
    | unknown[];

export type TestVariableMap = Record<string, TestVariableValue>;

/** test.env.json 中的测试环境（KCXP + 环境变量） */
export interface TestEnvironment extends KcxpEnvironment {
    /** dev | test | uat | staging | prod */
    envType?: string;
    enabled?: boolean;
    variables?: TestVariableMap;
    dbProfileId?: string;
}

export interface TestGlobalConfig {
    variables?: TestVariableMap;
}

export interface TestSuiteHooks {
    beforeSuite?: string[];
    afterSuite?: string[];
    beforeCase?: string[];
    afterCase?: string[];
}

export interface TestRunContext {
    globalVariables?: TestVariableMap;
    environmentVariables?: TestVariableMap;
    suiteVariables?: TestVariableMap;
    caseVariables?: TestVariableMap;
    environmentId?: string;
    suiteName?: string;
}

export interface TcdRunHistoryEntry {
    id: string;
    ranAt: number;
    environmentId?: string;
    suiteName?: string;
    passedCount: number;
    failedCount: number;
    durationMs: number;
    cancelled: boolean;
    configSnapshot?: Record<string, unknown>;
    results: Array<{
        caseId: string;
        caseName: string;
        msgtype: string;
        address?: string;
        passed: boolean;
        durationMs: number;
        error?: string;
        response?: TcdStepResponse;
        callSteps?: TcdCallStep[];
        scriptTest?: TcdScriptTestResult;
        scriptConsole?: TcdScriptConsoleSnapshot;
    }>;
}

export interface TcdRunHistoryIndex {
    runs: TcdRunHistoryEntry[];
}
