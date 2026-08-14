import type { TabData } from '../../types/workspace';
import { normalizeWorkspace } from '../tabsData';
import { applyKcxpEnvironmentToAddress } from '../../utils/workspace/kcxpEnvironment';
import type { TabsAction, TabsState } from './types';

type WorkspaceAction = Extract<
    TabsAction,
    { type: 'APPLY_KCXP_ENV' | 'SET_WORKSPACE' | 'MARK_LOADED' }
>;

export function reduceWorkspaceAction(state: TabsState, action: WorkspaceAction): TabsState {
    switch (action.type) {
        case 'APPLY_KCXP_ENV': {
            const { environment, scope } = action;
            const mapCase = (caseItem: TabData): TabData => ({
                ...caseItem,
                address: applyKcxpEnvironmentToAddress(caseItem.address, environment),
                updatedAt: Date.now(),
            });

            if (scope === 'active') {
                const activeProject = state.projects[state.activeProjectIndex];
                if (!activeProject?.cases[state.activeCaseIndex]) return state;

                const nextProjects = state.projects.map((project, projectIndex) => {
                    if (projectIndex !== state.activeProjectIndex) return project;
                    return {
                        ...project,
                        updatedAt: Date.now(),
                        cases: project.cases.map((item, caseIndex) =>
                            caseIndex === state.activeCaseIndex ? mapCase(item) : item,
                        ),
                    };
                });
                return { ...state, projects: nextProjects };
            }

            if (scope === 'project') {
                const nextProjects = state.projects.map((project, projectIndex) => {
                    if (projectIndex !== state.activeProjectIndex) return project;
                    return {
                        ...project,
                        updatedAt: Date.now(),
                        cases: project.cases.map(mapCase),
                    };
                });
                return { ...state, projects: nextProjects };
            }

            const nextProjects = state.projects.map((project) => ({
                ...project,
                updatedAt: Date.now(),
                cases: project.cases.map(mapCase),
            }));
            return { ...state, projects: nextProjects };
        }

        case 'SET_WORKSPACE':
            return { ...normalizeWorkspace(action.workspace), loaded: true };

        case 'MARK_LOADED':
            return { ...state, loaded: true };
    }
}
