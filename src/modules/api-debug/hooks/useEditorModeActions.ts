import { useCallback } from 'react';
import { useApiDebugEnv } from '../store/useApiDebugEnv';
import { useTabsActions, useActiveTab } from '../store/useTabs';
import type { EditorMode } from '../types/workspace';
import { parseKcbpAddress } from '../utils/kcbp/kcbpAddress';
import { paramsToCaseScript } from '../utils/script/apiScript';
import { flushAllTabDrafts } from '../utils/workspace/tabDraftRegistry';

export function useEditorModeActions() {
    const { env, updateEnv } = useApiDebugEnv();
    const { activeTab } = useActiveTab();
    const { updateTab } = useTabsActions();

    const switchEditorMode = useCallback(
        (mode: EditorMode) => {
            if (env.editorMode === mode) return;

            if (mode === 'script' && env.editorMode === 'ui') {
                const pending = flushAllTabDrafts();
                const params = pending.params ?? activeTab.params;
                const msgtype =
                    parseKcbpAddress(activeTab.address).msgtype.trim() || activeTab.name.trim();

                updateTab({
                    ...(pending.params ? { params: pending.params } : {}),
                    script: paramsToCaseScript(params, msgtype),
                });
            }

            updateEnv('editorMode', mode);
        },
        [activeTab.address, activeTab.name, activeTab.params, env.editorMode, updateEnv, updateTab],
    );

    return {
        editorMode: env.editorMode,
        switchEditorMode,
    };
}
