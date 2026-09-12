import { describe, expect, it, vi } from 'vitest';
import type { ResponseData } from '@/shared/test/response';
import type { KcbpCallOutcome } from '../services/kcbp/types';
import type { ProjectData, TabData } from '../types/workspace';
import type { RequestHistoryEntry } from '../types/requestHistory';
import { MAX_RESPONSE_CHARS, handlers, type ApiDebugCapabilityContext } from './handlers';

const call = (action: string, args: Record<string, unknown>, context: ApiDebugCapabilityContext) =>
    handlers[`apidebug_${action}`](args, context);

function makeCase(overrides: Partial<TabData> = {}): TabData {
    return {
        id: 'c1',
        name: '查询用户',
        protocol: 'kcxp',
        address: 'kcxp://demo/query',
        params: [{ name: 'id', value: '1', type: 'string' }],
        createdAt: 0,
        updatedAt: 0,
        ...overrides,
    };
}

function makeProject(overrides: Partial<ProjectData> = {}): ProjectData {
    return {
        id: 'p1',
        name: '用户中心',
        cases: [makeCase()],
        createdAt: 0,
        updatedAt: 0,
        ...overrides,
    };
}

function makeResponse(overrides: Partial<ResponseData> = {}): ResponseData {
    return { code: '0000', message: '成功', resultSets: [], ...overrides };
}

function makeOutcome(overrides: Partial<KcbpCallOutcome> = {}): KcbpCallOutcome {
    return {
        response: makeResponse(),
        nextParams: [],
        status: 'ok',
        missingParam: null,
        msgtype: 'query',
        ...overrides,
    } as KcbpCallOutcome;
}

function makeContext(overrides: Partial<ApiDebugCapabilityContext> = {}) {
    const importCase = vi.fn();
    const updateCaseById = vi.fn();
    const executeCase = vi.fn(async () => makeOutcome());
    const context: ApiDebugCapabilityContext = {
        projects: [makeProject()],
        history: [],
        importCase,
        updateCaseById,
        executeCase,
        newCaseId: () => 'c-new',
        ...overrides,
    };
    return { context, importCase, updateCaseById, executeCase };
}

function makeEntry(overrides: Partial<RequestHistoryEntry> = {}): RequestHistoryEntry {
    return {
        id: 'h1',
        timestamp: 1000,
        projectName: '用户中心',
        caseId: 'c1',
        caseName: '查询用户',
        mode: 'script',
        request: { address: 'kcxp://demo/query', msgtype: 'query', params: [] },
        response: makeResponse(),
        outcome: { success: true, rows: 1 },
        ...overrides,
    };
}

describe('apidebug 读取类能力', () => {
    it('list_projects 返回项目摘要', async () => {
        const { context } = makeContext();
        await expect(call('list_projects', {}, context)).resolves.toEqual([
            { projectId: 'p1', name: '用户中心', caseCount: 1, folderCount: 0 },
        ]);
    });

    it('list_cases 返回用例摘要，可按项目过滤', async () => {
        const { context } = makeContext({
            projects: [makeProject(), makeProject({ id: 'p2', name: '订单', cases: [] })],
        });
        const all = (await call('list_cases', {}, context)) as unknown[];
        expect(all).toHaveLength(1);
        const filtered = (await call('list_cases', { projectId: 'p2' }, context)) as unknown[];
        expect(filtered).toHaveLength(0);
    });

    it('read_case 返回参数与脚本，不存在时抛错', async () => {
        const { context } = makeContext();
        await expect(call('read_case', { caseId: 'c1' }, context)).resolves.toMatchObject({
            caseId: 'c1',
            address: 'kcxp://demo/query',
            params: [{ name: 'id', value: '1', type: 'string' }],
        });
        await expect(call('read_case', { caseId: 'nope' }, context)).rejects.toThrowError(
            '用例不存在：nope',
        );
    });

    it('read_history 按用例过滤并限制条数', async () => {
        const history = Array.from({ length: 60 }, (_item, index) =>
            makeEntry({ id: `h${index}`, caseId: index % 2 === 0 ? 'c1' : 'c2' }),
        );
        const { context } = makeContext({ history });

        const filtered = (await call('read_history', { caseId: 'c1' }, context)) as unknown[];
        expect(filtered).toHaveLength(10);

        const capped = (await call('read_history', { limit: 999 }, context)) as unknown[];
        expect(capped).toHaveLength(50);
    });
});

describe('apidebug 写入类能力', () => {
    it('create_case 使用给定 id 建到指定项目并回传 caseId', async () => {
        const { context, importCase } = makeContext();

        const result = await call(
            'create_case',
            { address: 'kcxp://demo/new', name: '新接口', folderId: 'f1' },
            context,
        );

        expect(result).toMatchObject({ caseId: 'c-new', projectId: 'p1', created: true });
        expect(importCase).toHaveBeenCalledWith(
            0,
            expect.objectContaining({
                id: 'c-new',
                name: '新接口',
                address: 'kcxp://demo/new',
                folderId: 'f1',
            }),
        );
    });

    it('create_case 缺地址时抛错', async () => {
        const { context, importCase } = makeContext();
        await expect(call('create_case', {}, context)).rejects.toThrowError('缺少参数 address');
        expect(importCase).not.toHaveBeenCalled();
    });

    it('create_case 在项目不存在时抛错', async () => {
        const { context } = makeContext();
        await expect(
            call('create_case', { projectId: 'nope', address: 'a' }, context),
        ).rejects.toThrowError('没有可用的项目');
    });

    it('update_case 返回修改前的取值以便回滚', async () => {
        const { context, updateCaseById } = makeContext();

        const result = await call('update_case', { caseId: 'c1', name: '改名' }, context);

        expect(updateCaseById).toHaveBeenCalledWith('c1', { name: '改名' });
        expect(result).toMatchObject({
            caseId: 'c1',
            updated: ['name'],
            previous: { name: '查询用户', address: 'kcxp://demo/query' },
        });
    });

    it('update_case 覆盖式更新参数', async () => {
        const { context, updateCaseById } = makeContext();

        await call(
            'update_case',
            { caseId: 'c1', params: [{ name: 'x', value: '2', type: 'disabled' }] },
            context,
        );

        expect(updateCaseById).toHaveBeenCalledWith('c1', {
            params: [{ name: 'x', value: '2', type: 'disabled' }],
        });
    });

    it('update_case 没有可改字段或用例不存在时抛错', async () => {
        const { context, updateCaseById } = makeContext();
        await expect(call('update_case', { caseId: 'c1' }, context)).rejects.toThrowError(
            '没有需要修改的字段',
        );
        await expect(
            call('update_case', { caseId: 'nope', name: 'x' }, context),
        ).rejects.toThrowError('用例不存在：nope');
        expect(updateCaseById).not.toHaveBeenCalled();
    });
});

describe('apidebug call_case', () => {
    it('走共用调用路径并返回响应摘要', async () => {
        const { context, executeCase } = makeContext();

        const result = await call('call_case', { caseId: 'c1' }, context);

        expect(executeCase).toHaveBeenCalledWith(expect.objectContaining({ id: 'c1' }), 'script');
        expect(result).toMatchObject({
            caseId: 'c1',
            msgtype: 'query',
            status: 'ok',
            response: { code: '0000', message: '成功', truncated: false },
        });
    });

    it('mode=ui 时按参数表发送', async () => {
        const { context, executeCase } = makeContext();
        await call('call_case', { caseId: 'c1', mode: 'ui' }, context);
        expect(executeCase).toHaveBeenCalledWith(expect.anything(), 'ui');
    });

    it('缺参场景原样透出，便于调用方补齐后重试', async () => {
        const { context } = makeContext({
            executeCase: vi.fn(async () =>
                makeOutcome({ missingParam: { name: 'id', value: '1' } }),
            ) as never,
        });

        const result = await call('call_case', { caseId: 'c1' }, context);

        expect(result).toMatchObject({ missingParam: { name: 'id', value: '1' } });
    });

    it('响应过大时截断，避免塞满调用方的上下文', async () => {
        const huge = makeResponse({
            resultSets: [
                { rows: Array.from({ length: 5000 }, (_i, index) => ({ index })) },
            ] as never,
        });
        const { context } = makeContext({
            executeCase: vi.fn(async () => makeOutcome({ response: huge })) as never,
        });

        const result = (await call('call_case', { caseId: 'c1' }, context)) as {
            response: { body: string; truncated: boolean };
        };

        expect(result.response.truncated).toBe(true);
        expect(result.response.body).toHaveLength(MAX_RESPONSE_CHARS);
    });

    it('用例不存在时抛错，不发起调用', async () => {
        const { context, executeCase } = makeContext();
        await expect(call('call_case', { caseId: 'nope' }, context)).rejects.toThrowError(
            '用例不存在：nope',
        );
        expect(executeCase).not.toHaveBeenCalled();
    });

    it('上下文不完整时明确报错，而不是深层的 TypeError', async () => {
        await expect(
            call('list_projects', {}, {} as ApiDebugCapabilityContext),
        ).rejects.toThrowError('API 调试能力上下文不完整');
    });
});
