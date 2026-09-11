import type { TabData } from '../types/workspace';
import type { KcxpProtocol } from '@/shared/kcxp/types';

export interface TabsActionRuntime {
    getInitialAddress(): string;
    getInitialProtocol(): KcxpProtocol;
    applyUndoable(updates: Partial<TabData>, label?: string): void;
}

let runtime: TabsActionRuntime | null = null;
export function configureTabsActionRuntime(next: TabsActionRuntime): () => void {
    runtime = next;
    return () => {
        if (runtime === next) runtime = null;
    };
}

function requireRuntime(): TabsActionRuntime {
    if (!runtime) throw new Error('Tabs action runtime is not configured');
    return runtime;
}
export const getInitialAddress = () => requireRuntime().getInitialAddress();
export const getInitialProtocol = () => requireRuntime().getInitialProtocol();
export const applyUndoable = (updates: Partial<TabData>, label?: string) =>
    requireRuntime().applyUndoable(updates, label);
