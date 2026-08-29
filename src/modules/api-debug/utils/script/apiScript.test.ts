import { describe, expect, it } from 'vitest';
import {
    createDefaultCaseScript,
    executeCaseScript,
    executeRequestScript,
    generateTestScriptFromParams,
    normalizeRequestScriptResult,
    paramsToCaseScript,
    resolveCaseScript,
    type CaseCallFields,
} from './apiScript';
import type { ParamItem, ResponseData } from '../../types/workspace';
import { createScriptConsole } from './scriptConsole';
import { createScriptTest } from './scriptTest';
import { createNoopFlowApi } from '@/shared/tcd/flow';

const baseCtx = {
    msgtype: '150501',
    address: '127.0.0.1:21000/150501',
    params: [] as ParamItem[],
    fields: {},
    input: {} as Record<string, unknown>,
};

describe('paramsToCaseScript', () => {
    it('generates main with call()', () => {
        const script = paramsToCaseScript(
            [{ name: 'g_serverid', value: '1', type: 'string' }],
            '150501',
        );
        expect(script).toContain('async function main');
        expect(script).toContain('await call');
    });

    it('reflects current param values in call fields', () => {
        const script = paramsToCaseScript(
            [
                { name: 'digestid', value: '', type: 'string' },
                { name: 'interestflag', value: '1', type: 'string' },
            ],
            '150501',
        );
        expect(script).toContain('"interestflag": "1"');
        expect(script).toContain('"digestid": ""');
    });
});

describe('generateTestScriptFromParams', () => {
    it('generates call fields with test assertions', () => {
        const script = generateTestScriptFromParams(
            [
                { name: 'market', value: '1', type: 'string' },
                { name: 'stkcode', value: '6004', type: 'string' },
            ],
            '150501',
        );
        expect(script).toContain('"market": "1"');
        expect(script).toContain('"stkcode": "6004"');
        expect(script).toContain("test.expect(String(response.code) === '0', '业务成功')");
        expect(script).toContain('return test.pass');
    });

    it('falls back to msgtype literal when params empty', () => {
        const script = generateTestScriptFromParams([], '150501');
        expect(script).toContain('g_funcid: "150501"');
    });

    it('generates @file: syntax for file params', () => {
        const script = generateTestScriptFromParams(
            [{ name: 'databody', value: '@file:D:/data/1.zip', type: 'string' }],
            '856065',
        );
        expect(script).toContain('"databody": "@file:D:/data/1.zip"');
    });
});

describe('executeCaseScript', () => {
    it('runs main and uses injected call()', async () => {
        const calls: CaseCallFields[] = [];
        const response: ResponseData = {
            code: '0',
            message: 'ok',
            resultSets: [{ name: '', rows: [{ a: 1 }] }],
        };

        const consoleCapture = createScriptConsole();
        const test = createScriptTest(consoleCapture);
        const query = async () => {
            throw new Error('query() 仅在 Electron 环境可用');
        };
        const result = await executeCaseScript({
            script: `async function main(ctx) {
  console.log('before call');
  return await call({ g_serverid: '1', g_funcid: ctx.msgtype });
}`,
            ctx: {
                ...baseCtx,
                call: async (fields) => {
                    calls.push(fields);
                    return response;
                },
            },
            consoleApi: consoleCapture.api,
            queryFn: query,
            testApi: test,
            flowApi: createNoopFlowApi(),
        });

        expect(calls).toEqual([{ g_serverid: '1', g_funcid: '150501' }]);
        expect(result).toEqual(response);
        expect(consoleCapture.snapshot().entries).toEqual([
            expect.objectContaining({ level: 'log', message: 'before call' }),
        ]);
    });
});

describe('resolveCaseScript', () => {
    it('migrates legacy request script', () => {
        const script = resolveCaseScript(
            {
                requestScript: `(ctx) => ({ g_funcid: ctx.msgtype })`,
                params: [],
                address: '',
                name: 'test',
            },
            '150501',
        );
        expect(script).toContain('async function main');
        expect(script).toContain('await call');
    });

    it('prefers explicit script field', () => {
        expect(
            resolveCaseScript(
                {
                    script: createDefaultCaseScript('999'),
                    params: [],
                    address: '',
                    name: 'test',
                },
                '150501',
            ),
        ).toContain('999');
    });
});

describe('normalizeRequestScriptResult', () => {
    it('extracts binaryFields from @file: string values', () => {
        const result = normalizeRequestScriptResult({
            g_funcid: '856065',
            databody: '@file:D:/data/1.zip',
            datasize: '226',
        });

        expect(result.fields).toEqual({
            g_funcid: '856065',
            datasize: '226',
        });
        expect(result.binaryFields).toEqual({
            databody: 'D:/data/1.zip',
        });
    });

    it('extracts binaryFields from object file values', () => {
        const result = normalizeRequestScriptResult({
            g_funcid: '856065',
            databody: { file: 'D:/data/1.zip' },
        });

        expect(result.fields).toEqual({ g_funcid: '856065' });
        expect(result.binaryFields).toEqual({ databody: 'D:/data/1.zip' });
        expect(result.params).toEqual([
            { name: 'g_funcid', value: '856065', type: 'string' },
            { name: 'databody', value: '@file:D:/data/1.zip', type: 'string' },
        ]);
    });

    it('normalizes array rows into params, fields and binary fields', () => {
        const result = normalizeRequestScriptResult([
            { name: 'g_funcid', value: '150501' },
            { name: 'databody', value: 'D:/data/1.zip', type: 'file' },
            { name: 'databody2', value: '@file:D:/data/2.zip', type: 'string' },
            { name: 'skip', value: '1', enabled: false },
            { name: 'empty', value: null },
            { name: '  ', value: 'ignored' },
            null,
        ]);

        expect(result.fields).toEqual({
            g_funcid: '150501',
            empty: '',
        });
        expect(result.binaryFields).toEqual({
            databody: 'D:/data/1.zip',
            databody2: 'D:/data/2.zip',
        });
        expect(result.params).toEqual([
            { name: 'g_funcid', value: '150501', type: 'string' },
            { name: 'databody', value: 'D:/data/1.zip', type: 'file' },
            { name: 'databody2', value: '@file:D:/data/2.zip', type: 'string' },
            { name: 'skip', value: '1', type: 'disabled' },
            { name: 'empty', value: '', type: 'string' },
        ]);
    });

    it('returns empty fields for scalar results', () => {
        expect(normalizeRequestScriptResult('150501')).toEqual({
            fields: {},
            binaryFields: {},
            params: [],
        });
    });
});

describe('executeRequestScript', () => {
    it('still supports legacy arrow scripts', () => {
        const result = executeRequestScript('(ctx) => ({ g_funcid: ctx.msgtype })', baseCtx);
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.fields).toEqual({ g_funcid: '150501' });
        }
    });
});
