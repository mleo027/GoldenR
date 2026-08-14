import { amountDelta as calcAmountDelta } from '../lib/builtin';
import type { ResponseData } from '../response';
import type { CaseScriptQueryFn, ScriptTestApi } from '../types';

export interface AssertScriptApi {
    eq: (actual: unknown, expected: unknown, message: string) => void;
    ok: (response: ResponseData, message?: string) => void;
    sqlExists: (
        sql: string,
        params: Record<string, string | number> | undefined,
        message: string,
    ) => Promise<void>;
    amountDelta: (
        before: number | string,
        after: number | string,
        delta: number | string,
        message: string,
        precision?: number,
    ) => void;
    reconcile: (
        apiRow: Record<string, unknown>,
        sqlRow: Record<string, unknown>,
        fieldMap: Record<string, string>,
        message: string,
    ) => void;
}

export function createAssertApi(test: ScriptTestApi, queryFn: CaseScriptQueryFn): AssertScriptApi {
    return {
        eq(actual, expected, message) {
            test.expect(
                actual === expected,
                `${message} (expected=${String(expected)}, actual=${String(actual)})`,
            );
        },
        ok(response, message = '业务成功') {
            test.expect(String(response.code) === '0', `${message} code=${response.code}`);
        },
        async sqlExists(sql, params, message) {
            const rows = await queryFn(sql, params);
            test.expect(rows.length > 0, message);
        },
        amountDelta(before, after, delta, message, precision = 2) {
            test.expect(calcAmountDelta(before, after, delta, precision), message);
        },
        reconcile(apiRow, sqlRow, fieldMap, message) {
            for (const [apiField, sqlField] of Object.entries(fieldMap)) {
                const apiVal = String(apiRow[apiField] ?? '');
                const sqlVal = String(sqlRow[sqlField] ?? '');
                test.expect(
                    apiVal === sqlVal,
                    `${message}: ${apiField}=${apiVal} vs ${sqlField}=${sqlVal}`,
                );
            }
        },
    };
}

export function createNoopAssertApi(): AssertScriptApi {
    const fail = () => {
        throw new Error('assert 仅在 TCD 模式下可用');
    };
    return {
        eq: fail,
        ok: fail,
        sqlExists: async () => fail(),
        amountDelta: fail,
        reconcile: fail,
    };
}
