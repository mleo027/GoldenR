import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AutomationWorkspace } from '@/shared/automation/types';

const mocks = vi.hoisted(() => ({
    loadAutomationEnvironments: vi.fn(async () => [] as never[]),
    runScenarioForCapability: vi.fn(async () => ({ id: 'r' })),
}));

vi.mock('../services/automationEnvironmentData', () => ({
    loadAutomationEnvironments: mocks.loadAutomationEnvironments,
}));
vi.mock('../services/automationCapabilityRun', () => ({
    runScenarioForCapability: mocks.runScenarioForCapability,
}));

import { useAutomationStore } from '../store/automationStore';
import { createAutomationCapabilityContext } from './context';

const emptyWorkspace: AutomationWorkspace = { projects: [], folders: [], scenarios: [] };

const oneScenarioWorkspace: AutomationWorkspace = {
    projects: [{ id: 'p1', name: '项目', position: 0, createdAt: 0, updatedAt: 0 }],
    folders: [],
    scenarios: [
        {
            id: 's1',
            projectId: 'p1',
            name: '查询余额',
            script: 'scenario();',
            position: 0,
            enabled: true,
            createdAt: 0,
            updatedAt: 0,
        },
    ],
};

describe('createAutomationCapabilityContext', () => {
    beforeEach(() => {
        mocks.loadAutomationEnvironments.mockClear();
        useAutomationStore.setState({
            loaded: false,
            workspace: emptyWorkspace,
            scenarioReports: {},
        });
    });

    it('store 未 hydrate 时先加载，避免在空工作区上静默工作', async () => {
        const load = vi.fn(async () => {
            useAutomationStore.setState({ loaded: true, workspace: oneScenarioWorkspace });
        });
        useAutomationStore.setState({ load });

        const context = await createAutomationCapabilityContext();

        expect(load).toHaveBeenCalledTimes(1);
        expect(context.workspace.scenarios).toHaveLength(1);
    });

    it('已 hydrate 时不重复加载', async () => {
        const load = vi.fn();
        useAutomationStore.setState({ loaded: true, load });

        await createAutomationCapabilityContext();

        expect(load).not.toHaveBeenCalled();
    });

    it('外部调用没有"当前选中"概念，不设选中项', async () => {
        useAutomationStore.setState({ loaded: true, load: vi.fn() });

        const context = await createAutomationCapabilityContext();

        expect(context.selectedScenarioId).toBeUndefined();
        expect(context.selectedEnvironmentId).toBeUndefined();
    });

    it('界面内已加载环境时不再重复读取', async () => {
        useAutomationStore.setState({ loaded: true, load: vi.fn() });
        const environments = [{ id: 'e1', name: '开发环境' }] as never;

        const context = await createAutomationCapabilityContext({
            environments,
            selectedEnvironmentId: 'e1',
        });

        expect(mocks.loadAutomationEnvironments).not.toHaveBeenCalled();
        expect(context.environments).toBe(environments);
        expect(context.selectedEnvironmentId).toBe('e1');
    });
});
