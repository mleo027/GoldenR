import type { ParamItem, ResponseData } from '../../types/workspace';
import type { CaseScriptQueryFn, ScriptTestApi } from '@/shared/test/types';
import type { ScriptConsoleApi } from './scriptConsole';
import type { VarsScriptApi } from '@/shared/test/variables/createVarsApi';
import type { AssertScriptApi } from '@/shared/test/assert/createAssertApi';
import { createNoopVarsApi } from '@/shared/test/variables/createVarsApi';
import { mergeLibApi } from '@/shared/test/lib/loadCustomLib';
import { createNoopAssertApi } from '@/shared/test/assert/createAssertApi';
import {
    buildKcbpFields,
    formatFileParamValue,
    formatParamScriptFieldValue,
    isFileCallFieldValue,
    parseFileParamPath,
} from '../kcbp/kcbpFields';

export type CallFieldValue = string | { file: string };
export type CaseCallFields = Record<string, CallFieldValue>;

export type CaseCallFn = (fields: CaseCallFields) => Promise<ResponseData>;

export interface FlowScriptApi {
    set(key: string, value: unknown): void;
    get(key: string): unknown;
    runCase(ref: string, input?: Record<string, unknown>): Promise<ResponseData>;
}

export interface CaseScriptContext {
    msgtype: string;
    address: string;
    params: ParamItem[];
    fields: Record<string, string>;
    /** TCD：本次 Run 传入的运行参数对象 */
    input: Record<string, unknown>;
    call: CaseCallFn;
}

export interface ScriptExecutionSuccess<T> {
    ok: true;
    value: T;
}

export interface ScriptExecutionError {
    ok: false;
    error: string;
}

export type ScriptExecutionResult<T> = ScriptExecutionSuccess<T> | ScriptExecutionError;

export interface RequestScriptResult {
    fields: Record<string, string>;
    binaryFields: Record<string, string>;
    params: ParamItem[];
}

export const CASE_SCRIPT_API_HINT = 'ctx · call() · query() · test · console';

export const DEFAULT_CASE_SCRIPT = `// 可用 API: ctx.msgtype / ctx.address / ctx.params / await call(fields)
async function main(ctx) {
  const response = await call({
    g_funcid: ctx.msgtype,
  });
  return response;
}`;

/** @deprecated 旧版请求脚本片段 */
export const DEFAULT_REQUEST_SCRIPT = `(ctx) => ({
  g_funcid: ctx.msgtype,
})`;

/** @deprecated 旧版响应脚本片段 */
export const DEFAULT_RESPONSE_SCRIPT = `(ctx) => ({
  code: ctx.response.code,
  message: ctx.response.message,
  rows: ctx.response.data,
  stats: ctx.response.stats,
})`;

export function createDefaultCaseScript(msgtype = ''): string {
    if (!msgtype) return DEFAULT_CASE_SCRIPT;
    return `// 可用 API: ctx.msgtype / ctx.address / ctx.params / await call(fields)
async function main(ctx) {
  const response = await call({
    g_funcid: ${JSON.stringify(msgtype)},
  });
  return response;
}`;
}

export function paramsToCaseScript(params: ParamItem[], msgtype = ''): string {
    const entries = params.filter((item) => item.name.trim() && item.type !== 'disabled');
    if (entries.length === 0) {
        return createDefaultCaseScript(msgtype);
    }

    const fieldLines = entries.map(
        (item) => `    ${JSON.stringify(item.name)}: ${formatParamScriptFieldValue(item)},`,
    );

    return `// 可用 API: ctx.msgtype / ctx.address / ctx.params / await call(fields)
async function main(ctx) {
  const response = await call({
${fieldLines.join('\n')}
  });
  return response;
}`;
}

/** UI 模式「生成测试脚本」：入参表 + 默认 test 断言模板 */
export function generateTestScriptFromParams(params: ParamItem[], msgtype = ''): string {
    const entries = params.filter((item) => item.name.trim() && item.type !== 'disabled');
    const fieldLines =
        entries.length > 0
            ? entries.map(
                  (item) =>
                      `    ${JSON.stringify(item.name)}: ${formatParamScriptFieldValue(item)},`,
              )
            : [
                  msgtype
                      ? `    g_funcid: ${JSON.stringify(msgtype)},`
                      : `    g_funcid: ctx.msgtype,`,
              ];

    return `// 由 UI 模式「生成测试脚本」自动生成
async function main(ctx) {
  const response = await call({
${fieldLines.join('\n')}
  });

  test.expect(String(response.code) === '0', '业务成功');
  return test.pass('接口调用验证通过');
}`;
}

/** @deprecated use paramsToCaseScript */
export const paramsToRequestScript = paramsToCaseScript;

/** @deprecated use createDefaultCaseScript */
export const createDefaultRequestScript = createDefaultCaseScript;

function migrateLegacyRequestScript(requestScript: string): string {
    const trimmed = requestScript.trim();
    if (!trimmed) return DEFAULT_CASE_SCRIPT;
    if (trimmed.includes('async function main')) return trimmed;

    return `// 可用 API: ctx.msgtype / ctx.address / ctx.params / await call(fields)
async function main(ctx) {
  const fields = (${trimmed})(ctx);
  return await call(fields);
}`;
}

export function resolveCaseScript(
    tab: {
        script?: string;
        requestScript?: string;
        responseScript?: string;
        params: ParamItem[];
        address: string;
        name: string;
    },
    msgtype: string,
): string {
    if (tab.script?.trim()) return tab.script;
    if (tab.requestScript?.trim()) return migrateLegacyRequestScript(tab.requestScript);
    return paramsToCaseScript(tab.params, msgtype);
}

/** @deprecated use resolveCaseScript */
export function resolveRequestScript(
    tab: Parameters<typeof resolveCaseScript>[0],
    msgtype: string,
): string {
    return resolveCaseScript(tab, msgtype);
}

/** @deprecated */
export function resolveResponseScript(tab: { responseScript?: string }): string {
    return tab.responseScript?.trim() ? tab.responseScript : DEFAULT_RESPONSE_SCRIPT;
}

export function invokeUserScript(script: string, ctx: unknown): unknown {
    const trimmed = script.trim();
    if (!trimmed) return {};

    const runner = new Function(
        'ctx',
        `"use strict";
const __value = (${trimmed});
return typeof __value === "function" ? __value(ctx) : __value;`,
    ) as (ctx: unknown) => unknown;

    return runner(ctx);
}

export async function executeCaseScript(
    script: string,
    ctx: CaseScriptContext,
    consoleApi: ScriptConsoleApi,
    queryFn: CaseScriptQueryFn,
    testApi: ScriptTestApi,
    flowApi: FlowScriptApi,
    varsApi: VarsScriptApi = createNoopVarsApi(),
    libApi: ReturnType<typeof mergeLibApi> = mergeLibApi({}),
    assertApi: AssertScriptApi = createNoopAssertApi(),
): Promise<unknown> {
    const trimmed = script.trim();
    if (!trimmed) {
        throw new Error('脚本为空');
    }

    const runner = new Function(
        'ctx',
        'call',
        'console',
        'query',
        'test',
        'flow',
        'vars',
        'lib',
        'assert',
        `"use strict";
${trimmed}
if (typeof main !== "function") {
  throw new Error("请定义 async function main(ctx)");
}
return main(ctx);`,
    ) as (
        context: CaseScriptContext,
        callFn: CaseCallFn,
        consoleObj: ScriptConsoleApi,
        query: CaseScriptQueryFn,
        test: ScriptTestApi,
        flow: FlowScriptApi,
        vars: VarsScriptApi,
        lib: ReturnType<typeof mergeLibApi>,
        assert: AssertScriptApi,
    ) => Promise<unknown>;

    return runner(ctx, ctx.call, consoleApi, queryFn, testApi, flowApi, varsApi, libApi, assertApi);
}

export function normalizeRequestScriptResult(value: unknown): RequestScriptResult {
    if (Array.isArray(value)) {
        const params: ParamItem[] = [];
        for (const item of value) {
            if (!item || typeof item !== 'object') continue;
            const row = item as {
                name?: unknown;
                value?: unknown;
                enabled?: unknown;
                type?: unknown;
            };
            const name = String(row.name ?? '').trim();
            if (!name) continue;
            const enabled = row.enabled !== false && row.type !== 'disabled';
            const type =
                row.type === 'file'
                    ? 'file'
                    : enabled
                      ? ('string' as const)
                      : ('disabled' as const);
            params.push({
                name,
                value: row.value == null ? '' : String(row.value),
                type,
            });
        }
        const { fields, binaryFields } = splitParamsToKcbpFields(params);
        return {
            params,
            fields,
            binaryFields,
        };
    }

    if (value && typeof value === 'object') {
        const fields: Record<string, string> = {};
        const binaryFields: Record<string, string> = {};
        for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
            const name = key.trim();
            if (!name) continue;
            if (isFileCallFieldValue(rawValue)) {
                binaryFields[name] = rawValue.file;
                continue;
            }
            const text = rawValue == null ? '' : String(rawValue);
            const filePath = parseFileParamPath(text);
            if (filePath) {
                binaryFields[name] = filePath;
                continue;
            }
            fields[name] = text;
        }
        return {
            fields,
            binaryFields,
            params: mergeKcbpFieldsToParams(fields, binaryFields),
        };
    }

    return { fields: {}, binaryFields: {}, params: [] };
}

function splitParamsToKcbpFields(params: ParamItem[]): {
    fields: Record<string, string>;
    binaryFields: Record<string, string>;
} {
    return buildKcbpFields(params);
}

function mergeKcbpFieldsToParams(
    fields: Record<string, string>,
    binaryFields: Record<string, string>,
): ParamItem[] {
    return [
        ...Object.entries(fields).map(([name, value]) => ({
            name,
            value,
            type: 'string' as const,
        })),
        ...Object.entries(binaryFields).map(([name, value]) => ({
            name,
            value: formatFileParamValue(value),
            type: 'string' as const,
        })),
    ];
}

export function executeRequestScript(
    script: string,
    ctx: Omit<CaseScriptContext, 'call'>,
): ScriptExecutionResult<RequestScriptResult> {
    try {
        const value = invokeUserScript(script, ctx);
        return {
            ok: true,
            value: normalizeRequestScriptResult(value),
        };
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/** @deprecated */
export function executeResponseScript(
    script: string,
    ctx: {
        msgtype: string;
        address: string;
        request: Record<string, string>;
        response: ResponseData;
    },
): ScriptExecutionResult<unknown> {
    try {
        return {
            ok: true,
            value: invokeUserScript(script, ctx),
        };
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

export function formatScriptOutput(value: unknown): string {
    if (value === undefined) return '';
    if (typeof value === 'string') return value;
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

export function countScriptOutputRows(value: unknown): number {
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === 'object') {
        const rows =
            (value as { rows?: unknown; data?: unknown }).rows ??
            (value as { data?: unknown }).data;
        if (Array.isArray(rows)) return rows.length;
    }
    return 0;
}

export function fieldsToParams(
    fields: Record<string, string>,
    binaryFields: Record<string, string> = {},
): ParamItem[] {
    return mergeKcbpFieldsToParams(fields, binaryFields);
}
