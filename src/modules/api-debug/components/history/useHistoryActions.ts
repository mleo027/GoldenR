import { useApiDebugEnv } from '../../store/useApiDebugEnv';
import { useTabsActions } from '../../store/useTabs';
import { useKcbpCall } from '../../hooks/useKcbpCall';
import type { RequestHistoryEntry } from '../../types/requestHistory';

export function useHistoryActions(onClose: () => void) {
    const { updateTabUndoable } = useTabsActions();
    const { updateEnv } = useApiDebugEnv();
    const { run } = useKcbpCall();

    const loadEntry = (entry: RequestHistoryEntry) => {
        updateTabUndoable(
            {
                address: entry.request.address,
                params: entry.request.params,
                ...(entry.request.script !== undefined ? { script: entry.request.script } : {}),
                ...(entry.request.runInput !== undefined
                    ? { runInput: entry.request.runInput }
                    : {}),
            },
            '载入历史请求',
        );
        updateEnv('editorMode', entry.mode === 'ui' ? 'ui' : 'script');
    };

    const handleReplay = (entry: RequestHistoryEntry) => {
        loadEntry(entry);
        onClose();
        window.setTimeout(() => {
            void run();
        }, 50);
    };

    const handleCopy = (entry: RequestHistoryEntry) => {
        void navigator.clipboard?.writeText(JSON.stringify(entry.request, null, 2));
    };

    return { loadEntry, handleReplay, handleCopy };
}
