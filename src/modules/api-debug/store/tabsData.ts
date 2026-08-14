import type {
    TabData,
    ProjectData,
    PersistedWorkspace,
    ProjectFileData,
    AppSettings,
    PersistedProjectRecord,
} from '../types/workspace';
import {
    createDefaultWorkspace,
    createEmptyProject,
    createEmptyCase,
} from '../constants/workspace';
import { PROJECT_FILE, SETTINGS_FILE } from '@/config/files';
import { sortCasesByMsgtype, resolveCaseIndexById } from '../utils/workspace/caseLabel';
import { sanitizeOpenCaseIds } from '../utils/workspace/openCaseTabs';
import { normalizeParamList } from '../utils/workspace/paramItem';
import { resolveCaseScript } from '../utils/script/apiScript';
import type { ConfigStorageFileName } from '@/shared/config/files';
import { UI_DEBOUNCE_MS } from '../../../constants/ui';
import { getElectronAPI } from '../../../lib/electron';
const SAVE_DEBOUNCE_MS = UI_DEBOUNCE_MS.save;

const defaultSettings = (): AppSettings => ({
    activeProjectIndex: 0,
    activeCaseIndex: 0,
    expandedProjectIds: [],
    openCaseIds: [],
});

let projectSaveTimer: ReturnType<typeof setTimeout> | null = null;
let settingsSaveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingProjects: ProjectData[] | null = null;
let pendingSettingsData: AppSettings | null = null;

function isParamItem(value: unknown): value is TabData['params'][number] {
    if (!value || typeof value !== 'object') return false;
    const item = value as TabData['params'][number];
    return (
        typeof item.name === 'string' &&
        typeof item.value === 'string' &&
        typeof item.type === 'string'
    );
}

function isPersistedCaseRecord(
    value: unknown,
): value is ProjectFileData['projects'][number]['cases'][number] {
    if (!value || typeof value !== 'object') return false;
    const item = value as ProjectFileData['projects'][number]['cases'][number];
    return (
        (item.name === undefined || typeof item.name === 'string') &&
        typeof item.address === 'string' &&
        Array.isArray(item.params) &&
        item.params.every(isParamItem)
    );
}

function isPersistedProjectRecord(value: unknown): value is PersistedProjectRecord {
    if (!value || typeof value !== 'object') return false;
    const project = value as PersistedProjectRecord;
    return (
        (project.id === undefined || typeof project.id === 'string') &&
        typeof project.name === 'string' &&
        Array.isArray(project.cases) &&
        project.cases.every(isPersistedCaseRecord)
    );
}

function isProjectFileData(value: unknown): value is ProjectFileData {
    if (!value || typeof value !== 'object') return false;
    const data = value as ProjectFileData;
    return Array.isArray(data.projects) && data.projects.every(isPersistedProjectRecord);
}

function isLegacyAppSettings(value: unknown): value is AppSettings & { preferences?: unknown } {
    if (!value || typeof value !== 'object') return false;
    const settings = value as AppSettings & { preferences?: unknown };
    return (
        typeof settings.activeProjectIndex === 'number' &&
        typeof settings.activeCaseIndex === 'number' &&
        Array.isArray(settings.expandedProjectIds)
    );
}

function toProjectFileData(projects: ProjectData[]): ProjectFileData {
    return {
        projects: projects.map((project) => ({
            id: project.id,
            name: project.name,
            cases: project.cases.map((item) => ({
                name: item.name,
                address: item.address,
                params: normalizeParamList(item.params.map((param) => ({ ...param }))),
                script: item.script,
                runInput: item.runInput,
                favorite: item.favorite ?? false,
            })),
        })),
    };
}

function toAppSettings(
    workspace: Pick<
        PersistedWorkspace,
        'activeProjectIndex' | 'activeCaseIndex' | 'expandedProjectIds' | 'openCaseIds'
    >,
): AppSettings {
    return {
        activeProjectIndex: workspace.activeProjectIndex,
        activeCaseIndex: workspace.activeCaseIndex,
        expandedProjectIds: [...workspace.expandedProjectIds],
        openCaseIds: [...workspace.openCaseIds],
    };
}

function hydrateProjectsFromFile(data: ProjectFileData): ProjectData[] {
    const now = Date.now();
    return data.projects.map((project, projectIndex) => ({
        id: project.id || `${now}-project-${projectIndex}`,
        name: project.name.trim() || `\u9879\u76ee ${projectIndex + 1}`,
        createdAt: now,
        updatedAt: now,
        cases: project.cases.map((item, caseIndex) => {
            const msgtype = item.address.split('/')[1]?.split('?')[0]?.trim() ?? '';
            return {
                id: `${now}-case-${projectIndex}-${caseIndex}`,
                name: item.name?.trim() || `\u63a5\u53e3 ${caseIndex + 1}`,
                protocol: 'KCBP',
                address: item.address,
                params: normalizeParamList(item.params.map((param) => ({ ...param }))),
                script: resolveCaseScript(
                    {
                        script: item.script,
                        requestScript: item.requestScript,
                        responseScript: item.responseScript,
                        params: item.params,
                        address: item.address,
                        name: item.name?.trim() || `\u63a5\u53e3 ${caseIndex + 1}`,
                    },
                    msgtype,
                ),
                runInput: item.runInput,
                requestScript: item.requestScript,
                responseScript: item.responseScript,
                favorite: item.favorite ?? false,
                createdAt: now,
                updatedAt: now,
            };
        }),
    }));
}

async function readJson(fileName: ConfigStorageFileName, fromUserData = false): Promise<unknown> {
    const api = getElectronAPI();
    if (!api) return null;
    try {
        return await api.config.read(fileName, fromUserData);
    } catch {
        return null;
    }
}

export async function loadWorkspace(): Promise<PersistedWorkspace | null> {
    if (!getElectronAPI()) return null;

    const projectResult = await readJson(PROJECT_FILE, false);
    const settingsResult = await readJson(SETTINGS_FILE, false);

    if (!isProjectFileData(projectResult)) {
        return null;
    }

    const settings = isLegacyAppSettings(settingsResult) ? settingsResult : defaultSettings();
    const workspace: PersistedWorkspace = {
        projects: hydrateProjectsFromFile(projectResult),
        activeProjectIndex: settings.activeProjectIndex,
        activeCaseIndex: settings.activeCaseIndex,
        expandedProjectIds: settings.expandedProjectIds,
        openCaseIds: settings.openCaseIds ?? [],
    };

    return {
        ...workspace,
        openCaseIds: sanitizeOpenCaseIds(
            workspace.projects,
            workspace.openCaseIds,
            workspace.activeProjectIndex,
            workspace.activeCaseIndex,
        ),
    };
}

function scheduleProjectSave(projects: ProjectData[]): void {
    pendingProjects = projects;
    if (projectSaveTimer) clearTimeout(projectSaveTimer);
    projectSaveTimer = setTimeout(() => {
        const api = getElectronAPI();
        if (pendingProjects && api) {
            api.config.write(PROJECT_FILE, toProjectFileData(pendingProjects)).catch(console.error);
        }
        pendingProjects = null;
        projectSaveTimer = null;
    }, SAVE_DEBOUNCE_MS);
}

function scheduleSettingsSave(data: AppSettings): void {
    pendingSettingsData = data;
    if (settingsSaveTimer) clearTimeout(settingsSaveTimer);
    settingsSaveTimer = setTimeout(() => {
        const api = getElectronAPI();
        if (pendingSettingsData && api) {
            api.config.write(SETTINGS_FILE, pendingSettingsData).catch(console.error);
        }
        pendingSettingsData = null;
        settingsSaveTimer = null;
    }, SAVE_DEBOUNCE_MS);
}

export function saveProjects(projects: ProjectData[]): void {
    scheduleProjectSave(projects);
}

export function hashPersistedProjects(projects: ProjectData[]): string {
    return JSON.stringify(toProjectFileData(projects));
}

function flushProjectSaveSync(): void {
    if (projectSaveTimer) {
        clearTimeout(projectSaveTimer);
        projectSaveTimer = null;
    }
    const api = getElectronAPI();
    if (pendingProjects && api) {
        void api.config.write(PROJECT_FILE, toProjectFileData(pendingProjects));
        pendingProjects = null;
    }
}

function flushSettingsSaveSync(): void {
    if (settingsSaveTimer) {
        clearTimeout(settingsSaveTimer);
        settingsSaveTimer = null;
    }
    const api = getElectronAPI();
    if (pendingSettingsData && api) {
        void api.config.write(SETTINGS_FILE, pendingSettingsData);
        pendingSettingsData = null;
    }
}

export function flushPendingSaves(): void {
    flushProjectSaveSync();
    flushSettingsSaveSync();
}

export async function flushPendingSavesAsync(): Promise<void> {
    if (projectSaveTimer) {
        clearTimeout(projectSaveTimer);
        projectSaveTimer = null;
    }
    if (settingsSaveTimer) {
        clearTimeout(settingsSaveTimer);
        settingsSaveTimer = null;
    }

    const api = getElectronAPI();
    const pendingProjectsData = pendingProjects ? toProjectFileData(pendingProjects) : null;
    const pendingSettings = pendingSettingsData;
    if (api) {
        if (pendingProjectsData) {
            await api.config.write(PROJECT_FILE, pendingProjectsData);
        }
        if (pendingSettings) {
            await api.config.write(SETTINGS_FILE, pendingSettings);
        }
    }
    pendingProjects = null;
    pendingSettingsData = null;
}

export function saveSettings(settings: AppSettings): void {
    scheduleSettingsSave(settings);
}

export function persistWorkspace(workspace: PersistedWorkspace): void {
    saveProjects(workspace.projects);
    saveSettings(toAppSettings(workspace));
}

export function saveWorkspace(workspace: PersistedWorkspace): void {
    persistWorkspace(workspace);
}

export function normalizeWorkspace(workspace: PersistedWorkspace): PersistedWorkspace {
    if (workspace.projects.length === 0) {
        const project = createEmptyProject(1);
        return {
            projects: [project],
            activeProjectIndex: 0,
            activeCaseIndex: 0,
            expandedProjectIds: [project.id],
            openCaseIds: [project.cases[0].id],
        };
    }

    const activeProjectIndex = Math.min(
        Math.max(workspace.activeProjectIndex, 0),
        workspace.projects.length - 1,
    );
    const sourceActiveProject = workspace.projects[activeProjectIndex];
    const activeCaseId = sourceActiveProject.cases[workspace.activeCaseIndex]?.id;

    const projects = workspace.projects.map((project) => {
        const cases =
            project.cases.length > 0 ? sortCasesByMsgtype(project.cases) : [createEmptyCase(1)];
        if (project.cases.length === 0) {
            return {
                ...project,
                cases,
                updatedAt: Date.now(),
            };
        }
        return {
            ...project,
            cases,
        };
    });

    const activeProject = projects[activeProjectIndex];
    const activeCaseIndex = activeCaseId
        ? resolveCaseIndexById(activeProject.cases, activeCaseId)
        : Math.min(Math.max(workspace.activeCaseIndex, 0), activeProject.cases.length - 1);

    const projectIds = new Set(projects.map((project) => project.id));
    const expandedProjectIds = workspace.expandedProjectIds.filter((id) => projectIds.has(id));
    if (!expandedProjectIds.includes(activeProject.id)) {
        expandedProjectIds.push(activeProject.id);
    }

    return {
        ...workspace,
        projects,
        activeProjectIndex,
        activeCaseIndex,
        expandedProjectIds,
        openCaseIds: sanitizeOpenCaseIds(
            projects,
            workspace.openCaseIds,
            activeProjectIndex,
            activeCaseIndex,
        ),
    };
}

export const createInitialWorkspace = (): PersistedWorkspace => createDefaultWorkspace();
