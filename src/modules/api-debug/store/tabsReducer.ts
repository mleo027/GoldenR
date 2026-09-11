import { reduceCaseAction } from './tabsReducer/caseReducers';
import { reduceProjectAction } from './tabsReducer/projectReducers';
import { reduceWorkspaceAction } from './tabsReducer/workspaceReducers';
import { createInitialTabsState, type TabsAction, type TabsState } from './tabsReducer/types';

export { createInitialTabsState };
export type { TabsAction, TabsState } from './tabsReducer/types';

type ProjectTabsAction = Extract<
    TabsAction,
    {
        type:
            | 'ADD_PROJECT'
            | 'DELETE_PROJECT'
            | 'RENAME_PROJECT'
            | 'TOGGLE_PROJECT_EXPAND'
            | 'SET_PROJECT_COMMON_PARAM_SET'
            | 'ADD_FOLDER'
            | 'RENAME_FOLDER'
            | 'DELETE_FOLDER'
            | 'MOVE_CASE_TO_FOLDER';
    }
>;

type CaseTabsAction = Extract<
    TabsAction,
    {
        type:
            | 'ADD_CASE'
            | 'DUPLICATE_CASE'
            | 'DELETE_CASE'
            | 'SELECT_CASE'
            | 'CLOSE_CASE_TAB'
            | 'UPDATE_ACTIVE_CASE'
            | 'UPDATE_CASE_BY_ID'
            | 'RENAME_CASE'
            | 'TOGGLE_CASE_FAVORITE'
            | 'MOVE_CASE'
            | 'IMPORT_CASES';
    }
>;

type WorkspaceTabsAction = Extract<
    TabsAction,
    { type: 'APPLY_KCXP_ENV' | 'SET_WORKSPACE' | 'MARK_LOADED' }
>;

const PROJECT_ACTION_TYPES = new Set<ProjectTabsAction['type']>([
    'ADD_PROJECT',
    'DELETE_PROJECT',
    'RENAME_PROJECT',
    'TOGGLE_PROJECT_EXPAND',
    'SET_PROJECT_COMMON_PARAM_SET',
    'ADD_FOLDER',
    'RENAME_FOLDER',
    'DELETE_FOLDER',
    'MOVE_CASE_TO_FOLDER',
]);

const CASE_ACTION_TYPES = new Set<CaseTabsAction['type']>([
    'ADD_CASE',
    'DUPLICATE_CASE',
    'DELETE_CASE',
    'SELECT_CASE',
    'CLOSE_CASE_TAB',
    'UPDATE_ACTIVE_CASE',
    'UPDATE_CASE_BY_ID',
    'RENAME_CASE',
    'TOGGLE_CASE_FAVORITE',
    'MOVE_CASE',
    'IMPORT_CASES',
]);

const WORKSPACE_ACTION_TYPES = new Set<WorkspaceTabsAction['type']>([
    'APPLY_KCXP_ENV',
    'SET_WORKSPACE',
    'MARK_LOADED',
]);

function isProjectAction(action: TabsAction): action is ProjectTabsAction {
    return PROJECT_ACTION_TYPES.has(action.type as ProjectTabsAction['type']);
}

function isCaseAction(action: TabsAction): action is CaseTabsAction {
    return CASE_ACTION_TYPES.has(action.type as CaseTabsAction['type']);
}

function isWorkspaceAction(action: TabsAction): action is WorkspaceTabsAction {
    return WORKSPACE_ACTION_TYPES.has(action.type as WorkspaceTabsAction['type']);
}

export function tabsReducer(state: TabsState, action: TabsAction): TabsState {
    if (isProjectAction(action)) return reduceProjectAction(state, action);
    if (isCaseAction(action)) return reduceCaseAction(state, action);
    if (isWorkspaceAction(action)) return reduceWorkspaceAction(state, action);
    return state;
}
