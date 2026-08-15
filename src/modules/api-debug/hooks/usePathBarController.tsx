import { useCallback, useEffect, useMemo, useRef } from 'react';
import { App, message } from 'antd';
import type { MenuProps } from 'antd';
import {
    CopyOutlined,
    DeleteOutlined,
    FormatPainterOutlined,
    SnippetsOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import { useTabsActions, useActiveTab } from '../store/useTabs';
import { useApiDebugEnv } from '../store/useApiDebugEnv';
import { useResponse } from '../store/useResponse';
import { useKcbpCall } from './useKcbpCall';
import { useDebouncedCommit } from '../../../hooks/useDebouncedCommit';
import {
    flushAllTabDrafts,
    registerTabDraftFlusher,
    registerTabDraftReader,
} from '../utils/workspace/tabDraftRegistry';
import { formatActiveScript } from '../utils/script/scriptFormatRegistry';
import { generateTestScriptFromParams } from '../utils/script/apiScript';
import { parseKcbpResponseStatus } from '../utils/kcbp/kcbpResponse';
import { UI_DEBOUNCE_MS } from '../../../constants/ui';
import {
    DEFAULT_KCBP_TIMEOUT,
    normalizeKcbpAddress,
    parseKcbpAddress,
    serializeKcbpAddress,
    type KcbpAddressParts,
} from '../utils/kcbp/kcbpAddress';
import { getActiveKcxpEnvironment } from '../utils/workspace/kcxpEnvironment';
import { getPathEnvVariant, getPathEnvShortLabel } from '../utils/workspace/pathEnvVariant';
import type { PathBarLayout } from '../utils/pathBarLayout';

interface UsePathBarControllerOptions {
    layout: PathBarLayout;
    onQuickFill?: () => void;
}

export function usePathBarController({ layout, onQuickFill }: UsePathBarControllerOptions) {
    const { modal } = App.useApp();
    const { activeTab } = useActiveTab();
    const { updateTab, updateTabUndoable, applyKcxpEnvironment } = useTabsActions();
    const { env, updateEnv } = useApiDebugEnv();
    const { loading, run } = useKcbpCall();
    const response = useResponse(activeTab.id);

    const commitAddress = useCallback(
        (address: string) => {
            updateTabUndoable({ address }, '修改地址');
        },
        [updateTabUndoable],
    );

    const {
        draft: addressDraft,
        setDraftDebounced,
        flushPending,
    } = useDebouncedCommit(activeTab.address, {
        delayMs: UI_DEBOUNCE_MS.edit,
        onCommit: commitAddress,
    });
    const addressDraftRef = useRef(addressDraft);
    addressDraftRef.current = addressDraft;

    useEffect(() => {
        const unregisterFlusher = registerTabDraftFlusher(flushPending);
        const unregisterReader = registerTabDraftReader(() => ({
            address: addressDraftRef.current,
        }));
        return () => {
            unregisterFlusher();
            unregisterReader();
        };
    }, [flushPending]);

    useEffect(
        () => () => {
            flushPending();
        },
        [activeTab.id, flushPending],
    );

    useEffect(() => {
        const normalized = normalizeKcbpAddress(activeTab.address);
        if (normalized !== activeTab.address.trim() && activeTab.address.trim()) {
            updateTab({ address: normalized });
        }
    }, [activeTab.address, activeTab.id, updateTab]);

    const addressParts = useMemo(() => parseKcbpAddress(addressDraft), [addressDraft]);

    const handleAddressPartChange = (field: keyof KcbpAddressParts, value: string) => {
        setDraftDebounced(
            serializeKcbpAddress({
                ...addressParts,
                [field]: value,
            }),
        );
    };

    const handleCopyParams = useCallback(async () => {
        flushPending();
        const payload = {
            address: activeTab.address,
            host: addressParts.host,
            msgtype: addressParts.msgtype,
            queue: addressParts.queue,
            timeout: addressParts.timeout,
            params: activeTab.params,
        };
        const text = JSON.stringify(payload, null, 2);
        try {
            await navigator.clipboard.writeText(text);
            message.success('已复制地址与请求参数');
        } catch {
            message.error('复制失败');
        }
    }, [activeTab.address, activeTab.params, addressParts, flushPending]);

    const hasCopyableContent = addressDraft.trim().length > 0 || activeTab.params.length > 0;
    const isScriptMode = env.editorMode === 'script';
    const isCodeEditorMode = isScriptMode;
    const msgtype = addressParts.msgtype.trim() || activeTab.name.trim();

    const canGenerateTestScript = useMemo(() => {
        if (isScriptMode || loading || !response) {
            return false;
        }
        if (String(response.code) === '-1') {
            return false;
        }
        return parseKcbpResponseStatus(response).kind === 'success';
    }, [isScriptMode, loading, response]);

    const applyGeneratedScript = useCallback(() => {
        const script = generateTestScriptFromParams(activeTab.params, msgtype);
        updateTab({ script });
        updateEnv('editorMode', 'script');
        message.success('已生成测试脚本，已切换到脚本模式');
    }, [activeTab.params, msgtype, updateEnv, updateTab]);

    const handleGenerateTestScript = useCallback(() => {
        flushPending();
        flushAllTabDrafts();

        const script = generateTestScriptFromParams(activeTab.params, msgtype);
        const existing = activeTab.script?.trim() ?? '';

        if (existing && existing !== script.trim()) {
            modal.confirm({
                title: '覆盖现有脚本？',
                content: '当前接口已有脚本内容，生成将覆盖为基于入参的测试模板。',
                centered: true,
                mousePosition: null,
                okText: '覆盖生成',
                cancelText: '取消',
                onOk: applyGeneratedScript,
            });
            return;
        }

        applyGeneratedScript();
    }, [activeTab.params, activeTab.script, applyGeneratedScript, flushPending, modal, msgtype]);

    const handleClearParams = useCallback(() => {
        flushPending();
        updateTab({ params: [] });
        message.success('已清空全部参数');
    }, [flushPending, updateTab]);

    const environmentOptions = useMemo(
        () =>
            env.kcxpEnvironments.map((item) => ({
                value: item.id,
                label: getPathEnvShortLabel(item.name),
            })),
        [env.kcxpEnvironments],
    );

    const handleEnvironmentChange = (environmentId: string) => {
        flushPending();
        const environment = getActiveKcxpEnvironment(env.kcxpEnvironments, environmentId);
        updateEnv('activeKcxpEnvironmentId', environmentId);
        applyKcxpEnvironment(environment, 'active');
    };

    const activeEnvironment = useMemo(
        () => getActiveKcxpEnvironment(env.kcxpEnvironments, env.activeKcxpEnvironmentId),
        [env.activeKcxpEnvironmentId, env.kcxpEnvironments],
    );

    const envVariant = getPathEnvVariant(activeEnvironment.name);

    const showInlineActions = layout === 'full';
    const showOverflowMenu = layout !== 'full';

    const overflowMenuItems = useMemo((): MenuProps['items'] => {
        const items: NonNullable<MenuProps['items']> = [];

        if (onQuickFill) {
            items.push({
                key: 'quick-fill',
                label: '快速填充入参',
                icon: <ThunderboltOutlined />,
                onClick: onQuickFill,
            });
        }

        if (isCodeEditorMode) {
            items.push({
                key: 'format',
                label: '格式化脚本',
                icon: <FormatPainterOutlined />,
                onClick: () => formatActiveScript(),
            });
        } else {
            items.push({
                key: 'generate',
                label: '生成测试脚本',
                icon: <SnippetsOutlined />,
                disabled: !canGenerateTestScript,
                onClick: () => handleGenerateTestScript(),
            });
        }

        items.push(
            { type: 'divider' },
            {
                key: 'copy',
                label: '复制地址与参数',
                icon: <CopyOutlined />,
                disabled: !hasCopyableContent,
                onClick: () => void handleCopyParams(),
            },
            {
                key: 'clear',
                label: '清空全部参数',
                icon: <DeleteOutlined />,
                disabled: activeTab.params.length === 0,
                onClick: () => handleClearParams(),
            },
        );

        return items;
    }, [
        activeTab.params.length,
        canGenerateTestScript,
        handleClearParams,
        handleCopyParams,
        handleGenerateTestScript,
        hasCopyableContent,
        isCodeEditorMode,
        onQuickFill,
    ]);

    return {
        activeTab,
        env,
        run,
        flushPending,
        addressDraft,
        addressParts,
        handleAddressPartChange,
        handleCopyParams,
        hasCopyableContent,
        isCodeEditorMode,
        canGenerateTestScript,
        handleGenerateTestScript,
        handleClearParams,
        environmentOptions,
        handleEnvironmentChange,
        envVariant,
        showInlineActions,
        showOverflowMenu,
        overflowMenuItems,
        DEFAULT_KCBP_TIMEOUT,
    };
}
