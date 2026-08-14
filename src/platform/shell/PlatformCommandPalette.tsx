import { Input, Modal } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import type { AppModuleDefinition } from '../registry/types';
import { useAppEnv } from '../../store/useAppEnv';
import { useSettingsModal } from './useSettingsModal';
import { usePlatformShell } from './usePlatformShell';
import {
    buildPlatformCommandActions,
    filterPlatformCommandActions,
    modKeyLabel,
    PLATFORM_COMMAND_GROUP_LABEL,
    type PlatformCommandAction,
} from './platformCommandItems';

interface PlatformCommandPaletteProps {
    open: boolean;
    onClose: () => void;
    modules: AppModuleDefinition[];
}

function actionKey(action: PlatformCommandAction): string {
    if (action.kind === 'module') return `module:${action.moduleId}`;
    return action.kind;
}

export default function PlatformCommandPalette({
    open,
    onClose,
    modules,
}: PlatformCommandPaletteProps) {
    const { env, updateEnv } = useAppEnv();
    const { openSettings } = useSettingsModal();
    const { setSidebarVisible } = usePlatformShell();
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);

    const allActions = useMemo(() => buildPlatformCommandActions(modules), [modules]);
    const results = useMemo(
        () => filterPlatformCommandActions(allActions, query, modules),
        [allActions, modules, query],
    );

    useEffect(() => {
        if (!open) return;
        setQuery('');
        setActiveIndex(0);
    }, [open]);

    useEffect(() => {
        setActiveIndex(0);
    }, [query]);

    const runAction = useCallback(
        (action: PlatformCommandAction) => {
            switch (action.kind) {
                case 'module':
                    updateEnv('activeModuleId', action.moduleId);
                    setSidebarVisible(true);
                    break;
                case 'open-settings':
                    openSettings();
                    break;
                case 'toggle-dark-mode':
                    updateEnv('darkMode', !env.darkMode);
                    break;
                default:
                    break;
            }
            onClose();
        },
        [env.darkMode, onClose, openSettings, setSidebarVisible, updateEnv],
    );

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex((prev) => Math.min(prev + 1, Math.max(results.length - 1, 0)));
                return;
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex((prev) => Math.max(prev - 1, 0));
                return;
            }
            if (event.key === 'Enter' && results[activeIndex]) {
                event.preventDefault();
                runAction(results[activeIndex]);
            }
        },
        [activeIndex, results, runAction],
    );

    let lastGroup: string | undefined;

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            centered
            width={560}
            className="platform-command-palette"
            destroyOnHidden
            closable={false}
            maskClosable
        >
            <Input
                autoFocus
                size="large"
                prefix={<SearchOutlined className="text-[var(--color-text-muted)]" />}
                placeholder="切换模块或执行命令…"
                suffix={
                    <span className="platform-kbd-group">
                        <kbd className="platform-kbd">{modKeyLabel()}⇧P</kbd>
                    </span>
                }
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
            />
            <div className="platform-command-results">
                {results.length === 0 ? (
                    <p className="platform-command-empty">没有匹配的命令</p>
                ) : (
                    <ul className="platform-command-list">
                        {results.map((action, index) => {
                            const groupLabel =
                                action.kind === 'module' && action.group
                                    ? PLATFORM_COMMAND_GROUP_LABEL[action.group]
                                    : action.kind !== 'module'
                                      ? '命令'
                                      : undefined;
                            const showGroupHeader = groupLabel && groupLabel !== lastGroup;
                            if (showGroupHeader) lastGroup = groupLabel;

                            return (
                                <li key={actionKey(action)}>
                                    {showGroupHeader ? (
                                        <div className="platform-command-group">{groupLabel}</div>
                                    ) : null}
                                    <button
                                        type="button"
                                        className={`platform-command-item${
                                            index === activeIndex
                                                ? ' platform-command-item--active'
                                                : ''
                                        }`}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        onClick={() => runAction(action)}
                                    >
                                        {action.label}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </Modal>
    );
}
