import type { AutomationScenario, AutomationWorkspace } from '@/shared/automation/types';
import { AUTOMATION_WORKSPACE_CHANGED_EVENT } from '@/shared/automation/events';
import { automationRuntime } from '@/runtime/automationFacade';

interface ApiCaseSnapshot {
    name: string;
    address: string;
    protocol: string;
    params: Array<{ name: string; value: string; type: string }>;
}

function msgtypeOf(address: string): string {
    return address.split('/')[1]?.split('?')[0]?.trim() ?? '';
}

function createScript(item: ApiCaseSnapshot): string {
    const fields = Object.fromEntries(
        item.params
            .filter((param) => param.type !== 'disabled' && param.name.trim())
            .map((param) => [param.name, param.value]),
    );
    const protocol = item.protocol.replace(/[\r\n]/g, ' ');
    return `// 来源协议: ${protocol}
scenario(
    { inputs: {} },
    async (t) => {
        const response = await t.step('调用 ${msgtypeOf(item.address)}', () =>
            t.api.call(${JSON.stringify(msgtypeOf(item.address))}, ${JSON.stringify(fields, null, 12)}),
        );

        t.expect(response, '接口返回成功').businessOk();
    },
);
`;
}

function appendScenario(
    workspace: AutomationWorkspace,
    item: ApiCaseSnapshot,
): AutomationWorkspace {
    const stamp = Date.now();
    const project = workspace.projects[0] ?? {
        id: `automation-project-${crypto.randomUUID()}`,
        name: '自动化项目',
        position: 0,
        createdAt: stamp,
        updatedAt: stamp,
    };
    const folder = workspace.folders.find((entry) => entry.projectId === project.id) ?? {
        id: `automation-folder-${crypto.randomUUID()}`,
        projectId: project.id,
        name: '从 API 调试生成',
        position: 0,
        createdAt: stamp,
        updatedAt: stamp,
    };
    const scenario: AutomationScenario = {
        id: `automation-scenario-${crypto.randomUUID()}`,
        projectId: project.id,
        folderId: folder.id,
        name: item.name || msgtypeOf(item.address) || '生成的自动化场景',
        script: createScript(item),
        enabled: true,
        position: workspace.scenarios.filter((entry) => entry.folderId === folder.id).length,
        createdAt: stamp,
        updatedAt: stamp,
    };
    return {
        projects: workspace.projects.length ? workspace.projects : [project],
        folders: workspace.folders.some((entry) => entry.id === folder.id)
            ? workspace.folders
            : [...workspace.folders, folder],
        scenarios: [...workspace.scenarios, scenario],
    };
}

export async function generateAutomationScenario(item: ApiCaseSnapshot): Promise<void> {
    if (!msgtypeOf(item.address)) throw new Error('当前接口地址缺少 Msgtype');
    const snapshot = await automationRuntime.load();
    const workspace = appendScenario(snapshot.workspace, item);
    await automationRuntime.saveWorkspace(workspace);
    window.dispatchEvent(
        new CustomEvent(AUTOMATION_WORKSPACE_CHANGED_EVENT, { detail: workspace }),
    );
}
