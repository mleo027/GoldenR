import type { ParamItem, ResponseData, TabData, EditorMode } from '../../types/workspace';
import type { KcbpRequestOptions, KcbpResponseData } from '../../../../types/kcbp';
import type { DbScriptQueryRequest, DbScriptQueryResponse } from '@/shared/suggest/types';
import type { ScriptConsoleSnapshot } from '../../types/scriptConsole';
import type { ScriptTestResult } from '../../types/scriptTest';
import type { TestRunContext } from '@/shared/test/types';
import type { KcxpEnvironment } from '../../types/kcxp';
import type { DbConnectionConfig } from '@/shared/suggest/types';
import type { ParsedKcbpResponseStatus } from '../../utils/kcbp/kcbpResponse';

export type KcbpInvokeMode = EditorMode;

export const KCBP_MSGTYPE_REQUIRED_MESSAGE = '请先填写 Msgtype 后再调用';

export interface ApiDebugElectronDeps {
    callKcbp: (payload: KcbpRequestOptions) => Promise<KcbpResponseData>;
    queryScriptSql: (request: DbScriptQueryRequest) => Promise<DbScriptQueryResponse>;
}

export interface KcbpCallPort {
    call(payload: KcbpRequestOptions): Promise<KcbpResponseData>;
}

export interface KcbpControlPort {
    cancel(): Promise<boolean>;
}

export interface SqlQueryPort {
    queryScript(request: DbScriptQueryRequest): Promise<DbScriptQueryResponse>;
}

export interface ApiDebugExecutionPorts {
    call: KcbpCallPort['call'];
    queryScript: SqlQueryPort['queryScript'];
}

export interface InvokeKcbpCallOptions {
    runInput?: Record<string, unknown>;
    electronDeps?: ApiDebugElectronDeps;
    /** 可注入专用脚本解析，供导入的旧脚本兼容使用 */
    resolveScript?: (
        tab: Pick<
            TabData,
            'script' | 'requestScript' | 'responseScript' | 'params' | 'address' | 'name'
        >,
        msgtype: string,
    ) => string;
    /** 运行时 KCXP overlay 后的地址（不写回 cases 表） */
    effectiveAddress?: string;
    testRunContext?: TestRunContext;
    customLib?: Record<string, unknown>;
    kcxpEnvironment?: KcxpEnvironment;
    /** 执行时合并进发送字段的公共参数 */
    commonParams?: ParamItem[];
    trace?: { enabled: boolean; databaseConfig?: DbConnectionConfig };
}

export interface KcbpCallOutcome {
    response: ResponseData;
    nextParams: ParamItem[];
    nextScript?: string;
    scriptError?: string;
    scriptResult?: unknown;
    scriptTest?: ScriptTestResult;
    scriptConsole?: ScriptConsoleSnapshot;
    status: ParsedKcbpResponseStatus;
    missingParam: { name: string; value: string } | null;
    msgtype: string;
    /** 实际用于构建发送字段的参数列表（供历史记录，已合并公共参数） */
    effectiveParams?: ParamItem[];
}
