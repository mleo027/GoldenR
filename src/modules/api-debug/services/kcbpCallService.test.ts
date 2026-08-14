import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ParamItem } from '../types/workspace';
import type { KcbpResponseData } from '../../../types/kcbp';
import {
    buildKcbpCallOutcome,
    buildKcbpRequest,
    getKcbpCallFeedback,
    invokeKcbpCall,
    type KcbpCallOutcome,
} from './kcbpCallService';
import { buildCaseIndex } from '@/shared/tcd/resolveCase';
import type { TcdCaseTab } from '@/shared/tcd/types';

const mockCallKcbp = vi.fn();
const mockQueryScriptSql = vi.fn();

vi.mock('../../../lib/electron', () => ({
    requireElectronAPI: () => ({
        kcbp: {
            call: mockCallKcbp,
        },
        database: {
            queryScript: mockQueryScriptSql,
        },
    }),
}));

const successRaw: KcbpResponseData = {
    code: '0',
    msg: 'ok',
    data: [{ custid: '1' }],
    stats: { timecost: 12, rows: 1 },
};

function baseOutcome(overrides: Partial<KcbpCallOutcome> = {}): KcbpCallOutcome {
    return {
        response: {
            code: '0',
            message: 'ok',
            data: [{ custid: '1' }],
            stats: { timecost: 12, rows: 1 },
        },
        nextParams: [],
        status: {
            kind: 'success',
            businessCode: '0',
            businessMsg: 'ok',
            transportCode: '0',
            transportMsg: 'ok',
            hasBusinessRow: false,
        },
        missingParam: null,
        msgtype: '150501',
        ...overrides,
    };
}

describe('buildKcbpRequest', () => {
    it('maps address parts and fields to payload', () => {
        const payload = buildKcbpRequest(
            {
                host: '127.0.0.1:21000',
                msgtype: '150501',
                queue: 'req1',
                timeout: '30',
            },
            '150501',
            { g_serverid: '1', market: '1' },
        );

        expect(payload.connection).toMatchObject({
            ip: '127.0.0.1',
            port: '21000',
            apiid: '150501',
            reqqueue: 'req1',
            requesttimeout: '30',
            service: 'kcbp',
        });
        expect(payload.param).toEqual({
            msgtype: '150501',
            fields: { g_serverid: '1', market: '1' },
        });
    });
});

describe('buildKcbpCallOutcome', () => {
    it('maps raw response and detects missing param', () => {
        const raw: KcbpResponseData = {
            code: '90001',
            msg: '没有fundid项的数据',
            data: [],
            stats: { timecost: 1, rows: 0 },
        };

        const outcome = buildKcbpCallOutcome(
            { params: [] },
            '127.0.0.1:21000/150501',
            '150501',
            raw,
        );

        expect(outcome.msgtype).toBe('150501');
        expect(outcome.response.data).toHaveLength(0);
        expect(outcome.missingParam).toEqual({ name: 'fundid', value: '' });
        expect(outcome.nextParams.some((item) => item.name === 'fundid')).toBe(true);
    });
});

describe('getKcbpCallFeedback', () => {
    it('prioritizes script test failure', () => {
        const feedback = getKcbpCallFeedback(
            baseOutcome({
                scriptTest: { passed: false, message: '未找到 custid', steps: [] },
            }),
        );
        expect(feedback).toEqual({ level: 'error', message: '测试失败：未找到 custid' });
    });

    it('reports missing param as info', () => {
        const feedback = getKcbpCallFeedback(
            baseOutcome({
                missingParam: { name: 'fundid', value: '' },
            }),
        );
        expect(feedback).toEqual({
            level: 'info',
            message: '已自动添加入参 fundid，请填写后重新发送',
        });
    });

    it('reports script pass as success', () => {
        const feedback = getKcbpCallFeedback(
            baseOutcome({
                scriptTest: { passed: true, message: '全部通过', steps: [] },
            }),
        );
        expect(feedback).toEqual({
            level: 'success',
            message: '测试通过：全部通过（150501 返回 1 行）',
        });
    });

    it('reports default success for plain call', () => {
        const feedback = getKcbpCallFeedback(baseOutcome());
        expect(feedback).toEqual({
            level: 'success',
            message: '150501调用完成，返回 1 行',
        });
    });
});

describe('invokeKcbpCall', () => {
    beforeEach(() => {
        mockCallKcbp.mockReset();
        mockQueryScriptSql.mockReset();
        mockCallKcbp.mockResolvedValue(successRaw);
    });

    const tab = {
        address: '127.0.0.1:21000/150501',
        name: '150501',
        params: [{ name: 'market', value: '1', type: 'string' }] as ParamItem[],
        script: '',
    };

    it('runs UI mode with param table fields', async () => {
        const outcome = await invokeKcbpCall(tab, 'ui');

        expect(mockCallKcbp).toHaveBeenCalledTimes(1);
        expect(mockCallKcbp.mock.calls[0][0].param.fields).toEqual({ market: '1' });
        expect(outcome.response.code).toBe('0');
    });

    it('uses injected execution ports without the electron global', async () => {
        const injectedCall = vi.fn().mockResolvedValue(successRaw);
        const injectedQuery = vi.fn().mockResolvedValue({ rows: [], columns: [] });
        const outcome = await invokeKcbpCall(tab, 'ui', {
            electronDeps: {
                callKcbp: injectedCall,
                queryScriptSql: injectedQuery,
            },
        });

        expect(injectedCall).toHaveBeenCalledTimes(1);
        expect(injectedQuery).not.toHaveBeenCalled();
        expect(mockCallKcbp).not.toHaveBeenCalled();
        expect(outcome.response.code).toBe('0');
    });

    it('runs script mode with injected execution ports', async () => {
        const injectedCall = vi.fn().mockResolvedValue(successRaw);
        const injectedQuery = vi.fn().mockResolvedValue({ rows: [], columns: [] });
        const scriptTab = {
            ...tab,
            script: `async function main(ctx) {
  await call({ g_funcid: ctx.msgtype, market: '1' });
  return test.pass('script ok');
}`,
        };

        const outcome = await invokeKcbpCall(scriptTab, 'script', {
            electronDeps: {
                callKcbp: injectedCall,
                queryScriptSql: injectedQuery,
            },
        });

        expect(injectedCall).toHaveBeenCalledTimes(1);
        expect(mockCallKcbp).not.toHaveBeenCalled();
        expect(outcome.scriptTest?.passed).toBe(true);
    });

    it('runs nested tcd flow with injected execution ports', async () => {
        const injectedCall = vi.fn().mockResolvedValue(successRaw);
        const injectedQuery = vi.fn().mockResolvedValue({ rows: [], columns: [] });
        const childCase: TcdCaseTab = {
            id: 'child-case',
            name: 'Child',
            address: '127.0.0.1:21000/150502',
            params: [],
            script: `async function main(ctx) {
  await call({ g_funcid: '150502', market: '1' });
  return test.pass('child ok');
}`,
        };
        const parentTab = {
            ...tab,
            script: `async function main(ctx) {
  flow.set('token', 'abc');
  const child = await flow.runCase('150502', { fundid: '8' });
  test.expect(flow.get('token') === 'abc', 'flow state');
  test.expect(String(child.code) === '0', 'child response');
  return test.pass('parent ok');
}`,
        };

        const outcome = await invokeKcbpCall(parentTab, 'tcd', {
            caseIndex: buildCaseIndex([
                {
                    id: 'p1',
                    name: 'P',
                    cases: [childCase],
                },
            ]),
            electronDeps: {
                callKcbp: injectedCall,
                queryScriptSql: injectedQuery,
            },
        });

        expect(injectedCall).toHaveBeenCalledTimes(1);
        expect(mockCallKcbp).not.toHaveBeenCalled();
        expect(outcome.scriptTest?.passed).toBe(true);
    });

    it('rejects before calling when msgtype is empty', async () => {
        const emptyMsgtypeTab = {
            ...tab,
            address: '127.0.0.1:21000',
            name: '接口名称',
        };

        await expect(invokeKcbpCall(emptyMsgtypeTab, 'ui')).rejects.toThrow(
            '请先填写 Msgtype 后再调用',
        );
        expect(mockCallKcbp).not.toHaveBeenCalled();
    });

    it('uses funcid or g_funcid param as msgtype when address msgtype is empty', async () => {
        const funcIdTab = {
            ...tab,
            address: '127.0.0.1:21000',
            name: '接口名称',
            params: [
                { name: 'g_funcid', value: '150501', type: 'string' },
                { name: 'market', value: '1', type: 'string' },
            ] as ParamItem[],
        };

        const outcome = await invokeKcbpCall(funcIdTab, 'ui');

        expect(mockCallKcbp.mock.calls[0][0].param.msgtype).toBe('150501');
        expect(outcome.msgtype).toBe('150501');
    });

    it('runs UI mode with file params via @file: prefix', async () => {
        const fileTab = {
            ...tab,
            params: [
                { name: 'databody', value: '@file:D:/data/1.zip', type: 'string' },
                { name: 'datasize', value: '', type: 'string' },
            ] as ParamItem[],
        };

        await invokeKcbpCall(fileTab, 'ui');

        expect(mockCallKcbp.mock.calls[0][0].param).toMatchObject({
            fields: { datasize: '' },
            binaryFields: { databody: 'D:/data/1.zip' },
        });
    });

    it('runs script mode with @file: call syntax', async () => {
        const scriptTab = {
            ...tab,
            script: `async function main(ctx) {
  await call({
    g_funcid: ctx.msgtype,
    databody: '@file:D:/data/1.zip',
  });
  return test.pass('脚本通过');
}`,
        };

        await invokeKcbpCall(scriptTab, 'script');

        expect(mockCallKcbp.mock.calls[0][0].param.binaryFields).toEqual({
            databody: 'D:/data/1.zip',
        });
    });

    it('runs script mode with test.pass result', async () => {
        const scriptTab = {
            ...tab,
            script: `async function main(ctx) {
  await call({ market: '1', g_funcid: ctx.msgtype });
  return test.pass('脚本通过');
}`,
        };

        const outcome = await invokeKcbpCall(scriptTab, 'script');

        expect(mockCallKcbp).toHaveBeenCalledTimes(1);
        expect(outcome.scriptTest?.passed).toBe(true);
        expect(outcome.scriptTest?.message).toBe('脚本通过');
    });

    it('runs tcd mode with ctx.input and records call steps', async () => {
        mockCallKcbp
            .mockResolvedValueOnce({ ...successRaw, code: '0', msg: 'ok1' })
            .mockResolvedValueOnce({ ...successRaw, code: '0', msg: 'ok2', data: [{ sno: '9' }] });

        const scriptTab = {
            ...tab,
            script: `async function main(ctx) {
  test.expect(ctx.input.fundid === '8', 'fundid');
  await call({ g_funcid: '150501', market: '1' });
  await call({ g_funcid: '150502', ordersno: '9' });
  return test.pass('tcd ok');
}`,
        };

        const outcome = await invokeKcbpCall(scriptTab, 'tcd', { runInput: { fundid: '8' } });

        expect(mockCallKcbp).toHaveBeenCalledTimes(2);
        expect(outcome.callSteps).toHaveLength(2);
        expect(outcome.callSteps?.[0].msgtype).toBe('150501');
        expect(outcome.callSteps?.[1].msgtype).toBe('150502');
        expect(outcome.scriptTest?.passed).toBe(true);
    });

    it('runs tcd flow.runCase to invoke another case script', async () => {
        mockCallKcbp.mockResolvedValue(successRaw);

        const childCase: TcdCaseTab = {
            id: 'child-case',
            name: 'Child',
            address: '127.0.0.1:21000/150502',
            params: [],
            script: `async function main(ctx) {
  await call({ g_funcid: '150502', market: '1' });
  return test.pass('child ok');
}`,
        };

        const parentTab = {
            ...tab,
            script: `async function main(ctx) {
  flow.set('token', 'abc');
  const child = await flow.runCase('150502', { fundid: '8' });
  test.expect(flow.get('token') === 'abc', 'flow state');
  test.expect(String(child.code) === '0', 'child response');
  return test.pass('parent ok');
}`,
        };

        const caseIndex = buildCaseIndex([
            {
                id: 'p1',
                name: 'P',
                cases: [
                    {
                        id: 'parent',
                        name: 'Parent',
                        address: tab.address,
                        params: tab.params,
                        script: parentTab.script,
                    },
                    childCase,
                ],
            },
        ]);

        const outcome = await invokeKcbpCall(parentTab, 'tcd', {
            runInput: { fundid: '8' },
            caseIndex,
        });

        expect(mockCallKcbp).toHaveBeenCalledTimes(1);
        expect(outcome.scriptTest?.passed).toBe(true);
        expect(outcome.scriptTest?.message).toBe('parent ok');
    });
});
