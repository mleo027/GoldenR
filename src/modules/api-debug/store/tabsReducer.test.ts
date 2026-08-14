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
});
