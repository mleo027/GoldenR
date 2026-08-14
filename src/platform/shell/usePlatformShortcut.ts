import { useEffect } from 'react';
import { isEditableShortcutTarget } from './platformShortcutUtils';

export interface PlatformShortcutOptions {
    shortcutKey: string;
    mod?: boolean;
    shift?: boolean;
    when?: () => boolean;
    ignoreEditable?: boolean;
    preventDefault?: boolean;
    handler: (event: KeyboardEvent) => void;
}

export function usePlatformShortcut({
    shortcutKey,
    mod = false,
    shift = false,
    when,
    ignoreEditable = true,
    preventDefault = true,
    handler,
}: PlatformShortcutOptions): void {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() !== shortcutKey.toLowerCase()) {
                return;
            }
            if (mod && !(event.ctrlKey || event.metaKey)) {
                return;
            }
            if (shift && !event.shiftKey) {
                return;
            }
            if (when && !when()) {
                return;
            }
            if (ignoreEditable && isEditableShortcutTarget(event.target)) {
                return;
            }
            if (preventDefault) {
                event.preventDefault();
            }
            handler(event);
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [handler, ignoreEditable, mod, preventDefault, shift, shortcutKey, when]);
}
