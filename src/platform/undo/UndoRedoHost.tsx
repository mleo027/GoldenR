import { useCallback } from 'react';
import { usePlatformShortcut } from '../shell/usePlatformShortcut';
import { PLATFORM_SHORTCUT } from '../shell/platformShortcuts';
import { useUndoRedoStore } from './undoRedoStore';

export default function UndoRedoHost() {
    const undo = useUndoRedoStore((state) => state.undo);
    const redo = useUndoRedoStore((state) => state.redo);

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
