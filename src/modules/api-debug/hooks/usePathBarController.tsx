import { useMemo } from 'react';
import { App } from 'antd';
import { DEFAULT_KCBP_TIMEOUT } from '../utils/kcbp/kcbpAddress';
import { resolveCommonParamsById } from '../utils/workspace/commonParams';
import { useActiveTab, useTabsActions } from '../store/useTabs';
import { useApiDebugEnv } from '../store/useApiDebugEnv';
import { useCommonParamsState } from '../store/useCommonParams';
import { useResponse } from '../store/useResponse';
import { useApiCall } from './useApiCall';
import {
    usePathAddressDraft,
    usePathCommands,
    usePathEnvironment,
    usePathOverflowMenu,
} from './pathBar/usePathBarSections';

interface UsePathBarControllerOptions {
    onQuickFill?: () => void;
}

export function usePathBarController({ onQuickFill }: UsePathBarControllerOptions) {
    const { modal } = App.useApp();
    const { activeTab, activeProject } = useActiveTab();
    const { sets } = useCommonParamsState();
    const { updateTab, updateTabUndoable, applyKcxpEnvironment } = useTabsActions();
    const { env, updateEnv } = useApiDebugEnv();
    const { loading, run } = useApiCall();
    const response = useResponse(activeTab.id);
    const commonParams = useMemo(
        () => resolveCommonParamsById(sets, activeProject.commonParamSetId),
        [activeProject.commonParamSetId, sets],
    );
    const address = usePathAddressDraft({
        tab: activeTab,
        commonParams,
        updateTab,
        updateUndoable: updateTabUndoable,
    });
    const isCodeEditorMode = env.editorMode === 'script';
    const msgtype = address.addressParts.msgtype.trim() || activeTab.name.trim();
    const commands = usePathCommands({
        tab: activeTab,
        response,
        editorMode: env.editorMode,
        loading,
        msgtype,
        flushPending: address.flushPending,
        readRawTextInput: address.readRawTextInput,
        updateTab,
        updateEditorMode: () => updateEnv('editorMode', 'script'),
        modal,
    });
    const environment = usePathEnvironment(
        env,
        address.flushPending,
        updateEnv,
        applyKcxpEnvironment,
    );
    const hasCopyableContent =
        address.addressDraft.trim().length > 0 || activeTab.params.length > 0;
    const overflowMenuItems = usePathOverflowMenu({
        onQuickFill,
        isCodeEditorMode,
        canGenerateTestScript: commands.canGenerateTestScript,
        hasCopyableContent,
        hasResponse: Boolean(response),
        hasParams: activeTab.params.length > 0,
        commands,
    });

    return {
        activeTab,
        env,
        run,
        ...address,
        ...commands,
        ...environment,
        hasCopyableContent,
        isCodeEditorMode,
        showInlineActions: false,
        showOverflowMenu: true,
        overflowMenuItems,
        DEFAULT_KCBP_TIMEOUT,
    };
}
