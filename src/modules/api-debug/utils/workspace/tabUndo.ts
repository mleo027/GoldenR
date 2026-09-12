import type { UndoCommand } from '@/shared/platform/undo/types';
import { paramsEqual } from '@/shared/utils/paramEquals';
import type { ParamItem, TabData } from '../../types/workspace';

export const UNDOABLE_TAB_FIELDS = [
    'params',
    'address',
    'script',
    'name',
    'requestScript',
    'responseScript',
] as const satisfies readonly (keyof TabData)[];

export type UndoableTabField = (typeof UNDOABLE_TAB_FIELDS)[number];

export function buildCaseUndoScopeId(caseId: string): string {
    return `api-debug:case:${caseId}`;
}

export function createTabDataUndoCommand(args: {
    activeTab: TabData;
    updates: Partial<TabData>;
    apply: (updates: Partial<TabData>) => void;
    label?: string;
}): UndoCommand | null {
    const keys = UNDOABLE_TAB_FIELDS.filter((key) => key in args.updates);
    if (keys.length === 0) return null;

    const before: Partial<TabData> = {};
    const after: Partial<TabData> = {};

    for (const key of keys) {
        const nextValue = args.updates[key];
        if (nextValue === undefined) continue;
        const prevValue = args.activeTab[key];
        if (key === 'params') {
            const nextParams = nextValue as ParamItem[];
            const prevParams = prevValue as ParamItem[];
            if (paramsEqual(prevParams, nextParams)) {
                continue;
            }
            before.params = structuredClone(prevParams);
            after.params = structuredClone(nextParams);
            continue;
        }
        if (Object.is(prevValue, nextValue)) {
            continue;
        }
        before[key] = structuredClone(prevValue) as TabData[typeof key];
        after[key] = structuredClone(nextValue) as TabData[typeof key];
    }

    if (Object.keys(before).length === 0) {
        return null;
    }

    return {
        label: args.label,
        undo: () => args.apply(before),
        redo: () => args.apply(after),
    };
}
