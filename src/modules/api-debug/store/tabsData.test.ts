import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmptyProject } from '../constants/workspace';
import {
    applyTabDraftsToWorkspace,
    createInitialWorkspace,
    flushPendingSaves,
    hashPersistedProjects,
    loadWorkspace,
    normalizeWorkspace,
} from './tabsData';

afterEach(() => {
    flushPendingSaves();
    vi.unstubAllGlobals();
});

function stubElectronApi(files: Record<string, unknown>) {
    vi.stubGlobal('window', {
        electronAPI: {
            config: {
                readProjects: vi.fn(async () => files.projects ?? null),
                writeProjects: vi.fn(async () => undefined),
                readWorkspace: vi.fn(async () => files.workspace ?? null),
                writeWorkspace: vi.fn(async () => undefined),
            },
        },
    });
}

describe('normalizeWorkspace', () => {
    it('creates a default project when projects list is empty', () => {
        const workspace = normalizeWorkspace({
            ...createInitialWorkspace(),
            projects: [],
        });

        expect(workspace.projects).toHaveLength(1);
        expect(workspace.activeProjectIndex).toBe(0);
        expect(workspace.activeCaseIndex).toBe(0);
        expect(workspace.expandedProjectIds).toContain(workspace.projects[0].id);
        expect(workspace.openCaseIds).toContain(workspace.projects[0].cases[0].id);
    });

    it('clamps activeProjectIndex to valid range', () => {
        const project = createEmptyProject(1);
        const workspace = normalizeWorkspace({
            projects: [project],
            activeProjectIndex: 99,
            activeCaseIndex: 0,
            expandedProjectIds: [],
            openCaseIds: [],
        });

        expect(workspace.activeProjectIndex).toBe(0);
    });

    it('adds an empty case when a project has no cases', () => {
        const project = { ...createEmptyProject(1), cases: [] };
        const workspace = normalizeWorkspace({
            projects: [project],
            activeProjectIndex: 0,
            activeCaseIndex: 0,
            expandedProjectIds: [project.id],
            openCaseIds: [],
        });

        expect(workspace.projects[0].cases).toHaveLength(1);
        expect(workspace.activeCaseIndex).toBe(0);
    });
});

describe('hashPersistedProjects', () => {
    it('ignores in-memory timestamps when hashing', () => {
        const project = createEmptyProject(1);
        const baseline = hashPersistedProjects([project]);

        const mutated = [
            {
                ...project,
                updatedAt: project.updatedAt + 10_000,
                cases: project.cases.map((item) => ({
                    ...item,
                    updatedAt: item.updatedAt + 10_000,
                })),
            },
        ];

        expect(hashPersistedProjects(mutated)).toBe(baseline);
    });

    it('changes hash when persisted fields change', () => {
        const project = createEmptyProject(1);
        const baseline = hashPersistedProjects([project]);

        const renamed = [
            {
                ...project,
                cases: project.cases.map((item) => ({ ...item, name: 'Renamed case' })),
            },
        ];

        expect(hashPersistedProjects(renamed)).not.toBe(baseline);
    });

    it('changes hash when favorite toggles', () => {
        const project = createEmptyProject(1);
        const baseline = hashPersistedProjects([project]);

        const favorited = [
            {
                ...project,
                cases: project.cases.map((item) => ({ ...item, favorite: true })),
            },
        ];

        expect(hashPersistedProjects(favorited)).not.toBe(baseline);
    });
});

describe('applyTabDraftsToWorkspace', () => {
    it('applies draft address, params and script to the active case', () => {
        const workspace = normalizeWorkspace({
            ...createInitialWorkspace(),
            projects: [createEmptyProject(1)],
            activeProjectIndex: 0,
            activeCaseIndex: 0,
        });
        const next = applyTabDraftsToWorkspace(workspace, {
            address: '127.0.0.1:21000/999999',
            params: [{ name: 'market', value: '2', type: 'string' }],
            script: 'async function main() { return test.pass(); }',
        });

        expect(next.projects[0].cases[0]).toMatchObject({
            address: '127.0.0.1:21000/999999',
            params: [{ name: 'market', value: '2', type: 'string' }],
            script: 'async function main() { return test.pass(); }',
        });
    });

    it('returns the same workspace when there are no draft fields', () => {
        const workspace = normalizeWorkspace(createInitialWorkspace());

        expect(applyTabDraftsToWorkspace(workspace, {})).toBe(workspace);
    });
});

describe('normalizeWorkspace openCaseIds', () => {
    it('keeps active case open and drops unknown ids', () => {
        const project = createEmptyProject(1);
        const activeCaseId = project.cases[0].id;
        const workspace = normalizeWorkspace({
            projects: [project],
            activeProjectIndex: 0,
            activeCaseIndex: 0,
            expandedProjectIds: [project.id],
            openCaseIds: ['missing-id', activeCaseId],
        });

        expect(workspace.openCaseIds).toContain(activeCaseId);
        expect(workspace.openCaseIds).not.toContain('missing-id');
    });
});

describe('loadWorkspace', () => {
    it('loads workspace from semantic project and workspace storage', async () => {
        stubElectronApi({
            projects: {
                projects: [
                    {
                        id: 'project-1',
                        name: 'Project 1',
                        cases: [
                            {
                                name: 'Case 1',
                                address: '127.0.0.1:21000/150501',
                                params: [],
                                favorite: true,
                            },
                            {
                                name: 'Case 2',
                                address: '127.0.0.1:21000/150502',
                                params: [],
                            },
                        ],
                    },
                ],
            },
            workspace: {
                activeProjectIndex: 0,
                activeCaseIndex: 1,
                expandedProjectIds: ['project-1'],
                openCaseIds: ['missing-case-id'],
            },
        });

        const workspace = await loadWorkspace();

        expect(workspace).not.toBeNull();
        expect(workspace?.projects).toHaveLength(1);
        expect(workspace?.activeProjectIndex).toBe(0);
        expect(workspace?.activeCaseIndex).toBe(1);
        expect(workspace?.expandedProjectIds).toEqual(['project-1']);
        expect(workspace?.projects[0].cases[0].favorite).toBe(true);
        expect(workspace?.openCaseIds).toEqual([workspace?.projects[0].cases[1].id]);
    });

    it('falls back to default settings when workspace storage is invalid', async () => {
        stubElectronApi({
            projects: {
                projects: [
                    {
                        name: 'Project 1',
                        cases: [
                            {
                                address: '127.0.0.1:21000/150501',
                                params: [],
                            },
                        ],
                    },
                ],
            },
            workspace: null,
        });

        const workspace = await loadWorkspace();

        expect(workspace).not.toBeNull();
        expect(workspace?.activeProjectIndex).toBe(0);
        expect(workspace?.activeCaseIndex).toBe(0);
        expect(workspace?.expandedProjectIds).toEqual([]);
        expect(workspace?.openCaseIds).toEqual([workspace?.projects[0].cases[0].id]);
    });
});
