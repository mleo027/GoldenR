import type { ParamItem, ResponseData, TabData } from '../../types/workspace';
import type { DbScriptQueryResponse } from '@/shared/suggest/types';
import { requireElectronAPI } from '../../../../lib/electron';
import {
    executeCaseScript,
    fieldsToParams,
    formatScriptOutput,
    normalizeRequestScriptResult,
    paramsToCaseScript,
    resolveCaseScript,
} from '../../utils/script/apiScript';
import { buildKcbpFields } from '../../utils/kcbp/kcbpFields';
import { createScriptConsole } from '../../utils/script/scriptConsole';
import {
    createScriptTest,
    isScriptTestResult,
    ScriptTestFailure,
} from '../../utils/script/scriptTest';
import { normalizeRunInput } from '@/shared/tcd/runInputJson';
import { FlowRuntime, createNoopFlowApi } from '@/shared/tcd/flow';
import { cloneCaseTab, resolveCaseRef } from '@/shared/tcd/resolveCase';
import type { TcdCaseTab } from '@/shared/tcd/types';
import { paramsToVariableMap } from '@/shared/test/variables/resolveScope';
import { createVarsApi, createNoopVarsApi } from '@/shared/test/variables/createVarsApi';
import { mergeLibApi } from '@/shared/test/lib/loadCustomLib';
import { createAssertApi, createNoopAssertApi } from '@/shared/test/assert/createAssertApi';
import { applyKcxpEnvironmentToAddress } from '../../utils/workspace/kcxpEnvironment';
import { parseKcbpResponseStatus } from '../../utils/kcbp/kcbpResponse';
import { invokeKcbpWithFields } from './singleCall';
import type {
    InvokeKcbpCallOptions,
    KcbpCallOutcome,
    KcbpInvokeMode,
    TcdElectronDeps,
} from './types';

export async function runScriptOrTcdCase(
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
    editorMode: KcbpInvokeMode,
    msgtype: string,
    effectiveAddress: string,
    options: InvokeKcbpCallOptions,
): Promise<KcbpCallOutcome> {
    const electronDeps: TcdElectronDeps | undefined = options.electronDeps;
    const script = options.resolveScript?.(tab, msgtype) ?? resolveCaseScript(tab, msgtype);
    const fallbackPayload = buildKcbpFields(tab.params);
    const runInput =
        editorMode === 'tcd'
            ? normalizeRunInput(options.runInput ?? tab.runInput)
            : normalizeRunInput({});

    const flowRuntime = editorMode === 'tcd' ? (options.flow ?? new FlowRuntime()) : null;
    const caseIndex = options.caseIndex ?? { byId: new Map(), byMsgtype: new Map() };

    let lastOutcome: KcbpCallOutcome | null = null;
    let activeParams: ParamItem[] = tab.params;
    const callSteps: KcbpCallOutcome['callSteps'] = [];
    let callCounter = 0;

    const consoleCapture = createScriptConsole();
    const test = createScriptTest(consoleCapture);

    const isTcd = editorMode === 'tcd';
    const caseVarMap = isTcd ? paramsToVariableMap(tab.params) : {};
    const mergedContext = {
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
        lastOutcome = await invokeKcbpWithFields({
            tab,
            msgtype: callMsgtype,
            fields: normalized.fields,
            binaryFields: normalized.binaryFields,
            baseParams: activeParams,
            electronDeps,
            addressOverride: effectiveAddress,
        });
        callCounter += 1;
        const step = {
            index: callCounter,
            msgtype: callMsgtype,
            fields: { ...normalized.fields },
            response: lastOutcome.response,
            durationMs: Date.now() - startedAt,
        };
        callSteps.push(step);
        if (editorMode === 'tcd') {
            const rows = lastOutcome.response.stats?.rows ?? lastOutcome.response.resultSets.reduce((t, s) => t + s.rows.length, 0);
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
        const result: DbScriptQueryResponse = await queryScriptSql({ sql, params });
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
                          // TCD 用例模型无 protocol 字段：缺省 'KCBP'，保留未来扩展口
                          const nestedSource = resolved as TcdCaseTab & { protocol?: string };
                          const nestedTab: Pick<
                              TabData,
                              | 'address'
                              | 'name'
                              | 'params'
                              | 'protocol'
                              | 'script'
                              | 'requestScript'
                              | 'responseScript'
                              | 'runInput'
                          > = {
                              ...cloneCaseTab(nestedSource),
                              protocol: nestedSource.protocol ?? 'KCBP',
                          };
                          const nestedInput = input
                              ? { ...normalizeRunInput(nestedTab.runInput), ...input }
                              : normalizeRunInput(nestedTab.runInput);
                          const nestedOutcome = await options.runNestedCase?.(nestedTab, {
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
                          if (!nestedOutcome) {
                              throw new Error('runNestedCase is required for TCD flow.runCase');
                          }
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
        const scriptResult = await executeCaseScript({
            script,
            ctx,
            consoleApi: consoleCapture.api,
            queryFn: query,
            testApi: test,
            flowApi,
            varsApi,
            libApi,
            assertApi,
        });
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
                    resultSets: [],
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
                resultSets: [],
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

        const outcome = await invokeKcbpWithFields({
            tab,
            msgtype,
            fields: fallbackPayload.fields,
            binaryFields: fallbackPayload.binaryFields,
            baseParams: tab.params,
            electronDeps,
            addressOverride: effectiveAddress,
        });
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
