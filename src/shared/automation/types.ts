import type { KcbpResponseData } from '../kcbp/types';

export type AutomationRunStatus =
    | 'pending'
    | 'running'
    | 'passed'
    | 'failed'
    | 'cancelled'
    | 'skipped';

export type AutomationInputValue = string | number | boolean | null;
export type AutomationInputValues = Record<string, AutomationInputValue>;
export type AutomationSqlParams = Record<string, AutomationInputValue>;

interface InputBase {
    label?: string;
    description?: string;
    required?: boolean;
    sensitive?: boolean;
    default?: AutomationInputValue;
}

export type ScenarioInputDefinition =
    | (InputBase & { type: 'string'; minLength?: number; maxLength?: number })
    | (InputBase & { type: 'number'; min?: number; max?: number })
    | (InputBase & { type: 'boolean' })
    | (InputBase & { type: 'select'; options: Array<{ label: string; value: string }> });

export interface AutomationScenarioMetadata {
    inputs?: Record<string, ScenarioInputDefinition>;
}

export interface AutomationProject {
    id: string;
    name: string;
    position: number;
    createdAt: number;
    updatedAt: number;
}

export interface AutomationFolder {
    id: string;
    projectId: string;
    parentId?: string;
    name: string;
    position: number;
    createdAt: number;
    updatedAt: number;
}

export interface AutomationScenario {
    id: string;
    projectId: string;
    folderId?: string;
    name: string;
    script: string;
    position: number;
    enabled: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface AutomationWorkspace {
    projects: AutomationProject[];
    folders: AutomationFolder[];
    scenarios: AutomationScenario[];
}

export type AutomationActionKind =
    | 'sql-query'
    | 'sql-execute'
    | 'api-call'
    | 'assertion'
    | 'variable'
    | 'log'
    | 'cleanup';

export interface AutomationActionReport {
    id: string;
    stepId?: string;
    kind: AutomationActionKind;
    name: string;
    status: AutomationRunStatus;
    startedAt: number;
    durationMs: number;
    request?: unknown;
    result?: unknown;
    error?: string;
    truncated?: boolean;
}

export interface AutomationStepReport {
    id: string;
    parentId?: string;
    name: string;
    depth: number;
    status: AutomationRunStatus;
    startedAt: number;
    durationMs: number;
    error?: string;
    actions: AutomationActionReport[];
}

export interface AutomationRunReport {
    id: string;
    scenarioId: string;
    scenarioName: string;
    environmentId: string;
    status: AutomationRunStatus;
    startedAt: number;
    durationMs: number;
    inputs: AutomationInputValues;
    steps: AutomationStepReport[];
    error?: string;
    forcedTermination?: boolean;
    cleanupSkipped?: boolean;
}

export interface AutomationFolderRunReport {
    id: string;
    folderId: string;
    startedAt: number;
    durationMs: number;
    status: AutomationRunStatus;
    passedCount: number;
    failedCount: number;
    skippedCount: number;
    scenarioReports: AutomationRunReport[];
}

export interface AutomationSqlExecuteRequest {
    requestId: string;
    environmentId: string;
    sql: string;
    params?: AutomationSqlParams;
}

export interface AutomationSqlExecuteResult {
    rowsAffected: number[];
    rows: Record<string, unknown>[];
    columns: string[];
    totalRows: number;
    truncated: boolean;
    returnValue?: number;
    output?: Record<string, unknown>;
    elapsedMs: number;
}

export interface AutomationApiCallRequest {
    environmentId: string;
    msgtype: string;
    fields: Record<string, AutomationInputValue | { file: string }>;
}

export interface AutomationApiCallResult {
    response: KcbpResponseData;
    elapsedMs: number;
}

export type AutomationProgressEvent =
    | { type: 'step-started'; stepId: string; name: string; depth: number; parentId?: string }
    | { type: 'step-finished'; stepId: string; status: AutomationRunStatus; error?: string }
    | { type: 'action-started'; action: AutomationActionReport }
    | { type: 'action-finished'; action: AutomationActionReport };

export interface AutomationStorageSnapshot {
    workspace: AutomationWorkspace;
    scenarioReports: Record<string, AutomationRunReport>;
    folderReports: Record<string, AutomationFolderRunReport>;
}
