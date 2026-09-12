import type {
    KcbpPickPathResult,
    KcbpRequestOptions,
    KcbpResponseData,
    KcbpRuntimeConfig,
} from '@/shared/kcbp/types';
import type {
    DbConnectionConfig,
    DbScriptQueryRequest,
    DbScriptQueryResponse,
    DbSuggestRequest,
    DbSuggestResponse,
    DbTestConnectionResult,
} from '@/shared/suggest/types';
import type { AgentGatewayConfig, AgentGatewayConfigInput } from '@/shared/agent/gateway';
import type {
    AgentCreateRunRequest,
    AgentCreateRunResult,
    AgentRunEvent,
    AgentStatus,
    AgentToolResultRequest,
} from '@/shared/agent/protocol';
import type {
    AutomationFolderRunReport,
    AutomationRunReport,
    AutomationSqlExecuteRequest,
    AutomationSqlExecuteResult,
    AutomationStorageSnapshot,
    AutomationWorkspace,
} from '@/shared/automation/types';

export type ImportFileFormat = 'json' | 'ini';

export type ImportFileResult =
    | { opened: false }
    | { opened: true; format: 'json'; data: unknown; filePath: string }
    | { opened: true; format: 'ini'; content: string; filePath: string };

export type ParamFileOpenResult =
    | { opened: false }
    | { opened: true; filePath: string; size: number };

export type ParamFileStatResult = { exists: true; size: number } | { exists: false; error: string };

export type SaveFileResult =
    | { saved: true; filePath: string }
    | { saved: false; filePath?: string; error?: string };

export interface ConfigStorageApi {
    readAppEnv(): Promise<unknown | null>;
    writeAppEnv(data: unknown): Promise<void>;
    readWorkspace(): Promise<unknown | null>;
    writeWorkspace(data: unknown): Promise<void>;
    readProjects(): Promise<unknown | null>;
    writeProjects(data: unknown): Promise<void>;
    readCommonParams(): Promise<unknown | null>;
    writeCommonParams(data: unknown): Promise<void>;
    readApiDebugEnvironments(): Promise<unknown | null>;
    writeApiDebugEnvironments(data: unknown): Promise<void>;
    readDbConnection(): Promise<unknown | null>;
    writeDbConnection(data: unknown): Promise<void>;
    readParamSuggestRules(): Promise<unknown | null>;
    writeParamSuggestRules(data: unknown): Promise<void>;
    readKcbpRuntimeConfig(): Promise<unknown | null>;
    writeKcbpRuntimeConfig(data: unknown): Promise<void>;
    readRequestHistory(): Promise<unknown | null>;
    writeRequestHistory(data: unknown): Promise<void>;
}

export interface KcbpApi {
    call(payload: KcbpRequestOptions): Promise<KcbpResponseData>;
    callWithTrace(
        payload: KcbpRequestOptions,
        databaseConfig: DbConnectionConfig,
        options: import('@/shared/kcbp/types').TraceExecutionOptions,
    ): Promise<KcbpResponseData>;
    cancel(): Promise<boolean>;
    runtime: {
        getConfig(): Promise<KcbpRuntimeConfig>;
        saveConfig(config: KcbpRuntimeConfig): Promise<KcbpRuntimeConfig>;
        pickDirectory(defaultPath?: string): Promise<KcbpPickPathResult>;
        pickFile(defaultPath?: string): Promise<KcbpPickPathResult>;
    };
}

export interface DatabaseApi {
    testConnection(config: DbConnectionConfig): Promise<DbTestConnectionResult>;
    suggest(request: DbSuggestRequest): Promise<DbSuggestResponse>;
    queryScript(request: DbScriptQueryRequest): Promise<DbScriptQueryResponse>;
    reloadSuggestConfig(): Promise<void>;
}

export interface AutomationApi {
    load(): Promise<AutomationStorageSnapshot>;
    saveWorkspace(workspace: AutomationWorkspace): Promise<void>;
    saveScenarioReport(report: AutomationRunReport): Promise<void>;
    saveFolderReport(report: AutomationFolderRunReport): Promise<void>;
    executeSql(request: AutomationSqlExecuteRequest): Promise<AutomationSqlExecuteResult>;
    cancelSql(requestId: string): Promise<boolean>;
}

export interface AgentEventPayload {
    runId: string;
    event: AgentRunEvent;
}

/**
 * 应用向 Agent 开放的宿主接口。
 *
 * 这些是渲染进程能调用的通道；Agent 侧只能通过工具白名单请求同等能力，
 * 无法直接访问文件系统、数据库或网络。
 */
export interface AgentApi {
    status(): Promise<AgentStatus>;
    start(): Promise<AgentStatus>;
    stop(): Promise<void>;
    send(request: AgentCreateRunRequest): Promise<AgentCreateRunResult>;
    cancel(runId: string): Promise<void>;
    submitToolResult(runId: string, result: AgentToolResultRequest): Promise<void>;
    onEvent(callback: (payload: AgentEventPayload) => void): () => void;
    readGatewayConfig(): Promise<AgentGatewayConfig>;
    writeGatewayConfig(input: AgentGatewayConfigInput): Promise<AgentGatewayConfig>;
}

export interface ImportExportApi {
    saveJson(content: string, defaultFilename: string): Promise<SaveFileResult>;
    saveCsv(content: string, defaultFilename: string): Promise<SaveFileResult>;
    saveTxt(content: string, defaultFilename: string): Promise<SaveFileResult>;
    saveHtml(content: string, defaultFilename: string): Promise<SaveFileResult>;
    saveIni(content: string, defaultFilename: string): Promise<SaveFileResult>;
    openImportFile(format: ImportFileFormat): Promise<ImportFileResult>;
    openParamFile(): Promise<ParamFileOpenResult>;
    statParamFile(filePath: string): Promise<ParamFileStatResult>;
}

export interface WindowApi {
    minimize(): Promise<void>;
    toggleMaximize(): Promise<boolean>;
    isMaximized(): Promise<boolean>;
    onMaximizedChange(callback: (isMaximized: boolean) => void): () => void;
}

export interface AppLifecycleApi {
    getUserDataDir(): Promise<string>;
    onFlushStorage(callback: () => void | Promise<void>): () => void;
}

export interface ElectronAPI {
    config: ConfigStorageApi;
    kcbp: KcbpApi;
    database: DatabaseApi;
    automation: AutomationApi;
    agent: AgentApi;
    importExport: ImportExportApi;
    window: WindowApi;
    app: AppLifecycleApi;
}
