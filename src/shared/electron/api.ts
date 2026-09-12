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
import type {
    AutomationFolderRunReport,
    AutomationRunReport,
    AutomationSqlExecuteRequest,
    AutomationSqlExecuteResult,
    AutomationStorageSnapshot,
    AutomationWorkspace,
} from '@/shared/automation/types';
import type {
    CapabilityInvokeRequest,
    CapabilityInvokeResponse,
    CapabilityManifestPayload,
} from '@/shared/capabilities/host';

import type { McpSettings, McpState } from '@/shared/mcp/types';

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

/**
 * 应用向外部调用方（MCP 等）开放的能力宿主接口。
 *
 * 这一层只把请求转发到平台能力注册表，不解释任何业务语义：能力清单与实现都由
 * 模块提供，主进程与渲染层都不为某个模块定制通道。
 */
export interface CapabilityHostApi {
    /** 订阅主进程发来的能力调用请求；返回取消订阅函数。 */
    onInvoke(callback: (request: CapabilityInvokeRequest) => void): () => void;
    /** 回填执行结果。失败以 `ok: false` 表达，而不是异常。 */
    respond(response: CapabilityInvokeResponse): Promise<void>;
    /** 把能力清单推给主进程，供 MCP 的 tools/list 使用。 */
    publishManifest(payload: CapabilityManifestPayload): Promise<void>;
}

/**
 * MCP 对外开关与审计。
 *
 * 只暴露开关与只读状态（含审计）；**凭据不出主进程**，因此这里没有 token 字段。
 */
export interface McpApi {
    readState(): Promise<McpState>;
    writeSettings(settings: McpSettings): Promise<McpState>;
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
    capabilities: CapabilityHostApi;
    mcp: McpApi;
    importExport: ImportExportApi;
    window: WindowApi;
    app: AppLifecycleApi;
}
