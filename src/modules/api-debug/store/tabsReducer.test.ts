import { describe, expect, it } from 'vitest';
import { createEmptyCase, createEmptyProject } from '../constants/workspace';
import { createInitialTabsState, tabsReducer } from './tabsReducer';

function withLoadedState() {
    return { ...createInitialTabsState(), loaded: true };
}

describe('tabsReducer', () => {
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
});
