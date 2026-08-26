import type { TabData, ProjectData, PersistedWorkspace } from '../../types/workspace';
import type { KcxpEnvironment, KcxpProtocol } from '../../types/kcxp';
import { createInitialWorkspace } from '../tabsData';

export interface TabsState {
    projects: ProjectData[];
    activeProjectIndex: number;
    activeCaseIndex: number;
    expandedProjectIds: string[];
    openCaseIds: string[];
    loaded: boolean;
}

export type TabsAction =
    | { type: 'ADD_PROJECT'; initialAddress?: string; initialProtocol?: KcxpProtocol }
    | { type: 'DELETE_PROJECT'; projectIndex: number }
    | { type: 'RENAME_PROJECT'; projectIndex: number; name: string }
    | { type: 'TOGGLE_PROJECT_EXPAND'; projectId: string }
    | { type: 'ADD_CASE'; projectIndex?: number; initialAddress?: string; initialProtocol?: KcxpProtocol }
    | { type: 'DUPLICATE_CASE'; projectIndex: number; caseIndex: number }
    | { type: 'DELETE_CASE'; projectIndex: number; caseIndex: number }
    | { type: 'SELECT_CASE'; projectIndex: number; caseIndex: number }
    | { type: 'CLOSE_CASE_TAB'; caseId: string }
    | { type: 'UPDATE_ACTIVE_CASE'; updates: Partial<TabData> }
    | { type: 'RENAME_CASE'; projectIndex: number; caseIndex: number; name: string }
    | { type: 'TOGGLE_CASE_FAVORITE'; projectIndex: number; caseIndex: number }
    | { type: 'IMPORT_CASES'; projectIndex: number; cases: TabData[] }
    | {
          type: 'MOVE_CASE';
          fromProjectIndex: number;
          fromCaseIndex: number;
          toProjectIndex: number;
      }
    | { type: 'APPLY_KCXP_ENV'; environment: KcxpEnvironment }
    | { type: 'SET_WORKSPACE'; workspace: PersistedWorkspace }
    | { type: 'MARK_LOADED' };

export function createInitialTabsState(): TabsState {
    return {
        ...createInitialWorkspace(),
        loaded: false,
    };
}
