import { useCallback, useEffect } from 'react';
import type { UndoCommand } from '../../shared/platform/undo/types';
import { useUndoRedoStore } from './undoRedoStore';

export interface UseUndoScopeOptions {
    /** 为 true 时该 scope 接收全局 Mod+Z / Mod+Shift+Z */
    active?: boolean;
}

/**
 * 注册模块化撤销作用域。每个 scopeId 独立保留最多 50 条历史（见 undoHistory）。
 */
export function useUndoScope(scopeId: string | null | undefined, options?: UseUndoScopeOptions) {
    const pushToScope = useUndoRedoStore((state) => state.push);
    const clearScope = useUndoRedoStore((state) => state.clearScope);
    const setActiveScope = useUndoRedoStore((state) => state.setActiveScope);
    const releaseActiveScope = useUndoRedoStore((state) => state.releaseActiveScope);
    const active = options?.active ?? false;

    useEffect(() => {
        if (!scopeId || !active) return undefined;
        setActiveScope(scopeId);
        return () => {
            releaseActiveScope(scopeId);
        };
    }, [active, releaseActiveScope, scopeId, setActiveScope]);

    const push = useCallback(
        (command: UndoCommand) => {
            if (!scopeId) return;
            pushToScope(scopeId, command);
        },
        [pushToScope, scopeId],
    );

    const clear = useCallback(() => {
        if (!scopeId) return;
        clearScope(scopeId);
    }, [clearScope, scopeId]);

    return { push, clear };
}
