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
            const { environment } = action;
            const mapCase = (caseItem: TabData): TabData => ({
                ...caseItem,
                address: applyKcxpEnvironmentToAddress(caseItem.address, environment),
                updatedAt: Date.now(),
            });

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
