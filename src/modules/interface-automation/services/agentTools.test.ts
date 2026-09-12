import { describe, expect, it, vi } from 'vitest';
import type { AutomationRunReport, AutomationWorkspace } from '@/shared/automation/types';
import type { KcxpEnvironment } from '@/shared/kcxp/types';
import { executeAgentTool, type AgentToolContext } from './agentTools';

const workspace: AutomationWorkspace = {
    projects: [{ id: 'p1', name: '项目', position: 0, createdAt: 0, updatedAt: 0 }],
    folders: [{ id: 'f1', projectId: 'p1', name: '目录', position: 0, createdAt: 0, updatedAt: 0 }],
    scenarios: [
        {
            id: 's1',
            projectId: 'p1',
            folderId: 'f1',
            name: '查询余额',
            script: 'scenario();',
            position: 0,
            enabled: true,
            createdAt: 0,
            updatedAt: 0,
        },
    ],
};

const environments: KcxpEnvironment[] = [
    { id: 'e1', name: '开发环境', environmentType: 'development' } as KcxpEnvironment,
];

function createContext(overrides: Partial<AgentToolContext> = {}) {
    const createScenario = vi.fn(() => 's-new');
    const updateScenario = vi.fn();
    const runScenario = vi.fn(
        async (): Promise<AutomationRunReport> =>
            ({
                id: 'r1',
                scenarioId: 's1',
                scenarioName: '查询余额',
                environmentId: 'e1',
                status: 'passed',
                startedAt: 0,
                durationMs: 12,
                inputs: {},
                steps: [],
            }) as AutomationRunReport,
    );
    const context: AgentToolContext = {
        workspace,
        reports: {},
        environments,
        selectedScenarioId: 's1',
        selectedEnvironmentId: 'e1',
        createScenario,
        updateScenario,
        runScenario,
        ...overrides,
    };
    return { context, createScenario, updateScenario, runScenario };
}

describe('agentTools（应用开放给 Agent 的接口）', () => {
    it('list_scenarios 返回场景摘要', async () => {
        const { context } = createContext();
        const result = (await executeAgentTool('list_scenarios', {}, context)) as Array<
            Record<string, unknown>
        >;
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ scenarioId: 's1', name: '查询余额' });
    });

    it('read_scenario 返回脚本，场景不存在时抛错', async () => {
        const { context } = createContext();
        await expect(
            executeAgentTool('read_scenario', { scenarioId: 's1' }, context),
        ).resolves.toMatchObject({ scenarioId: 's1', script: 'scenario();' });
        await expect(
            executeAgentTool('read_scenario', { scenarioId: 'missing' }, context),
        ).rejects.toThrow('场景不存在');
    });

    it('list_environments 返回可选环境', async () => {
        const { context } = createContext();
        await expect(executeAgentTool('list_environments', {}, context)).resolves.toEqual([
            { environmentId: 'e1', name: '开发环境', environmentType: 'development' },
        ]);
    });

    it('write_scenario 覆盖既有场景并回传旧脚本用于回滚', async () => {
        const { context, updateScenario, createScenario } = createContext();
        const result = await executeAgentTool(
            'write_scenario',
            { scenarioId: 's1', script: 'scenario({ inputs: {} }, async () => {});' },
            context,
        );
        expect(result).toMatchObject({ scenarioId: 's1', previousScript: 'scenario();' });
        expect(updateScenario).toHaveBeenCalledWith('s1', {
            script: 'scenario({ inputs: {} }, async () => {});',
        });
        expect(createScenario).not.toHaveBeenCalled();
    });

    it('write_scenario 在无 scenarioId 时按当前选中位置新建', async () => {
        const { context, createScenario, updateScenario } = createContext();
        const result = await executeAgentTool(
            'write_scenario',
            { name: '新场景', script: 'scenario();' },
            context,
        );
        expect(createScenario).toHaveBeenCalledWith({
            projectId: 'p1',
            folderId: 'f1',
            name: '新场景',
            script: 'scenario();',
        });
        expect(result).toMatchObject({ scenarioId: 's-new', created: true });
        expect(updateScenario).not.toHaveBeenCalled();
    });

    it('write_scenario 缺少脚本时抛错', async () => {
        const { context } = createContext();
        await expect(executeAgentTool('write_scenario', {}, context)).rejects.toThrow(
            '缺少参数 script',
        );
    });

    it('run_scenario 委托给运行器并透传环境', async () => {
        const { context, runScenario } = createContext();
        const report = (await executeAgentTool(
            'run_scenario',
            { scenarioId: 's1', environmentId: 'e1' },
            context,
        )) as AutomationRunReport;
        expect(report.status).toBe('passed');
        expect(runScenario).toHaveBeenCalledWith('s1', 'e1');
    });

    it('read_report 未运行过时返回 never-run', async () => {
        const { context } = createContext();
        await expect(
            executeAgentTool('read_report', { scenarioId: 's1' }, context),
        ).resolves.toEqual({ scenarioId: 's1', status: 'never-run' });
    });

    it('read_report 汇总失败步骤便于自修复', async () => {
        const { context } = createContext({
            reports: {
                s1: {
                    id: 'r1',
                    scenarioId: 's1',
                    scenarioName: '查询余额',
                    environmentId: 'e1',
                    status: 'failed',
                    startedAt: 0,
                    durationMs: 5,
                    inputs: {},
                    error: '断言失败',
                    steps: [
                        {
                            id: 'step-1',
                            name: '调用接口',
                            depth: 0,
                            status: 'failed',
                            startedAt: 0,
                            durationMs: 5,
                            error: '期望 0，实际 1',
                            actions: [],
                        },
                    ],
                },
            },
        });
        const result = (await executeAgentTool('read_report', { scenarioId: 's1' }, context)) as {
            status: string;
            steps: Array<{ name: string; error?: string }>;
        };
        expect(result.status).toBe('failed');
        expect(result.steps[0]).toMatchObject({ name: '调用接口', error: '期望 0，实际 1' });
    });
});
