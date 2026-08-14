import { reduceCaseAction } from './tabsReducer/caseReducers';
import { reduceProjectAction } from './tabsReducer/projectReducers';
import { reduceWorkspaceAction } from './tabsReducer/workspaceReducers';
import { createInitialTabsState, type TabsAction, type TabsState } from './tabsReducer/types';

export { createInitialTabsState };
export type { TabsAction, TabsState } from './tabsReducer/types';

export function tabsReducer(state: TabsState, action: TabsAction): TabsState {
    switch (action.type) {
        case 'ADD_PROJECT':
        case 'DELETE_PROJECT':
        case 'RENAME_PROJECT':
        case 'TOGGLE_PROJECT_EXPAND':
            return reduceProjectAction(
                state,
                action as Extract<
                    TabsAction,
                    {
                        type:
                            | 'ADD_PROJECT'
                            | 'DELETE_PROJECT'
                            | 'RENAME_PROJECT'
                            | 'TOGGLE_PROJECT_EXPAND';
                    }
                >,
            );

        case 'ADD_CASE':
        case 'DUPLICATE_CASE':
        case 'DELETE_CASE':
        case 'SELECT_CASE':
        case 'CLOSE_CASE_TAB':
        case 'UPDATE_ACTIVE_CASE':
        case 'RENAME_CASE':
        case 'TOGGLE_CASE_FAVORITE':
        case 'MOVE_CASE':
        case 'IMPORT_CASES':
            return reduceCaseAction(
                state,
                action as Extract<
                    TabsAction,
                    {
                        type:
                            | 'ADD_CASE'
                            | 'DUPLICATE_CASE'
                            | 'DELETE_CASE'
                            | 'SELECT_CASE'
                            | 'CLOSE_CASE_TAB'
                            | 'UPDATE_ACTIVE_CASE'
                            | 'RENAME_CASE'
                            | 'TOGGLE_CASE_FAVORITE'
                            | 'MOVE_CASE'
                            | 'IMPORT_CASES';
                    }
                >,
            );

        case 'APPLY_KCXP_ENV':
        case 'SET_WORKSPACE':
        case 'MARK_LOADED':
            return reduceWorkspaceAction(
                state,
                action as Extract<
                    TabsAction,
                    { type: 'APPLY_KCXP_ENV' | 'SET_WORKSPACE' | 'MARK_LOADED' }
                >,
            );

        default:
            return state;
    }
}
