import { useCallback } from 'react';
import { usePlatformShortcut } from '../shell/usePlatformShortcut';
import { PLATFORM_SHORTCUT } from '../shell/platformShortcuts';
import { useUndoRedoActions } from './UndoRedoContext';

export default function UndoRedoHost() {
    const { undo, redo } = useUndoRedoActions();

    const handleUndo = useCallback(() => {
        undo();
    }, [undo]);

    const handleRedo = useCallback(() => {
        redo();
    }, [redo]);

    usePlatformShortcut({
        ...PLATFORM_SHORTCUT.UNDO,
        handler: handleUndo,
    });

    usePlatformShortcut({
        ...PLATFORM_SHORTCUT.REDO,
        handler: handleRedo,
    });

    return null;
}
