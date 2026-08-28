import type { EditorMode, ParamItem, ResponseData } from './workspace';
import type { ScriptTestResult } from './scriptTest';
import type { ScriptConsoleSnapshot } from './scriptConsole';
import type { TcdCallStep } from '@/shared/tcd/types';

export type RequestHistoryMode = EditorMode | 'tcd';

export interface RequestHistoryRequestSnapshot {
    address: string;
    msgtype: string;
    queue?: string;
    timeout?: string;
    params: ParamItem[];
    script?: string;
    runInput?: Record<string, unknown>;
}

export interface RequestHistoryOutcome {
    success: boolean;
    rows?: number;
    timecost?: number;
    dataSize?: number;
    businessCode?: string | number;
    transportCode?: string | number;
    message?: string;
    scriptError?: string;
    scriptTest?: ScriptTestResult;
    callSteps?: TcdCallStep[];
    scriptConsole?: ScriptConsoleSnapshot;
}

export interface RequestHistoryEntry {
    id: string;
    timestamp: number;
    projectId?: string;
    projectName: string;
    caseId?: string;
    caseName: string;
    mode: RequestHistoryMode;
    environmentId?: string;
    environmentName?: string;
    request: RequestHistoryRequestSnapshot;
    response: ResponseData;
    outcome: RequestHistoryOutcome;
}

export interface RequestHistoryFile {
    version: 1 | 2;
    entries: RequestHistoryEntry[];
}
