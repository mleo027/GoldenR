/**
 * 接口自动化模块的能力实现。
 *
 * 这些实现原本挂在模块内的 Agent 工具分发器上；现在收归为与传输无关的能力层，
 * 由平台注册表统一调度。安全约束不变：
 *
 * - 场景读写走 store（保持界面与持久化同步），不直接碰数据库；
 * - 运行走模块内既有运行器（Worker + 既有 SQL/API 策略），因此生产环境禁写、
 *   `validateAutomationWriteSql`、报告行数限制继续生效，与调用方是谁无关。
 */
import type { CapabilityArgs, CapabilityHandlerMap } from '@/shared/capabilities/types';
import type {
    AutomationRunReport,
    AutomationScenario,
    AutomationWorkspace,
} from '@/shared/automation/types';
import type { KcxpEnvironment } from '@/shared/kcxp/types';
import { AUTOMATION_CAPABILITY_NAMESPACE } from './manifest';

/**
 * 宿主上下文：由渲染层组装（数据主权在渲染层的 store 与运行器）。
 * 平台不解释这个结构，只有本模块自己收窄。
 */
export interface AutomationCapabilityContext {
    workspace: AutomationWorkspace;
    reports: Record<string, AutomationRunReport>;
    environments: KcxpEnvironment[];
    selectedScenarioId?: string;
    selectedEnvironmentId?: string;
    createScenario(input: {
        projectId: string;
        folderId?: string;
        name: string;
        script: string;
    }): string;
    updateScenario(id: string, patch: Partial<AutomationScenario>): void;
    runScenario(scenarioId: string, environmentId?: string): Promise<AutomationRunReport>;
}

/** 平台传入的是不透明的 `unknown`，在这里收窄并给出可读的失败原因。 */
function asContext(context: unknown): AutomationCapabilityContext {
    const candidate = context as Partial<AutomationCapabilityContext> | null | undefined;
    if (!candidate || typeof candidate !== 'object') {
        throw new Error('缺少自动化能力上下文');
    }
    const complete =
        candidate.workspace &&
        typeof candidate.createScenario === 'function' &&
        typeof candidate.updateScenario === 'function' &&
        typeof candidate.runScenario === 'function' &&
        Array.isArray(candidate.environments);
    if (!complete) throw new Error('自动化能力上下文不完整');
    return candidate as AutomationCapabilityContext;
}

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

function requireString(args: CapabilityArgs, key: string): string {
    const value = asString(args[key]);
    if (!value) throw new Error(`缺少参数 ${key}`);
    return value;
}

function findScenario(
    ctx: AutomationCapabilityContext,
    scenarioId: string,
): AutomationScenario | undefined {
    return ctx.workspace.scenarios.find((item) => item.id === scenarioId);
}

/** 新建脚本时挂到哪里：优先当前选中场景所在的项目/目录。 */
function resolvePlacement(
    ctx: AutomationCapabilityContext,
): { projectId: string; folderId?: string } | undefined {
    const selected = ctx.workspace.scenarios.find((item) => item.id === ctx.selectedScenarioId);
    if (selected) return { projectId: selected.projectId, folderId: selected.folderId };
    const project = ctx.workspace.projects[0];
    if (!project) return undefined;
    return { projectId: project.id };
}

function writeScenario(args: CapabilityArgs, ctx: AutomationCapabilityContext) {
    const script = requireString(args, 'script');
    const scenarioId = asString(args.scenarioId);
    const name = asString(args.name);

    if (scenarioId) {
        const existing = findScenario(ctx, scenarioId);
        if (!existing) throw new Error(`场景不存在：${scenarioId}`);
        ctx.updateScenario(scenarioId, { script, ...(name ? { name } : {}) });
        return { scenarioId, previousScript: existing.script, created: false };
    }

    const placement = resolvePlacement(ctx);
    if (!placement) throw new Error('没有可用的项目，无法新建场景');
    const created = ctx.createScenario({ ...placement, name: name || '新建场景', script });
    return { scenarioId: created, created: true };
}

const name = (action: string): string => `${AUTOMATION_CAPABILITY_NAMESPACE}_${action}`;

export const handlers: CapabilityHandlerMap = {
    [name('list_scenarios')]: async (_args, context) => {
        const ctx = asContext(context);
        return ctx.workspace.scenarios.map((item) => ({
            scenarioId: item.id,
            name: item.name,
            projectId: item.projectId,
            folderId: item.folderId,
            enabled: item.enabled,
        }));
    },

    [name('read_scenario')]: async (args, context) => {
        const ctx = asContext(context);
        const scenarioId = requireString(args, 'scenarioId');
        const scenario = findScenario(ctx, scenarioId);
        if (!scenario) throw new Error(`场景不存在：${scenarioId}`);
        return { scenarioId: scenario.id, name: scenario.name, script: scenario.script };
    },

    [name('write_scenario')]: async (args, context) => writeScenario(args, asContext(context)),

    [name('list_environments')]: async (_args, context) => {
        const ctx = asContext(context);
        return ctx.environments.map((item) => ({
            environmentId: item.id,
            name: item.name,
            environmentType: item.environmentType ?? 'development',
        }));
    },

    [name('run_scenario')]: async (args, context) => {
        const ctx = asContext(context);
        const scenarioId = requireString(args, 'scenarioId');
        if (!findScenario(ctx, scenarioId)) throw new Error(`场景不存在：${scenarioId}`);
        const environmentId =
            asString(args.environmentId) || ctx.selectedEnvironmentId || undefined;
        return ctx.runScenario(scenarioId, environmentId);
    },

    [name('read_report')]: async (args, context) => {
        const ctx = asContext(context);
        const scenarioId = requireString(args, 'scenarioId');
        const report = ctx.reports[scenarioId];
        if (!report) return { scenarioId, status: 'never-run' };
        return {
            scenarioId,
            status: report.status,
            durationMs: report.durationMs,
            error: report.error,
            steps: report.steps.map((step) => ({
                name: step.name,
                status: step.status,
                error: step.error,
                actions: step.actions.map((action) => ({
                    kind: action.kind,
                    name: action.name,
                    status: action.status,
                    error: action.error,
                })),
            })),
        };
    },
};
