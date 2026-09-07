import { describe, expect, it } from 'vitest';
import { createEmptyCase, createEmptyProject } from '../constants/workspace';
import { createInitialTabsState, tabsReducer } from './tabsReducer';

function withLoadedState() {
    return { ...createInitialTabsState(), loaded: true };
}

describe('tabsReducer', () => {
    it('supports nested folders and moves cases back to the root when a folder is deleted', () => {
        const project = createEmptyProject(1);
        const state = {
            ...withLoadedState(),
            projects: [project],
            activeProjectIndex: 0,
            activeCaseIndex: 0,
            expandedProjectIds: [project.id],
            openCaseIds: [project.cases[0].id],
        };

        const withParent = tabsReducer(state, {
            type: 'ADD_FOLDER',
            projectIndex: 0,
            name: '接口目录',
        });
        const parent = withParent.projects[0].folders?.[0];
        expect(parent?.name).toBe('接口目录');

        const withChild = tabsReducer(withParent, {
            type: 'ADD_FOLDER',
            projectIndex: 0,
            parentId: parent?.id,
            name: '行情接口',
        });
        const child = withChild.projects[0].folders?.[1];
        expect(child?.parentId).toBe(parent?.id);

        const withCase = tabsReducer(withChild, {
            type: 'ADD_CASE',
            projectIndex: 0,
            folderId: child?.id,
        });
        const createdCase = withCase.projects[0].cases.find(
            (caseItem) => caseItem.folderId === child?.id,
        );
        expect(createdCase).toBeDefined();

        const moved = tabsReducer(withCase, {
            type: 'MOVE_CASE_TO_FOLDER',
            projectIndex: 0,
            caseId: project.cases[0].id,
            folderId: child?.id,
        });
        expect(moved.projects[0].cases[0].folderId).toBe(child?.id);

        const deleted = tabsReducer(moved, {
            type: 'DELETE_FOLDER',
            projectIndex: 0,
            folderId: parent?.id ?? '',
        });
        expect(deleted.projects[0].folders).toEqual([]);
        expect(deleted.projects[0].cases[0].folderId).toBeUndefined();
    });

    it('ADD_PROJECT selects the new project and expands it', () => {
        const state = withLoadedState();
        const next = tabsReducer(state, { type: 'ADD_PROJECT' });

        expect(next.projects).toHaveLength(state.projects.length + 1);
        expect(next.activeProjectIndex).toBe(state.projects.length);
        expect(next.activeCaseIndex).toBe(0);
        expect(next.expandedProjectIds).toContain(next.projects[next.activeProjectIndex].id);
    });

    it('DELETE_PROJECT recreates a default project when deleting the last one', () => {
        const project = createEmptyProject(1);
        const state = {
            ...withLoadedState(),
            projects: [project],
            activeProjectIndex: 0,
            activeCaseIndex: 0,
            expandedProjectIds: [project.id],
            openCaseIds: [project.cases[0].id],
        };

        const next = tabsReducer(state, { type: 'DELETE_PROJECT', projectIndex: 0 });

        expect(next.projects).toHaveLength(1);
        expect(next.projects[0].id).not.toBe(project.id);
        expect(next.activeProjectIndex).toBe(0);
    });

    it('SELECT_CASE opens the tab and expands the project', () => {
        const project = createEmptyProject(1);
        const extraCase = createEmptyCase(2);
        const projects = [{ ...project, cases: [...project.cases, extraCase] }];
        const state = {
            ...withLoadedState(),
            projects,
            activeProjectIndex: 0,
            activeCaseIndex: 0,
            expandedProjectIds: [],
            openCaseIds: [project.cases[0].id],
        };

        const next = tabsReducer(state, { type: 'SELECT_CASE', projectIndex: 0, caseIndex: 1 });

        expect(next.activeCaseIndex).toBe(1);
        expect(next.openCaseIds).toContain(extraCase.id);
        expect(next.expandedProjectIds).toContain(project.id);
    });

    it('DUPLICATE_CASE clones params and selects the copied case', () => {
        const project = createEmptyProject(1);
        const source = {
            ...project.cases[0],
            address: '127.0.0.1:21000/150501',
            params: [{ name: 'market', value: '1', type: 'string' as const }],
        };
        const second = {
            ...createEmptyCase(2),
            address: '127.0.0.1:21000/150502',
        };
        const projects = [{ ...project, cases: [source, second] }];
        const state = {
            ...withLoadedState(),
            projects,
            activeProjectIndex: 0,
            activeCaseIndex: 0,
            expandedProjectIds: [project.id],
            openCaseIds: [source.id, second.id],
        };

        const next = tabsReducer(state, {
            type: 'DUPLICATE_CASE',
            projectIndex: 0,
            caseIndex: 0,
        });

        expect(next.projects[0].cases).toHaveLength(3);
        const copy = next.projects[0].cases.find(
            (item) => item.address === source.address && item.id !== source.id,
        );
        expect(copy).toBeDefined();
        expect(copy?.params).toEqual(source.params);
        expect(next.activeCaseIndex).toBe(
            next.projects[0].cases.findIndex((item) => item.id === copy?.id),
        );
    });

    it('DELETE_CASE adjusts the active index after deleting an earlier case', () => {
        const project = createEmptyProject(1);
        const first = {
            ...project.cases[0],
            address: '127.0.0.1:21000/150501',
        };
        const second = {
            ...createEmptyCase(2),
            address: '127.0.0.1:21000/150502',
        };
        const third = {
            ...createEmptyCase(3),
            address: '127.0.0.1:21000/150503',
        };
        const projects = [{ ...project, cases: [first, second, third] }];
        const state = {
            ...withLoadedState(),
            projects,
            activeProjectIndex: 0,
            activeCaseIndex: 2,
            expandedProjectIds: [project.id],
            openCaseIds: [first.id, second.id, third.id],
        };

        const next = tabsReducer(state, {
            type: 'DELETE_CASE',
            projectIndex: 0,
            caseIndex: 0,
        });

        expect(next.projects[0].cases).toHaveLength(2);
        expect(next.activeCaseIndex).toBe(1);
        expect(next.projects[0].cases[next.activeCaseIndex].address).toContain('150503');
        expect(next.openCaseIds).not.toContain(first.id);
    });

    it('TOGGLE_CASE_FAVORITE keeps the active case selected after resorting', () => {
        const project = createEmptyProject(1);
        const first = {
            ...project.cases[0],
            address: '127.0.0.1:21000/150501',
        };
        const second = {
            ...createEmptyCase(2),
            address: '127.0.0.1:21000/150502',
        };
        const projects = [{ ...project, cases: [first, second] }];
        const state = {
            ...withLoadedState(),
            projects,
            activeProjectIndex: 0,
            activeCaseIndex: 1,
            expandedProjectIds: [project.id],
            openCaseIds: [first.id, second.id],
        };

        const next = tabsReducer(state, {
            type: 'TOGGLE_CASE_FAVORITE',
            projectIndex: 0,
            caseIndex: 1,
        });

        expect(next.projects[0].cases[0].id).toBe(second.id);
        expect(next.projects[0].cases[1].id).toBe(first.id);
        expect(next.projects[0].cases[next.activeCaseIndex].id).toBe(second.id);
    });

    it('UPDATE_ACTIVE_CASE strips response from persisted case updates', () => {
        const project = createEmptyProject(1);
        const state = {
            ...withLoadedState(),
            projects: [project],
            activeProjectIndex: 0,
            activeCaseIndex: 0,
            expandedProjectIds: [project.id],
            openCaseIds: [project.cases[0].id],
        };

        const next = tabsReducer(state, {
            type: 'UPDATE_ACTIVE_CASE',
            updates: {
                name: 'Updated',
                response: { rows: [] },
            } as never,
        });

        expect(next.projects[0].cases[0].name).toBe('Updated');
        expect('response' in next.projects[0].cases[0]).toBe(false);
    });

    it('IMPORT_CASES replaces placeholder-only project cases', () => {
        const project = createEmptyProject(1);
        const imported = {
            ...createEmptyCase(1),
            id: 'imported-case',
            address: 'KCBP.1001',
            name: 'Imported',
        };
        const state = {
            ...withLoadedState(),
            projects: [project],
            activeProjectIndex: 0,
            activeCaseIndex: 0,
            expandedProjectIds: [project.id],
            openCaseIds: [project.cases[0].id],
        };

        const next = tabsReducer(state, {
            type: 'IMPORT_CASES',
            projectIndex: 0,
            cases: [imported],
        });

        expect(next.projects[0].cases).toHaveLength(1);
        expect(next.projects[0].cases[0].id).toBe('imported-case');
        expect(next.activeCaseIndex).toBe(0);
    });

    it('APPLY_KCXP_ENV applies the selected environment to every project and case', () => {
        const firstProject = createEmptyProject(1);
        const secondProject = createEmptyProject(2);
        firstProject.cases[0].address = '127.0.0.1:21000/150501?queue=req1&timeout=15';
        secondProject.cases[0].address = '127.0.0.1:21000/150502?queue=req1&timeout=15';
        const state = {
            ...withLoadedState(),
            projects: [firstProject, secondProject],
            activeProjectIndex: 0,
            activeCaseIndex: 0,
            expandedProjectIds: [firstProject.id, secondProject.id],
            openCaseIds: [firstProject.cases[0].id, secondProject.cases[0].id],
        };

        const next = tabsReducer(state, {
            type: 'APPLY_KCXP_ENV',
            environment: {
                id: 'env-test',
                name: 'TEST',
                host: '10.0.0.5:22000',
                queue: 'req2',
                timeout: '30',
            },
        });

        expect(next.projects[0].cases[0].address).toBe(
            '10.0.0.5:22000/150501?queue=req2&timeout=30',
        );
        expect(next.projects[1].cases[0].address).toBe(
            '10.0.0.5:22000/150502?queue=req2&timeout=30',
        );
    });

    it('ADD_CASE applies the initial protocol from the active environment', () => {
        const state = withLoadedState();

        const next = tabsReducer(state, {
            type: 'ADD_CASE',
            initialAddress: '10.201.64.200:21006?service=fs-oms&nodeid=4&clientsessionid=%40custid',
            initialProtocol: 'KGBP',
        });

        const project = next.projects[next.activeProjectIndex];
        const newCase = project.cases.find((item) => item.address.includes('service=fs-oms'));
        expect(newCase?.protocol).toBe('KGBP');
    });

    it('ADD_PROJECT applies the initial protocol to its first case', () => {
        const state = withLoadedState();

        const next = tabsReducer(state, {
            type: 'ADD_PROJECT',
            initialAddress: '10.201.64.200:21006?service=fs-oms&nodeid=4',
            initialProtocol: 'KGBP',
        });

        const newProject = next.projects[next.projects.length - 1];
        expect(newProject.cases[0].protocol).toBe('KGBP');
    });

    it('SET_PROJECT_COMMON_PARAM_SET sets and clears the mounted set id', () => {
        const state = withLoadedState();

        const mounted = tabsReducer(state, {
            type: 'SET_PROJECT_COMMON_PARAM_SET',
            projectIndex: 0,
            setId: 'set-1',
        });
        expect(mounted.projects[0].commonParamSetId).toBe('set-1');
        expect(mounted.projects[1]?.commonParamSetId).toBeUndefined();

        const cleared = tabsReducer(mounted, {
            type: 'SET_PROJECT_COMMON_PARAM_SET',
            projectIndex: 0,
            setId: null,
        });
        expect(cleared.projects[0].commonParamSetId).toBeUndefined();
    });

    it('SET_PROJECT_COMMON_PARAM_SET ignores out-of-range projectIndex', () => {
        const state = withLoadedState();

        const next = tabsReducer(state, {
            type: 'SET_PROJECT_COMMON_PARAM_SET',
            projectIndex: 99,
            setId: 'set-1',
        });

        expect(next).toBe(state);
    });
});
