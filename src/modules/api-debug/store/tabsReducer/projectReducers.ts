import { reduceFolderAction, type FolderAction } from './folderReducers';
import {
    reduceProjectLifecycleAction,
    type ProjectLifecycleAction,
} from './projectLifecycleReducers';
import { reduceProjectMetadataAction, type ProjectMetadataAction } from './projectMetadataReducers';
import type { TabsAction, TabsState } from './types';

type ProjectAction = FolderAction | ProjectLifecycleAction | ProjectMetadataAction;

const FOLDER_ACTIONS = new Set<FolderAction['type']>([
    'ADD_FOLDER',
    'RENAME_FOLDER',
    'DELETE_FOLDER',
    'MOVE_CASE_TO_FOLDER',
]);
const LIFECYCLE_ACTIONS = new Set<ProjectLifecycleAction['type']>([
    'ADD_PROJECT',
    'DELETE_PROJECT',
]);

function isFolderAction(action: TabsAction): action is FolderAction {
    return FOLDER_ACTIONS.has(action.type as FolderAction['type']);
}

function isLifecycleAction(action: TabsAction): action is ProjectLifecycleAction {
    return LIFECYCLE_ACTIONS.has(action.type as ProjectLifecycleAction['type']);
}

export function reduceProjectAction(state: TabsState, action: ProjectAction): TabsState {
    if (isFolderAction(action)) return reduceFolderAction(state, action);
    if (isLifecycleAction(action)) return reduceProjectLifecycleAction(state, action);
    return reduceProjectMetadataAction(state, action);
}
