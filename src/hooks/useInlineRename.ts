import { useCallback, useEffect, useRef, useState } from 'react';
import type { InputRef } from 'antd';

export type RenameTarget =
    | { type: 'project'; projectIndex: number }
    | { type: 'case'; projectIndex: number; caseIndex: number }
    | { type: 'folder'; projectIndex: number; folderId: string };

function isSameRenameTarget(a: RenameTarget | null, b: RenameTarget): boolean {
    if (!a) return false;
    if (a.type !== b.type) return false;
    if (a.type === 'project' && b.type === 'project') {
        return a.projectIndex === b.projectIndex;
    }
    if (a.type === 'case' && b.type === 'case') {
        return a.projectIndex === b.projectIndex && a.caseIndex === b.caseIndex;
    }
    if (a.type === 'folder' && b.type === 'folder') {
        return a.projectIndex === b.projectIndex && a.folderId === b.folderId;
    }
    return false;
}

export function useInlineRename(
    getName: (target: RenameTarget) => string,
    onCommit: (target: RenameTarget, name: string) => void,
) {
    const inputRef = useRef<InputRef>(null);
    const [editTarget, setEditTarget] = useState<RenameTarget | null>(null);
    const [editingName, setEditingName] = useState('');

    useEffect(() => {
        if (editTarget) {
            inputRef.current?.focus();
        }
    }, [editTarget]);

    const startRename = useCallback(
        (target: RenameTarget) => {
            setEditTarget(target);
            setEditingName(getName(target));
        },
        [getName],
    );

    const finishRename = useCallback(() => {
        if (!editTarget || !editingName.trim()) {
            setEditTarget(null);
            return;
        }
        onCommit(editTarget, editingName.trim());
        setEditTarget(null);
    }, [editTarget, editingName, onCommit]);

    const isEditing = useCallback(
        (target: RenameTarget) => isSameRenameTarget(editTarget, target),
        [editTarget],
    );

    return {
        inputRef,
        editingName,
        setEditingName,
        startRename,
        finishRename,
        isEditing,
    };
}
