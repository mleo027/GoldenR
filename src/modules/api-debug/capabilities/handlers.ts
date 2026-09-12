/**
 * API 调试模块的能力实现。
 *
 * 与界面共用同一条调用路径（`executeApiCase`），因此生产环境的 KCBP 约束、脚本与
 * TCD 运行逻辑、响应归一化对外部调用一视同仁。
 *
 * 响应体可能很大，一律**截断后再返回**：外部调用方的模型上下文不该被一次响应塞满。
 */
import type { CapabilityArgs, CapabilityHandlerMap } from '@/shared/capabilities/types';
import type { ResponseData } from '@/shared/test/response';
import type { KcbpInvokeMode, KcbpCallOutcome } from '../services/kcbp/types';
import type { ParamItem, ProjectData, TabData } from '../types/workspace';
import type { RequestHistoryEntry } from '../types/requestHistory';
import { API_DEBUG_CAPABILITY_NAMESPACE } from './manifest';

/** 单次调用返回的响应体上限（字符）。 */
export const MAX_RESPONSE_CHARS = 8000;
const MAX_HISTORY_LIMIT = 50;
const DEFAULT_HISTORY_LIMIT = 10;

/**
 * 宿主上下文：由渲染层组装。
 * 平台不解释这个结构，只有本模块自己收窄。
 */
export interface ApiDebugCapabilityContext {
    projects: ProjectData[];
    history: RequestHistoryEntry[];
    /** 新建用例（id 由调用方给出，便于立刻引用）。 */
    importCase(projectIndex: number, tab: TabData): void;
    updateCaseById(caseId: string, patch: Partial<TabData>): void;
    executeCase(tab: TabData, mode: KcbpInvokeMode): Promise<KcbpCallOutcome>;
    newCaseId(): string;
}

function asContext(context: unknown): ApiDebugCapabilityContext {
    const candidate = context as Partial<ApiDebugCapabilityContext> | null | undefined;
    if (!candidate || typeof candidate !== 'object') throw new Error('缺少 API 调试能力上下文');
    const complete =
        Array.isArray(candidate.projects) &&
        Array.isArray(candidate.history) &&
        typeof candidate.importCase === 'function' &&
        typeof candidate.updateCaseById === 'function' &&
        typeof candidate.executeCase === 'function' &&
        typeof candidate.newCaseId === 'function';
    if (!complete) throw new Error('API 调试能力上下文不完整');
    return candidate as ApiDebugCapabilityContext;
}

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

function requireString(args: CapabilityArgs, key: string): string {
    const value = asString(args[key]);
    if (!value) throw new Error(`缺少参数 ${key}`);
    return value;
}

function findCase(ctx: ApiDebugCapabilityContext, caseId: string): TabData | undefined {
    for (const project of ctx.projects) {
        const found = project.cases.find((item) => item.id === caseId);
        if (found) return found;
    }
    return undefined;
}

/** 项目定位：优先按 id，其次第一个项目。 */
function resolveProjectIndex(ctx: ApiDebugCapabilityContext, projectId: string): number {
    if (!projectId) return ctx.projects.length > 0 ? 0 : -1;
    return ctx.projects.findIndex((item) => item.id === projectId);
}

function summarizeResponse(response: ResponseData) {
    let body: string;
    try {
        body = JSON.stringify(response) ?? String(response);
    } catch {
        body = String(response);
    }
    return {
        code: response.code,
        message: response.message,
        stats: response.stats,
        resultSetCount: response.resultSets?.length ?? 0,
        truncated: body.length > MAX_RESPONSE_CHARS,
        body: body.slice(0, MAX_RESPONSE_CHARS),
    };
}

function summarizeHistoryEntry(entry: RequestHistoryEntry) {
    return {
        id: entry.id,
        at: entry.timestamp,
        caseId: entry.caseId,
        caseName: entry.caseName,
        projectName: entry.projectName,
        mode: entry.mode,
        outcome: entry.outcome,
    };
}

function readParams(args: CapabilityArgs): ParamItem[] | undefined {
    const raw = args.params;
    if (!Array.isArray(raw)) return undefined;
    return raw.map((item) => {
        const record = (item ?? {}) as Record<string, unknown>;
        return {
            name: asString(record.name),
            value: asString(record.value),
            type: record.type === 'file' || record.type === 'disabled' ? record.type : 'string',
        };
    });
}

function createCase(args: CapabilityArgs, ctx: ApiDebugCapabilityContext) {
    const projectIndex = resolveProjectIndex(ctx, asString(args.projectId));
    if (projectIndex < 0) throw new Error('没有可用的项目');
    const project = ctx.projects[projectIndex];
    const now = Date.now();
    const tab: TabData = {
        id: ctx.newCaseId(),
        name: asString(args.name) || '新建接口',
        protocol: asString(args.protocol) || 'kcxp',
        address: requireString(args, 'address'),
        params: [],
        createdAt: now,
        updatedAt: now,
        ...(asString(args.script) ? { script: asString(args.script) } : {}),
        ...(asString(args.folderId) ? { folderId: asString(args.folderId) } : {}),
    };
    ctx.importCase(projectIndex, tab);
    return { caseId: tab.id, projectId: project?.id, created: true };
}

function updateCase(args: CapabilityArgs, ctx: ApiDebugCapabilityContext) {
    const caseId = requireString(args, 'caseId');
    const existing = findCase(ctx, caseId);
    if (!existing) throw new Error(`用例不存在：${caseId}`);

    const params = readParams(args);
    const patch: Partial<TabData> = {
        ...(asString(args.name) ? { name: asString(args.name) } : {}),
        ...(asString(args.address) ? { address: asString(args.address) } : {}),
        ...(params ? { params } : {}),
        ...(typeof args.script === 'string' ? { script: args.script } : {}),
    };
    if (Object.keys(patch).length === 0) throw new Error('没有需要修改的字段');
    ctx.updateCaseById(caseId, patch);

    // 返回修改前的取值，便于调用方回滚。
    return {
        caseId,
        updated: Object.keys(patch),
        previous: {
            name: existing.name,
            address: existing.address,
            params: existing.params,
            script: existing.script,
        },
    };
}

async function callCase(args: CapabilityArgs, ctx: ApiDebugCapabilityContext) {
    const caseId = requireString(args, 'caseId');
    const tab = findCase(ctx, caseId);
    if (!tab) throw new Error(`用例不存在：${caseId}`);
    const mode: KcbpInvokeMode = args.mode === 'ui' ? 'ui' : 'script';

    const outcome = await ctx.executeCase(tab, mode);
    return {
        caseId,
        msgtype: outcome.msgtype,
        status: outcome.status,
        missingParam: outcome.missingParam,
        scriptError: outcome.scriptError,
        response: summarizeResponse(outcome.response),
    };
}

const name = (action: string): string => `${API_DEBUG_CAPABILITY_NAMESPACE}_${action}`;

export const handlers: CapabilityHandlerMap = {
    [name('list_projects')]: async (_args, context) => {
        const ctx = asContext(context);
        return ctx.projects.map((project) => ({
            projectId: project.id,
            name: project.name,
            caseCount: project.cases.length,
            folderCount: project.folders?.length ?? 0,
        }));
    },

    [name('list_cases')]: async (args, context) => {
        const ctx = asContext(context);
        const wantedProjectId = asString(args.projectId);
        return ctx.projects
            .filter((project) => !wantedProjectId || project.id === wantedProjectId)
            .flatMap((project) =>
                project.cases.map((item) => ({
                    caseId: item.id,
                    projectId: project.id,
                    folderId: item.folderId,
                    name: item.name,
                    protocol: item.protocol,
                    address: item.address,
                })),
            );
    },

    [name('read_case')]: async (args, context) => {
        const ctx = asContext(context);
        const caseId = requireString(args, 'caseId');
        const found = findCase(ctx, caseId);
        if (!found) throw new Error(`用例不存在：${caseId}`);
        return {
            caseId: found.id,
            name: found.name,
            protocol: found.protocol,
            address: found.address,
            params: found.params,
            script: found.script,
        };
    },

    [name('create_case')]: async (args, context) => createCase(args, asContext(context)),

    [name('update_case')]: async (args, context) => updateCase(args, asContext(context)),

    [name('call_case')]: async (args, context) => callCase(args, asContext(context)),

    [name('read_history')]: async (args, context) => {
        const ctx = asContext(context);
        const wantedCaseId = asString(args.caseId);
        const requested = typeof args.limit === 'number' ? args.limit : DEFAULT_HISTORY_LIMIT;
        const limit = Math.min(Math.max(1, Math.floor(requested)), MAX_HISTORY_LIMIT);
        return ctx.history
            .filter((entry) => !wantedCaseId || entry.caseId === wantedCaseId)
            .slice(0, limit)
            .map(summarizeHistoryEntry);
    },
};
