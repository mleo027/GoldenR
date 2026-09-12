import type { ParamItem, ResponseData, TabData, EditorMode } from '../../types/workspace';
import type { KcbpRequestOptions, KcbpResponseData } from '../../../../types/kcbp';
import type { DbScriptQueryRequest, DbScriptQueryResponse } from '@/shared/suggest/types';
import type { ScriptConsoleSnapshot } from '../../types/scriptConsole';
import type { ScriptTestResult } from '../../types/scriptTest';
import type { TcdCallStep } from '@/shared/tcd/types';
import type { FlowRuntime } from '@/shared/tcd/flow';
import type { TcdCaseIndex } from '@/shared/tcd/resolveCase';
import type { TestRunContext } from '@/shared/test/types';
import type { KcxpEnvironment } from '../../types/kcxp';
import type { DbConnectionConfig } from '@/shared/suggest/types';
import type { ParsedKcbpResponseStatus } from '../../utils/kcbp/kcbpResponse';

export type KcbpInvokeMode = EditorMode | 'tcd';

export const KCBP_MSGTYPE_REQUIRED_MESSAGE = '请先填写 Msgtype 后再调用';

export interface TcdElectronDeps {
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

export type RunNestedKcbpCase = (
    tab: Pick<
        TabData,
        | 'address'
        | 'name'
        | 'params'
        | 'protocol'
        | 'script'
        | 'requestScript'
        | 'responseScript'
        | 'runInput'
    >,
    options: InvokeKcbpCallOptions,
) => Promise<KcbpCallOutcome>;

export interface InvokeKcbpCallOptions {
    runInput?: Record<string, unknown>;
    flow?: FlowRuntime;
    caseIndex?: TcdCaseIndex;
    electronDeps?: TcdElectronDeps;
    /** TCD 等模式可注入专用脚本解析（避免 api-debug 默认模板） */
    resolveScript?: (
        tab: Pick<
            TabData,
            'script' | 'requestScript' | 'responseScript' | 'params' | 'address' | 'name'
        >,
        msgtype: string,
    ) => string;
    /** TCD：运行时 KCXP overlay 后的地址（不写回 cases 表） */
    effectiveAddress?: string;
    testRunContext?: TestRunContext;
    customLib?: Record<string, unknown>;
    kcxpEnvironment?: KcxpEnvironment;
    /** 内部注入：TCD flow.runCase 复用同一套 ports 和配置 */
    runNestedCase?: RunNestedKcbpCase;
    /** 执行时合并进发送字段的公共参数（UI/TCD 模式生效） */
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
    /** TCD：本次 Run 内每次 call 的步骤记录 */
    callSteps?: TcdCallStep[];
    /** 实际用于构建发送字段的参数列表（供历史记录，已合并公共参数） */
    effectiveParams?: ParamItem[];
}
