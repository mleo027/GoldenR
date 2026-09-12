import type { AgentToolName } from '@/shared/agent/protocol';
import type {
    AutomationRunReport,
    AutomationScenario,
    AutomationWorkspace,
} from '@/shared/automation/types';
import type { KcxpEnvironment } from '@/shared/kcxp/types';

/**
 * 应用开放给 Agent 的宿主接口实现。
 *
 * Agent 只能通过 `AgentToolName` 白名单请求这些能力，无法直接访问文件系统、
 * 数据库或网络。场景读写走 store（保持界面同步），运行走模块内的运行器
 * （Worker + 既有 SQL/API 策略），因此原有的安全约束继续生效。
 */
export interface AgentToolContext {
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

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

function requireString(args: Record<string, unknown>, key: string): string {
    const value = asString(args[key]);
    if (!value) throw new Error(`缺少参数 ${key}`);
    return value;
}

function findScenario(ctx: AgentToolContext, scenarioId: string): AutomationScenario | undefined {
    return ctx.workspace.scenarios.find((item) => item.id === scenarioId);
}

/** 新建脚本时挂到哪里：优先当前选中场景所在的项目/目录。 */
function resolvePlacement(
    ctx: AgentToolContext,
): { projectId: string; folderId?: string } | undefined {
    const selected = ctx.workspace.scenarios.find((item) => item.id === ctx.selectedScenarioId);
    if (selected) return { projectId: selected.projectId, folderId: selected.folderId };
    const project = ctx.workspace.projects[0];
    if (!project) return undefined;
    return { projectId: project.id };
}

function writeScenario(args: Record<string, unknown>, ctx: AgentToolContext) {
    const script = requireString(args, 'script');
    const scenarioId = asString(args.scenarioId);
    const name = asString(args.name);

    if (scenarioId) {
        const existing = findScenario(ctx, scenarioId);
        if (!existing) throw new Error(`场景不存在：${scenarioId}`);
        ctx.updateScenario(scenarioId, {
            script,
            ...(name ? { name } : {}),
        });
        return { scenarioId, previousScript: existing.script, created: false };
    }

    const placement = resolvePlacement(ctx);
    if (!placement) throw new Error('没有可用的项目，无法新建场景');
    const created = ctx.createScenario({
        ...placement,
        name: name || 'Agent 场景',
        script,
    });
    return { scenarioId: created, created: true };
}

export async function executeAgentTool(
    name: AgentToolName,
    args: Record<string, unknown>,
    ctx: AgentToolContext,
): Promise<unknown> {
    switch (name) {
        case 'list_scenarios':
            return ctx.workspace.scenarios.map((item) => ({
                scenarioId: item.id,
                name: item.name,
                projectId: item.projectId,
                folderId: item.folderId,
                enabled: item.enabled,
            }));

        case 'read_scenario': {
            const scenario = findScenario(ctx, requireString(args, 'scenarioId'));
            if (!scenario) throw new Error(`场景不存在：${asString(args.scenarioId) || '(空)'}`);
            return { scenarioId: scenario.id, name: scenario.name, script: scenario.script };
        }

        case 'list_environments':
            return ctx.environments.map((item) => ({
                environmentId: item.id,
                name: item.name,
                environmentType: item.environmentType ?? 'development',
            }));

        case 'write_scenario':
            return writeScenario(args, ctx);

        case 'run_scenario': {
            const scenarioId = requireString(args, 'scenarioId');
            if (!findScenario(ctx, scenarioId)) throw new Error(`场景不存在：${scenarioId}`);
            const environmentId =
                asString(args.environmentId) || ctx.selectedEnvironmentId || undefined;
            return ctx.runScenario(scenarioId, environmentId);
        }

        case 'read_report': {
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
        }

        default:
            throw new Error(`未知工具：${String(name)}`);
    }
}
