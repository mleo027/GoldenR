export function isEditableShortcutTarget(target: EventTarget | null): boolean {
    if (!target || typeof target !== 'object') {
        return false;
    }

    const element = target as HTMLElement;
    if (typeof element.closest !== 'function') {
        return false;
    }

    return Boolean(
        element.closest('input, textarea, [contenteditable="true"], .cm-editor, .cm-content'),
    );
}
