import { useCallback, useEffect, useMemo, useRef } from 'react';
import { message, type App, type MenuProps } from 'antd';
import {
    CopyOutlined,
    DeleteOutlined,
    FormatPainterOutlined,
    ShareAltOutlined,
    SnippetsOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import { useDebouncedCommit } from '../../../../hooks/useDebouncedCommit';
import { UI_DEBOUNCE_MS } from '../../../../constants/ui';
import { importExportRuntime } from '../../../../runtime/importExportFacade';
import type { ApiDebugEnv } from '../../types';
import type { ParamItem, ResponseData, TabData } from '../../types/workspace';
import {
    flushAllTabDrafts,
    readPendingTabDrafts,
    registerTabDraftFlusher,
    registerTabDraftReader,
} from '../../utils/workspace/tabDraftRegistry';
import { buildParamsRawText, type ParamsRawTextOptions } from '../../utils/workspace/rawText';
import {
    buildShareReportFilename,
    buildShareReportHtml,
    resolveShareReportMeta,
} from '../../utils/workspace/shareReport';
import { generateTestScriptFromParams } from '../../utils/script/apiScript';
import { formatActiveScript } from '../../utils/script/scriptFormatRegistry';
import { parseKcbpResponseStatus } from '../../utils/kcbp/kcbpResponse';
import {
    normalizeKcbpAddress,
    parseKcbpAddress,
    serializeKcbpAddress,
    type KcbpAddressParts,
} from '../../utils/kcbp/kcbpAddress';
import { getActiveKcxpEnvironment } from '../../utils/workspace/kcxpEnvironment';
import { getPathEnvShortLabel, getPathEnvVariant } from '../../utils/workspace/pathEnvVariant';

export function usePathAddressDraft(config: {
    tab: TabData;
    commonParams: ParamItem[];
    updateTab(updates: Partial<TabData>): void;
    updateUndoable(updates: Partial<TabData>, label?: string): void;
}) {
    const { tab, commonParams, updateTab, updateUndoable } = config;
    const commitAddress = useCallback(
        (address: string) => updateUndoable({ address }, '修改地址'),
        [updateUndoable],
    );
    const {
        draft: addressDraft,
        setDraftDebounced,
        flushPending,
    } = useDebouncedCommit(tab.address, {
        delayMs: UI_DEBOUNCE_MS.edit,
        onCommit: commitAddress,
    });
    const draftRef = useRef(addressDraft);
    draftRef.current = addressDraft;
    useEffect(() => {
        const unregisterFlusher = registerTabDraftFlusher(flushPending);
        const unregisterReader = registerTabDraftReader(() => ({ address: draftRef.current }));
        return () => {
            unregisterFlusher();
            unregisterReader();
        };
    }, [flushPending]);
    useEffect(() => () => flushPending(), [tab.id, flushPending]);
    useEffect(() => {
        const normalized = normalizeKcbpAddress(tab.address);
        if (normalized !== tab.address.trim() && tab.address.trim()) {
            updateTab({ address: normalized });
        }
    }, [tab.address, tab.id, updateTab]);
    const addressParts = useMemo(() => parseKcbpAddress(addressDraft), [addressDraft]);
    const handleAddressPartChange = useCallback(
        (field: keyof KcbpAddressParts, value: string) => {
            setDraftDebounced(serializeKcbpAddress({ ...addressParts, [field]: value }));
        },
        [addressParts, setDraftDebounced],
    );
    const readRawTextInput = useCallback((): ParamsRawTextOptions => {
        flushPending();
        const drafts = readPendingTabDrafts();
        return {
            protocol: tab.protocol,
            address: drafts.address ?? tab.address,
            tabName: tab.name,
            params: drafts.params ?? tab.params,
            commonParams,
        };
    }, [commonParams, flushPending, tab.address, tab.name, tab.params, tab.protocol]);
    return { addressDraft, addressParts, flushPending, handleAddressPartChange, readRawTextInput };
}

export function usePathCommands(config: {
    tab: TabData;
    response?: ResponseData;
    editorMode: ApiDebugEnv['editorMode'];
    loading: boolean;
    msgtype: string;
    flushPending(): void;
    readRawTextInput(): ParamsRawTextOptions;
    updateTab(updates: Partial<TabData>): void;
    updateEditorMode(): void;
    modal: ReturnType<typeof App.useApp>['modal'];
}) {
    const {
        tab,
        response,
        editorMode,
        loading,
        msgtype,
        flushPending,
        readRawTextInput,
        updateTab,
        updateEditorMode,
        modal,
    } = config;
    const handleCopyParams = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(buildParamsRawText(readRawTextInput()));
            message.success('已复制地址与请求参数');
        } catch {
            message.error('复制失败');
        }
    }, [readRawTextInput]);
    const handleShareReport = useCallback(async () => {
        if (!response) return;
        const input = readRawTextInput();
        if (!importExportRuntime.isAvailable())
            return void message.error('分享失败：Electron API 不可用');
        try {
            const meta = resolveShareReportMeta(input);
            const result = await importExportRuntime.saveHtml(
                buildShareReportHtml({ ...input, response }),
                buildShareReportFilename(input.tabName, meta.msgtype),
            );
            if (result.saved) message.success(`已保存：${result.filePath}`);
            else if (result.error) message.error(`分享失败：${result.error}`);
        } catch {
            message.error('分享失败');
        }
    }, [readRawTextInput, response]);
    const canGenerateTestScript = useMemo(
        () =>
            editorMode !== 'script' &&
            !loading &&
            Boolean(response) &&
            String(response?.code) !== '-1' &&
            parseKcbpResponseStatus(response!).kind === 'success',
        [editorMode, loading, response],
    );
    const applyGeneratedScript = useCallback(() => {
        updateTab({
            script: generateTestScriptFromParams(tab.params, msgtype),
        });
        updateEditorMode();
        message.success('已生成测试脚本，已切换到脚本模式');
    }, [msgtype, tab.params, updateEditorMode, updateTab]);
    const handleGenerateTestScript = useCallback(() => {
        flushPending();
        flushAllTabDrafts();
        const generated = generateTestScriptFromParams(tab.params, msgtype);
        if (tab.script?.trim() && tab.script.trim() !== generated.trim()) {
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
    }, [applyGeneratedScript, flushPending, modal, msgtype, tab.params, tab.script]);
    const handleClearParams = useCallback(() => {
        flushPending();
        updateTab({ params: [] });
        message.success('已清空全部参数');
    }, [flushPending, updateTab]);
    return {
        handleCopyParams,
        handleShareReport,
        canGenerateTestScript,
        handleGenerateTestScript,
        handleClearParams,
    };
}

export function usePathEnvironment(
    env: ApiDebugEnv,
    flushPending: () => void,
    updateEnv: (key: 'activeKcxpEnvironmentId', value: string) => void,
    applyEnvironment: (environment: ApiDebugEnv['kcxpEnvironments'][number]) => void,
) {
    const environmentOptions = useMemo(
        () =>
            env.kcxpEnvironments.map((environment) => ({
                value: environment.id,
                label: environment.name.trim() || getPathEnvShortLabel(environment.name),
                environmentName: environment.name,
                environment,
            })),
        [env.kcxpEnvironments],
    );
    const activeEnvironment = useMemo(
        () => getActiveKcxpEnvironment(env.kcxpEnvironments, env.activeKcxpEnvironmentId),
        [env.activeKcxpEnvironmentId, env.kcxpEnvironments],
    );
    const handleEnvironmentChange = useCallback(
        (id: string) => {
            flushPending();
            const environment = getActiveKcxpEnvironment(env.kcxpEnvironments, id);
            updateEnv('activeKcxpEnvironmentId', id);
            applyEnvironment(environment);
        },
        [applyEnvironment, env.kcxpEnvironments, flushPending, updateEnv],
    );
    return {
        environmentOptions,
        activeEnvironment,
        handleEnvironmentChange,
        envVariant: getPathEnvVariant(activeEnvironment.name),
    };
}

export function usePathOverflowMenu(config: {
    onQuickFill?: () => void;
    isCodeEditorMode: boolean;
    canGenerateTestScript: boolean;
    hasCopyableContent: boolean;
    hasResponse: boolean;
    hasParams: boolean;
    commands: {
        handleCopyParams(): Promise<void>;
        handleShareReport(): Promise<void>;
        handleGenerateTestScript(): void;
        handleClearParams(): void;
    };
}): MenuProps['items'] {
    return useMemo(() => {
        const items: NonNullable<MenuProps['items']> = [];
        if (config.onQuickFill)
            items.push({
                key: 'quick-fill',
                label: '快速填充入参',
                icon: <ThunderboltOutlined />,
                onClick: config.onQuickFill,
            });
        items.push(
            config.isCodeEditorMode
                ? {
                      key: 'format',
                      label: '格式化脚本',
                      icon: <FormatPainterOutlined />,
                      onClick: () => formatActiveScript(),
                  }
                : {
                      key: 'generate',
                      label: '生成测试脚本',
                      icon: <SnippetsOutlined />,
                      disabled: !config.canGenerateTestScript,
                      onClick: config.commands.handleGenerateTestScript,
                  },
        );
        items.push(
            { type: 'divider' },
            {
                key: 'copy',
                label: '复制地址与参数',
                icon: <CopyOutlined />,
                disabled: !config.hasCopyableContent,
                onClick: () => void config.commands.handleCopyParams(),
            },
            {
                key: 'share',
                label: '分享',
                icon: <ShareAltOutlined />,
                disabled: !config.hasResponse,
                onClick: () => void config.commands.handleShareReport(),
            },
            {
                key: 'clear',
                label: '清空全部参数',
                icon: <DeleteOutlined />,
                disabled: !config.hasParams,
                onClick: config.commands.handleClearParams,
            },
        );
        return items;
    }, [config]);
}
