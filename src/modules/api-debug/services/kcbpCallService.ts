import type { ParamItem, ResponseData, TabData, EditorMode } from '../types/workspace';
import type { KcbpRequestOptions, KcbpResponseData } from '../../../types/kcbp';
import type { DbScriptQueryRequest, DbScriptQueryResponse } from '@/shared/suggest/types';
import { getElectronAPI, requireElectronAPI } from '../../../lib/electron';
import {
    parseKcbpAddress,
    serializeKcbpAddress,
    splitHost,
    type KcbpAddressParts,
} from '../utils/kcbp/kcbpAddress';
import { extractMissingParamFromKcbpResponse, mergeParamIntoList } from '../utils/kcbp/kcbpParams';
import { buildKcbpFields } from '../utils/kcbp/kcbpFields';
import { parseKcbpResponseStatus } from '../utils/kcbp/kcbpResponse';
import { resolveMsgtypeFromParams } from '../utils/workspace/caseLabel';
import {
    executeCaseScript,
    fieldsToParams,
    formatScriptOutput,
    normalizeRequestScriptResult,
    paramsToCaseScript,
    resolveCaseScript,
} from '../utils/script/apiScript';
import { createScriptConsole } from '../utils/script/scriptConsole';
import {
    createScriptTest,
    isScriptTestResult,
    ScriptTestFailure,
} from '../utils/script/scriptTest';
import type { ScriptConsoleSnapshot } from '../types/scriptConsole';
import type { ScriptTestResult } from '../types/scriptTest';
import type { TcdCallStep } from '@/shared/tcd/types';
import { normalizeRunInput } from '@/shared/tcd/runInputJson';
import { FlowRuntime, createNoopFlowApi } from '@/shared/tcd/flow';
import { cloneCaseTab, resolveCaseRef, type TcdCaseIndex } from '@/shared/tcd/resolveCase';
import type { TcdCaseTab } from '@/shared/tcd/types';
import type { TestRunContext } from '@/shared/test/types';
import { paramsToVariableMap } from '@/shared/test/variables/resolveScope';
import { createVarsApi, createNoopVarsApi } from '@/shared/test/variables/createVarsApi';
import { mergeLibApi } from '@/shared/test/lib/loadCustomLib';
import { createAssertApi, createNoopAssertApi } from '@/shared/test/assert/createAssertApi';
import { applyKcxpEnvironmentToAddress } from '../utils/workspace/kcxpEnvironment';
import type { KcxpEnvironment } from '../types/kcxp';

export type KcbpInvokeMode = EditorMode | 'tcd';

export const KCBP_MSGTYPE_REQUIRED_MESSAGE = '请先填写 Msgtype 后再调用';

export function canInvokeKcbp(): boolean {
    return Boolean(getElectronAPI()?.kcbp.call);
}

export function cancelKcbpCall(): void {
    void getElectronAPI()?.kcbp.cancel?.();
}

export function toGridRows(data: unknown[]): Record<string, unknown>[] {
    return data.map((item) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
            return item as Record<string, unknown>;
        }
        return { value: item };
    });
}

export { buildEnabledParamFields, buildKcbpFields } from '../utils/kcbp/kcbpFields';

export function buildKcbpRequest(
    addressParts: KcbpAddressParts,
    msgtype: string,
    fields: Record<string, string>,
    binaryFields: Record<string, string> = {},
): KcbpRequestOptions {
    const { ip, port } = splitHost(addressParts.host);

    return {
        connection: {
            ip: ip || undefined,
            port: port || undefined,
            apiid: msgtype,
            reqqueue: addressParts.queue.trim() || undefined,
            requesttimeout: addressParts.timeout.trim() || undefined,
            service: 'kcbp',
        },
        param: {
            msgtype,
            fields,
            binaryFields: Object.keys(binaryFields).length > 0 ? binaryFields : undefined,
        },
    };
}

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
    /** TCD：运行时 KCXP overlay 后的地址（不写回 project.json） */
    effectiveAddress?: string;
    testRunContext?: TestRunContext;
    customLib?: Record<string, unknown>;
    kcxpEnvironment?: KcxpEnvironment;
}

export interface KcbpCallOutcome {
    response: ResponseData;
    nextParams: ParamItem[];
    nextScript?: string;
    scriptError?: string;
    scriptResult?: unknown;
    scriptTest?: ScriptTestResult;
    scriptConsole?: ScriptConsoleSnapshot;
    status: ReturnType<typeof parseKcbpResponseStatus>;
    missingParam: { name: string; value: string } | null;
    msgtype: string;
    /** TCD：本次 Run 内每次 call 的步骤记录 */
    callSteps?: TcdCallStep[];
}

export function buildKcbpCallOutcome(
    tab: Pick<TabData, 'params'>,
    address: string,
    fallbackName: string,
    raw: KcbpResponseData,
): KcbpCallOutcome {
    const msgtype = parseKcbpAddress(address).msgtype.trim() || fallbackName;
    const gridData = toGridRows(raw.data);
    const response: ResponseData = {
        code: raw.code,
        message: raw.msg,
        data: gridData,
        stats: raw.stats,
        calledAt: Date.now(),
    };

    const missingParam = extractMissingParamFromKcbpResponse(raw.code, raw.msg, raw.data);
    const nextParams = missingParam
        ? mergeParamIntoList(tab.params, missingParam.name, missingParam.value)
        : tab.params;

    return {
        response,
        nextParams,
        status: parseKcbpResponseStatus(response),
        missingParam,
        msgtype,
    };
}

export function getKcbpCallFeedback(outcome: KcbpCallOutcome): {
    level: 'error' | 'info' | 'warning' | 'success';
    message: string;
} {
    const { response, status, missingParam, msgtype, scriptTest, scriptError } = outcome;

    if (scriptTest && !scriptTest.passed) {
        return { level: 'error', message: `\u6d4b\u8bd5\u5931\u8d25\uff1a${scriptTest.message}` };
    }
    if (scriptError && !scriptTest) {
        return { level: 'error', message: scriptError };
    }

    if (String(response.code) === '-1') {
        return { level: 'error', message: response.message || 'KCBP \u8c03\u7528\u5931\u8d25' };
    }
    if (missingParam) {
        return {
            level: 'info',
            message: `\u5df2\u81ea\u52a8\u6dfb\u52a0\u5165\u53c2 ${missingParam.name}\uff0c\u8bf7\u586b\u5199\u540e\u91cd\u65b0\u53d1\u9001`,
        };
    }
    if (status.kind === 'error') {
        return {
            level: 'error',
            message: status.businessMsg || '\u4e1a\u52a1\u8c03\u7528\u5931\u8d25',
        };
    }
    if (status.kind === 'warning') {
        return { level: 'warning', message: status.businessMsg || '\u4e1a\u52a1\u8b66\u544a' };
    }
    if (scriptTest?.passed) {
        const rows = response.stats?.rows ?? 0;
        return {
            level: 'success',
            message: `\u6d4b\u8bd5\u901a\u8fc7\uff1a${scriptTest.message}\uff08${msgtype} \u8fd4\u56de ${rows} \u884c\uff09`,
        };
    }

    const rows = response.stats?.rows ?? 0;
    return {
        level: 'success',
        message: `${msgtype}\u8c03\u7528\u5b8c\u6210\uff0c\u8fd4\u56de ${rows} \u884c`,
    };
}

async function invokeKcbpWithFields(
    tab: Pick<TabData, 'address' | 'name' | 'params'>,
    msgtype: string,
    fields: Record<string, string>,
    binaryFields: Record<string, string>,
    baseParams: ParamItem[],
    electronDeps?: TcdElectronDeps,
    addressOverride?: string,
): Promise<KcbpCallOutcome> {
    const callAddress = addressOverride ?? tab.address;
    const addressParts = parseKcbpAddress(callAddress);
    const payload = buildKcbpRequest(addressParts, msgtype, fields, binaryFields);
    const callKcbp = electronDeps?.callKcbp ?? requireElectronAPI().kcbp.call;
    const raw = await callKcbp(payload);
    return buildKcbpCallOutcome({ params: baseParams }, callAddress, tab.name, raw);
}

export async function invokeKcbpCall(
    tab: Pick<
        TabData,
        'address' | 'name' | 'params' | 'script' | 'requestScript' | 'responseScript' | 'runInput'
    >,
    editorMode: KcbpInvokeMode = 'script',
    options: InvokeKcbpCallOptions = {},
): Promise<KcbpCallOutcome> {
    const electronDeps = options.electronDeps;
    let effectiveAddress =
        options.effectiveAddress ??
        (options.kcxpEnvironment
            ? applyKcxpEnvironmentToAddress(tab.address, options.kcxpEnvironment)
            : tab.address);
    const addressParts = parseKcbpAddress(effectiveAddress);
    const msgtype = addressParts.msgtype.trim() || resolveMsgtypeFromParams(tab.params);
    if (!msgtype) {
        throw new Error(KCBP_MSGTYPE_REQUIRED_MESSAGE);
    }
    if (!addressParts.msgtype.trim()) {
        effectiveAddress = serializeKcbpAddress({ ...addressParts, msgtype });
    }

    if (editorMode === 'ui') {
        const { fields, binaryFields } = buildKcbpFields(tab.params);
        const outcome = await invokeKcbpWithFields(
            tab,
            msgtype,
            fields,
            binaryFields,
            tab.params,
            electronDeps,
            effectiveAddress,
        );
        return {
            ...outcome,
            nextScript: outcome.missingParam
                ? paramsToCaseScript(outcome.nextParams, outcome.msgtype)
                : undefined,
        };
    }

    const script = options.resolveScript?.(tab, msgtype) ?? resolveCaseScript(tab, msgtype);
    const fallbackPayload = buildKcbpFields(tab.params);
    const runInput =
        editorMode === 'tcd'
            ? normalizeRunInput(options.runInput ?? tab.runInput)
            : normalizeRunInput({});

    const flowRuntime = editorMode === 'tcd' ? (options.flow ?? new FlowRuntime()) : null;
    const caseIndex = options.caseIndex ?? { byId: new Map(), byMsgtype: new Map() };

    let lastOutcome: KcbpCallOutcome | null = null;
    let activeParams = tab.params;
    const callSteps: TcdCallStep[] = [];
    let callCounter = 0;

    const consoleCapture = createScriptConsole();
    const test = createScriptTest(consoleCapture);

    const isTcd = editorMode === 'tcd';
    const caseVarMap = isTcd ? paramsToVariableMap(tab.params) : {};
    const mergedContext: TestRunContext = {
        ...options.testRunContext,
        caseVariables: {
            ...(options.testRunContext?.caseVariables ?? {}),
            ...caseVarMap,
        },
    };
    const varLayers = isTcd
        ? [
              mergedContext.globalVariables ?? {},
              mergedContext.environmentVariables ?? {},
              mergedContext.suiteVariables ?? {},
              mergedContext.caseVariables ?? {},
          ]
        : [];
    const varsApi = isTcd ? createVarsApi(varLayers) : createNoopVarsApi();
    const libApi = isTcd ? mergeLibApi(options.customLib ?? {}) : mergeLibApi({});

    const call = async (input: Record<string, string | { file: string }>) => {
        const normalized = normalizeRequestScriptResult(input);
        if (isTcd) {
            for (const [key, value] of Object.entries(normalized.fields)) {
                if (typeof value === 'string' && value.includes('${')) {
                    normalized.fields[key] = varsApi.interpolate(value);
                }
            }
        }
        activeParams =
            normalized.params.length > 0
                ? normalized.params
                : fieldsToParams(normalized.fields, normalized.binaryFields);
        const callMsgtype =
            normalized.fields.g_funcid?.trim() || normalized.fields.g_funcid_src?.trim() || msgtype;
        const startedAt = Date.now();
        lastOutcome = await invokeKcbpWithFields(
            tab,
            callMsgtype,
            normalized.fields,
            normalized.binaryFields,
            activeParams,
            electronDeps,
            effectiveAddress,
        );
        callCounter += 1;
        const step: TcdCallStep = {
            index: callCounter,
            msgtype: callMsgtype,
            fields: { ...normalized.fields },
            response: lastOutcome.response,
            durationMs: Date.now() - startedAt,
        };
        callSteps.push(step);
        if (editorMode === 'tcd') {
            const rows = lastOutcome.response.stats?.rows ?? lastOutcome.response.data.length;
            consoleCapture.append(
                'log',
                `[call #${step.index}] ${step.msgtype} → code=${lastOutcome.response.code} rows=${rows} ${step.durationMs}ms`,
            );
        }
        return lastOutcome.response;
    };

    const ctx = {
        msgtype,
        address: effectiveAddress,
        params: tab.params,
        fields: fallbackPayload.fields,
        input: runInput,
        call,
    };

    const query = async (sql: string, params?: Record<string, string | number>) => {
        const queryScriptSql =
            electronDeps?.queryScriptSql ?? requireElectronAPI().database.queryScript;
        const result = await queryScriptSql({ sql, params });
        if (result.error) {
            throw new Error(result.error);
        }
        return result.rows;
    };

    const assertApi = isTcd ? createAssertApi(test, query) : createNoopAssertApi();

    const flowApi =
        editorMode === 'tcd' && flowRuntime
            ? {
                  set: (key: string, value: unknown) => {
                      flowRuntime.set(key, value);
                  },
                  get: (key: string) => flowRuntime.get(key),
                  runCase: async (ref: string, input?: Record<string, unknown>) => {
                      flowRuntime.enterRunCase();
                      try {
                          const resolved = resolveCaseRef(ref, caseIndex);
                          const nestedTab = cloneCaseTab(resolved as TcdCaseTab) as Pick<
                              TabData,
                              | 'address'
                              | 'name'
                              | 'params'
                              | 'script'
                              | 'requestScript'
                              | 'responseScript'
                              | 'runInput'
                          >;
                          const nestedInput = input
                              ? { ...normalizeRunInput(nestedTab.runInput), ...input }
                              : normalizeRunInput(nestedTab.runInput);
                          const nestedOutcome = await invokeKcbpCall(nestedTab, 'tcd', {
                              runInput: nestedInput,
                              flow: flowRuntime,
                              caseIndex,
                              electronDeps,
                              resolveScript: options.resolveScript,
                              effectiveAddress: options.kcxpEnvironment
                                  ? applyKcxpEnvironmentToAddress(
                                        nestedTab.address,
                                        options.kcxpEnvironment,
                                    )
                                  : effectiveAddress,
                              testRunContext: mergedContext,
                              customLib: options.customLib,
                              kcxpEnvironment: options.kcxpEnvironment,
                          });
                          if (!lastOutcome) {
                              lastOutcome = nestedOutcome;
                          }
                          return nestedOutcome.response;
                      } finally {
                          flowRuntime.leaveRunCase();
                      }
                  },
              }
            : createNoopFlowApi();

    const attachCallSteps = (outcome: KcbpCallOutcome): KcbpCallOutcome => ({
        ...outcome,
        callSteps: callSteps.length > 0 ? callSteps : undefined,
    });

    try {
        const scriptResult = await executeCaseScript(
            script,
            ctx,
            consoleCapture.api,
            query,
            test,
            flowApi,
            varsApi,
            libApi,
            assertApi,
        );
        if (!lastOutcome && !isScriptTestResult(scriptResult)) {
            throw new Error(
                '\u811a\u672c\u672a\u8c03\u7528 call()\uff0c\u65e0\u6cd5\u53d1\u9001\u8bf7\u6c42',
            );
        }
        const outcome: KcbpCallOutcome =
            lastOutcome ??
            ({
                response: {
                    code: '-1',
                    message: '脚本未产生 KCBP 响应',
                    data: [],
                    calledAt: Date.now(),
                },
                nextParams: tab.params,
                status: {
                    kind: 'error',
                    businessCode: '-1',
                    businessMsg: '脚本未产生 KCBP 响应',
                    transportCode: '-1',
                    transportMsg: '脚本未产生 KCBP 响应',
                    hasBusinessRow: false,
                },
                missingParam: null,
                msgtype,
            } satisfies KcbpCallOutcome);

        if (isScriptTestResult(scriptResult)) {
            return attachCallSteps({
                ...outcome,
                scriptResult,
                scriptTest: scriptResult,
                scriptConsole: consoleCapture.snapshot(),
                nextScript: outcome.missingParam
                    ? paramsToCaseScript(outcome.nextParams, outcome.msgtype)
                    : undefined,
            });
        }

        if (scriptResult !== undefined) {
            consoleCapture.append('return', formatScriptOutput(scriptResult));
        }

        return attachCallSteps({
            ...outcome,
            scriptResult,
            scriptConsole: consoleCapture.snapshot(),
            nextScript: outcome.missingParam
                ? paramsToCaseScript(outcome.nextParams, outcome.msgtype)
                : undefined,
        });
    } catch (error) {
        if (error instanceof ScriptTestFailure) {
            if (lastOutcome) {
                const outcome: KcbpCallOutcome = lastOutcome;
                return attachCallSteps({
                    ...outcome,
                    scriptError: error.result.message,
                    scriptTest: error.result,
                    scriptConsole: consoleCapture.snapshot(),
                    nextScript: outcome.missingParam
                        ? paramsToCaseScript(outcome.nextParams, outcome.msgtype)
                        : undefined,
                });
            }

            const errorResponse: ResponseData = {
                code: '-1',
                message: error.result.message,
                data: [],
                calledAt: Date.now(),
            };
            return attachCallSteps({
                response: errorResponse,
                nextParams: tab.params,
                scriptError: error.result.message,
                scriptTest: error.result,
                scriptConsole: consoleCapture.snapshot(),
                status: parseKcbpResponseStatus(errorResponse),
                missingParam: null,
                msgtype,
            });
        }

        const scriptError = error instanceof Error ? error.message : String(error);
        consoleCapture.append('error', scriptError);
        if (lastOutcome) {
            const outcome: KcbpCallOutcome = lastOutcome;
            return attachCallSteps({
                ...outcome,
                scriptError,
                scriptConsole: consoleCapture.snapshot(),
                nextScript: outcome.missingParam
                    ? paramsToCaseScript(outcome.nextParams, outcome.msgtype)
                    : undefined,
            });
        }

        const outcome = await invokeKcbpWithFields(
            tab,
            msgtype,
            fallbackPayload.fields,
            fallbackPayload.binaryFields,
            tab.params,
            electronDeps,
        );
        return attachCallSteps({
            ...outcome,
            scriptError,
            scriptConsole: consoleCapture.snapshot(),
            nextScript: outcome.missingParam
                ? paramsToCaseScript(outcome.nextParams, outcome.msgtype)
                : undefined,
        });
    }
}
