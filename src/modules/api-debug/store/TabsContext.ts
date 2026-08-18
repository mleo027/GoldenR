import { createContext, type Context } from 'react';
import type { TabData, ProjectData } from '../types/workspace';
import type { KcxpEnvironment } from '../types/kcxp';
import type { TabsState } from './tabsReducer';

export interface TabsStateContextValue {
    state: TabsState;
    activeProject: ProjectData;
    activeTab: TabData;
}

export interface TabsActionsContextValue {
    addProject: () => void;
    deleteProject: (projectIndex: number) => void;
    renameProject: (projectIndex: number, name: string) => void;
    toggleProjectExpand: (projectId: string) => void;
    addCase: (projectIndex?: number) => void;
    duplicateCase: (projectIndex: number, caseIndex: number) => void;
    deleteCase: (projectIndex: number, caseIndex: number) => void;
    selectCase: (projectIndex: number, caseIndex: number) => void;
    closeCaseTab: (caseId: string) => void;
    updateTab: (updates: Partial<TabData>) => void;
    updateTabUndoable: (updates: Partial<TabData>, label?: string) => void;
    renameCase: (projectIndex: number, caseIndex: number, name: string) => void;
    toggleCaseFavorite: (projectIndex: number, caseIndex: number) => void;
    importCases: (projectIndex: number, cases: TabData[]) => void;
    moveCase: (fromProjectIndex: number, fromCaseIndex: number, toProjectIndex: number) => void;
    applyKcxpEnvironment: (environment: KcxpEnvironment) => void;
}

export type TabsContextValue = TabsStateContextValue & TabsActionsContextValue;

export const TabsStateContext: Context<TabsStateContextValue | null> =
    createContext<TabsStateContextValue | null>(null);

export const TabsActionsContext: Context<TabsActionsContextValue | null> =
    createContext<TabsActionsContextValue | null>(null);

/** @deprecated 兼容旧用法，优先使用 useTabsState / useTabsActions */
export const TabsContext = TabsStateContext;
