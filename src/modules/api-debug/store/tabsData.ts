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
import type { TabDraftSnapshot } from '../utils/workspace/tabDraftRegistry';
import type { ConfigStorageFileName } from '@/shared/config/files';
import { UI_DEBOUNCE_MS } from '../../../constants/ui';
import { configStorage } from '../../../services/persistence/configStorage';
import { DebounceWriter } from '../../../services/persistence/debounceWriter';
const SAVE_DEBOUNCE_MS = UI_DEBOUNCE_MS.save;

const projectWriter = new DebounceWriter<ProjectData[]>({
    write: (projects) => configStorage.write(PROJECT_FILE, toProjectFileData(projects)),
    delayMs: SAVE_DEBOUNCE_MS,
    onError: console.error,
});

const settingsWriter = new DebounceWriter<AppSettings>({
    write: (settings) => configStorage.write(SETTINGS_FILE, settings),
    delayMs: SAVE_DEBOUNCE_MS,
    onError: console.error,
});

const defaultSettings = (): AppSettings => ({
    activeProjectIndex: 0,
    activeCaseIndex: 0,
    expandedProjectIds: [],
    openCaseIds: [],
});

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
        (project.commonParamSetId === undefined || typeof project.commonParamSetId === 'string') &&
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
            ...(project.folders?.length ? { folders: project.folders } : {}),
            ...(project.commonParamSetId ? { commonParamSetId: project.commonParamSetId } : {}),
            cases: project.cases.map((item) => ({
                id: item.id,
                ...(item.folderId ? { folderId: item.folderId } : {}),
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
        ...(project.commonParamSetId ? { commonParamSetId: project.commonParamSetId } : {}),
        createdAt: now,
        updatedAt: now,
        folders: project.folders ?? [],
        cases: project.cases.map((item, caseIndex) => {
            const msgtype = item.address.split('/')[1]?.split('?')[0]?.trim() ?? '';
            return {
                id: `${now}-case-${projectIndex}-${caseIndex}`,
                ...(item.folderId ? { folderId: item.folderId } : {}),
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

async function readJson(fileName: ConfigStorageFileName): Promise<unknown> {
    return configStorage.read(fileName);
}

export async function loadWorkspace(): Promise<PersistedWorkspace | null> {
    const projectResult = await readJson(PROJECT_FILE);
    const settingsResult = await readJson(SETTINGS_FILE);

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
    projectWriter.schedule(projects);
}

function scheduleSettingsSave(data: AppSettings): void {
    settingsWriter.schedule(data);
}

export function saveProjects(projects: ProjectData[]): void {
    scheduleProjectSave(projects);
}

export function hashPersistedProjects(projects: ProjectData[]): string {
    return JSON.stringify(toProjectFileData(projects));
}

export function applyTabDraftsToWorkspace(
    workspace: PersistedWorkspace,
    drafts: TabDraftSnapshot,
): PersistedWorkspace {
    const hasDrafts =
        drafts.address !== undefined || drafts.params !== undefined || drafts.script !== undefined;
    if (!hasDrafts) return workspace;

    return {
        ...workspace,
        projects: workspace.projects.map((project, projectIndex) => {
            if (projectIndex !== workspace.activeProjectIndex) return project;
            return {
                ...project,
                cases: project.cases.map((item, caseIndex) => {
                    if (caseIndex !== workspace.activeCaseIndex) return item;
                    return {
                        ...item,
                        ...(drafts.address !== undefined ? { address: drafts.address } : {}),
                        ...(drafts.params !== undefined ? { params: drafts.params } : {}),
                        ...(drafts.script !== undefined ? { script: drafts.script } : {}),
                        updatedAt: Date.now(),
                    };
                }),
            };
        }),
    };
}

function flushProjectSaveSync(): void {
    void projectWriter.flush();
}

function flushSettingsSaveSync(): void {
    void settingsWriter.flush();
}

export function flushPendingSaves(): void {
    flushProjectSaveSync();
    flushSettingsSaveSync();
}

export async function flushPendingSavesAsync(): Promise<void> {
    await Promise.all([projectWriter.flush(), settingsWriter.flush()]);
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
