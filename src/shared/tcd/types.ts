/** TCD 用例驱动类型：Call 步骤、Run 快照、套件编排（渲染/Electron 共用） */
/** TCD call 步骤内嵌的响应摘要（与 ResponseData 字段对齐） */
export interface TcdStepResponse {
    code: string | number;
    message: string;
    resultSets: { name: string; rows: Record<string, unknown>[] }[];
    calledAt?: number;
    stats?: {
        timecost: number;
        rows: number;
    };
}

/** TCD 单次 KCBP call 步骤记录 */
export interface TcdCallStep {
    index: number;
    msgtype: string;
    fields: Record<string, string>;
    response: TcdStepResponse;
    durationMs: number;
}

/** TCD 一次 Run 的快照 */
export interface TcdRunSnapshot {
    callSteps: TcdCallStep[];
    activeStepIndex: number;
    ranAt: number;
}

export type TcdRunInput = Record<string, unknown>;

export interface TcdCaseParam {
    name: string;
    value: string;
    type: 'string' | 'file' | 'disabled';
}

/** 执行层使用的 case 快照（与 SQLite cases 记录字段对齐） */
export interface TcdCaseTab {
    id: string;
    name: string;
    address: string;
    params: TcdCaseParam[];
    script?: string;
    runInput?: TcdRunInput;
    requestScript?: string;
    responseScript?: string;
    /** Phase 2：用例标签（可选，用于套件筛选） */
    tags?: string[];
}

export interface TcdProjectSnapshot {
    id: string;
    name: string;
    cases: TcdCaseTab[];
}

export interface TcdCaseRef {
    caseId: string;
    projectId?: string;
    label: string;
    msgtype: string;
}

export interface TcdScriptTestStep {
    name: string;
    status: 'pass' | 'fail';
    message: string;
}

export interface TcdScriptTestResult {
    passed: boolean;
    message: string;
    steps: TcdScriptTestStep[];
}

export interface TcdScriptConsoleEntry {
    level: 'log' | 'info' | 'warn' | 'error' | 'return' | 'step' | 'pass' | 'fail';
    message: string;
    timestamp: number;
}

export interface TcdScriptConsoleSnapshot {
    entries: TcdScriptConsoleEntry[];
    ranAt: number;
}

export interface TcdCaseRunResult {
    caseId: string;
    caseName: string;
    msgtype: string;
    /** KCBP 地址（含 host/功能号），用于报告展示 */
    address?: string;
    passed: boolean;
    durationMs: number;
    response: TcdStepResponse;
    callSteps?: TcdCallStep[];
    scriptTest?: TcdScriptTestResult;
    scriptConsole?: TcdScriptConsoleSnapshot;
    error?: string;
    /** 单 Run 持久化时由调用方写回 workspace */
    nextParams?: TcdCaseParam[];
    nextScript?: string;
}

export type TcdSuiteCaseStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface TcdSuiteProgressEvent {
    phase: 'case' | 'done';
    index: number;
    total: number;
    caseId: string;
    caseName: string;
    status: TcdSuiteCaseStatus;
    percent?: number;
}

export interface TcdSuiteRunOptions {
    stopOnFailure?: boolean;
    onProgress?: (event: TcdSuiteProgressEvent) => void;
    signal?: AbortSignal;
    yieldEventLoop?: () => Promise<void>;
}

export interface TcdSuiteRunResult {
    results: TcdCaseRunResult[];
    passedCount: number;
    failedCount: number;
    durationMs: number;
    cancelled: boolean;
}

export interface TcdSuiteHooks {
    beforeSuite?: string[];
    afterSuite?: string[];
    beforeCase?: string[];
    afterCase?: string[];
}

/** tcd-suite.json 配置 */
export interface TcdSuiteConfig {
    projectIndex?: number;
    caseIds?: string[];
    msgtypes?: string[];
    tags?: string[];
    allCases?: boolean;
    stopOnFailure?: boolean;
    kcxpEnvironmentId?: string;
    suiteName?: string;
    variables?: Record<string, unknown>;
    hooks?: TcdSuiteHooks;
    dataFile?: string;
    concurrency?: number;
    resumeFromCaseId?: string;
}
