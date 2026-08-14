import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmptyProject } from '../constants/workspace';
import {
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
                read: vi.fn(async (fileName: string) => files[fileName] ?? null),
                write: vi.fn(async () => undefined),
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
    it('loads workspace from project.json and settings.json', async () => {
        stubElectronApi({
            'project.json': {
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
            'settings.json': {
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

    it('falls back to default settings when settings.json is invalid', async () => {
        stubElectronApi({
            'project.json': {
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
            'settings.json': null,
        });

        const workspace = await loadWorkspace();

        expect(workspace).not.toBeNull();
        expect(workspace?.activeProjectIndex).toBe(0);
        expect(workspace?.activeCaseIndex).toBe(0);
        expect(workspace?.expandedProjectIds).toEqual([]);
        expect(workspace?.openCaseIds).toEqual([workspace?.projects[0].cases[0].id]);
    });
});
