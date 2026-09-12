import { create } from 'zustand';
import type {
    AutomationFolderRunReport,
    AutomationRunReport,
    AutomationScenario,
    AutomationWorkspace,
} from '@/shared/automation/types';
import { DEFAULT_AUTOMATION_SCRIPT } from '../constants';
import { loadAutomationData, saveAutomationWorkspace } from '../services/automationData';

const now = () => Date.now();
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

function initialWorkspace(): AutomationWorkspace {
    const stamp = now();
    const projectId = id('automation-project');
    const folderId = id('automation-folder');
    return {
        projects: [
            { id: projectId, name: '自动化项目', position: 0, createdAt: stamp, updatedAt: stamp },
        ],
        folders: [
            {
                id: folderId,
                projectId,
                name: '基础场景',
                position: 0,
                createdAt: stamp,
                updatedAt: stamp,
            },
        ],
        scenarios: [
            {
                id: id('automation-scenario'),
                projectId,
                folderId,
                name: '新建场景',
                script: DEFAULT_AUTOMATION_SCRIPT,
                position: 0,
                enabled: true,
                createdAt: stamp,
                updatedAt: stamp,
            },
        ],
    };
}

interface AutomationState {
    loaded: boolean;
    workspace: AutomationWorkspace;
    scenarioReports: Record<string, AutomationRunReport>;
    folderReports: Record<string, AutomationFolderRunReport>;
    selectedScenarioId?: string;
    replaceWorkspace(workspace: AutomationWorkspace): void;
    load(): Promise<void>;
    addProject(): void;
    addFolder(projectId: string, parentId?: string): void;
    addScenario(projectId: string, folderId?: string): void;
    updateProject(id: string, name: string): void;
    updateFolder(id: string, name: string): void;
    updateScenario(id: string, patch: Partial<AutomationScenario>): void;
    removeProject(id: string): void;
    removeFolder(id: string): void;
    removeScenario(id: string): void;
    selectScenario(id: string): void;
    setScenarioReport(report: AutomationRunReport): void;
    setFolderReport(report: AutomationFolderRunReport): void;
}
type SetState = (
    state: Partial<AutomationState> | ((state: AutomationState) => Partial<AutomationState>),
) => void;
type GetState = () => AutomationState;

function persist(set: SetState, workspace: AutomationWorkspace) {
    set({ workspace });
    saveAutomationWorkspace(workspace);
}

function createAddActions(set: SetState, get: GetState) {
    return {
        addProject() {
            const workspace = get().workspace;
            const stamp = now();
            persist(set, {
                ...workspace,
                projects: [
                    ...workspace.projects,
                    {
                        id: id('automation-project'),
                        name: `自动化项目 ${workspace.projects.length + 1}`,
                        position: workspace.projects.length,
                        createdAt: stamp,
                        updatedAt: stamp,
                    },
                ],
            });
        },
        addFolder(projectId: string, parentId?: string) {
            const workspace = get().workspace;
            const stamp = now();
            const position = workspace.folders.filter(
                (item) => item.projectId === projectId && item.parentId === parentId,
            ).length;
            persist(set, {
                ...workspace,
                folders: [
                    ...workspace.folders,
                    {
                        id: id('automation-folder'),
                        projectId,
                        parentId,
                        name: `场景目录 ${position + 1}`,
                        position,
                        createdAt: stamp,
                        updatedAt: stamp,
                    },
                ],
            });
        },
        addScenario(projectId: string, folderId?: string) {
            const workspace = get().workspace;
            const stamp = now();
            const position = workspace.scenarios.filter(
                (item) => item.projectId === projectId && item.folderId === folderId,
            ).length;
            const scenario = {
                id: id('automation-scenario'),
                projectId,
                folderId,
                name: `自动化场景 ${position + 1}`,
                script: DEFAULT_AUTOMATION_SCRIPT,
                position,
                enabled: true,
                createdAt: stamp,
                updatedAt: stamp,
            };
            persist(set, { ...workspace, scenarios: [...workspace.scenarios, scenario] });
            set({ selectedScenarioId: scenario.id });
        },
    };
}

function createUpdateActions(set: SetState, get: GetState) {
    return {
        updateProject(projectId: string, name: string) {
            const workspace = get().workspace;
            persist(set, {
                ...workspace,
                projects: workspace.projects.map((item) =>
                    item.id === projectId ? { ...item, name, updatedAt: now() } : item,
                ),
            });
        },
        updateFolder(folderId: string, name: string) {
            const workspace = get().workspace;
            persist(set, {
                ...workspace,
                folders: workspace.folders.map((item) =>
                    item.id === folderId ? { ...item, name, updatedAt: now() } : item,
                ),
            });
        },
        updateScenario(scenarioId: string, patch: Partial<AutomationScenario>) {
            const workspace = get().workspace;
            persist(set, {
                ...workspace,
                scenarios: workspace.scenarios.map((item) =>
                    item.id === scenarioId ? { ...item, ...patch, updatedAt: now() } : item,
                ),
            });
        },
    };
}

function descendantFolderIds(workspace: AutomationWorkspace, folderId: string): Set<string> {
    const result = new Set([folderId]);
    let changed = true;
    while (changed) {
        changed = false;
        for (const folder of workspace.folders)
            if (folder.parentId && result.has(folder.parentId) && !result.has(folder.id)) {
                result.add(folder.id);
                changed = true;
            }
    }
    return result;
}

function createRemoveActions(set: SetState, get: GetState) {
    const selectFirst = (workspace: AutomationWorkspace) =>
        set({ selectedScenarioId: workspace.scenarios[0]?.id });
    return {
        removeProject(projectId: string) {
            const workspace = get().workspace;
            const scenarioIds = new Set(
                workspace.scenarios
                    .filter((item) => item.projectId === projectId)
                    .map((item) => item.id),
            );
            const next = {
                projects: workspace.projects.filter((item) => item.id !== projectId),
                folders: workspace.folders.filter((item) => item.projectId !== projectId),
                scenarios: workspace.scenarios.filter((item) => !scenarioIds.has(item.id)),
            };
            persist(set, next);
            if (get().selectedScenarioId && scenarioIds.has(get().selectedScenarioId!))
                selectFirst(next);
        },
        removeFolder(folderId: string) {
            const workspace = get().workspace;
            const removing = descendantFolderIds(workspace, folderId);
            const next = {
                ...workspace,
                folders: workspace.folders.filter((item) => !removing.has(item.id)),
                scenarios: workspace.scenarios.filter(
                    (item) => !item.folderId || !removing.has(item.folderId),
                ),
            };
            persist(set, next);
            if (!next.scenarios.some((item) => item.id === get().selectedScenarioId))
                selectFirst(next);
        },
        removeScenario(scenarioId: string) {
            const workspace = get().workspace;
            const next = {
                ...workspace,
                scenarios: workspace.scenarios.filter((item) => item.id !== scenarioId),
            };
            persist(set, next);
            if (get().selectedScenarioId === scenarioId) selectFirst(next);
        },
    };
}

export const useAutomationStore = create<AutomationState>((set, get) => ({
    loaded: false,
    workspace: { projects: [], folders: [], scenarios: [] },
    scenarioReports: {},
    folderReports: {},
    replaceWorkspace: (workspace) =>
        set({ workspace, selectedScenarioId: workspace.scenarios.at(-1)?.id }),
    async load() {
        const loaded = await loadAutomationData();
        const workspace = loaded.workspace.projects.length ? loaded.workspace : initialWorkspace();
        set({
            loaded: true,
            workspace,
            scenarioReports: loaded.scenarioReports,
            folderReports: loaded.folderReports,
            selectedScenarioId: workspace.scenarios[0]?.id,
        });
        if (!loaded.workspace.projects.length) saveAutomationWorkspace(workspace);
    },
    ...createAddActions(set, get),
    ...createUpdateActions(set, get),
    ...createRemoveActions(set, get),
    selectScenario: (selectedScenarioId) => set({ selectedScenarioId }),
    setScenarioReport: (report) =>
        set((state) => ({
            scenarioReports: { ...state.scenarioReports, [report.scenarioId]: report },
        })),
    setFolderReport: (report) =>
        set((state) => ({ folderReports: { ...state.folderReports, [report.folderId]: report } })),
}));
