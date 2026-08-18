import { useEffect, useState } from 'react';
import { Button, Space, Tooltip } from 'antd';
import { CloseOutlined, MinusOutlined, BorderOutlined, BlockOutlined } from '@ant-design/icons';
import { TITLE_BAR_SLOT_ID } from '../../platform/shell/TitleBarSlotPortal';
import GoldenApiLogo from '../ui/GoldenApiLogo';
import { getElectronAPI } from '@/lib/electron';

interface TitleBarProps {
    moduleLabel: string;
    breadcrumb: string;
    /** 为 true 时隐藏中央 breadcrumb，改由模块 TitleBarSlot 展示 */
    useTitleBarSlot?: boolean;
}

export default function TitleBar({
    moduleLabel,
    breadcrumb,
    useTitleBarSlot = false,
}: TitleBarProps) {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        const api = getElectronAPI();
        if (!api?.window.isMaximized) return;

        void api.window.isMaximized().then(setIsMaximized).catch(console.error);

        const unsubscribe = api.window.onMaximizedChange?.(setIsMaximized);
        return () => unsubscribe?.();
    }, []);

    const activeLabel = breadcrumb || moduleLabel;

    return (
        <div className="title-bar" style={{ userSelect: 'none' } as React.CSSProperties}>
            <div className="title-bar-brand">
                <GoldenApiLogo size={28} className="title-bar-logo" title="Golden API Debug" />
                <span className="title-bar-name">Golden API Debug</span>
                {moduleLabel && !useTitleBarSlot ? (
                    <Tooltip title={moduleLabel}>
                        <span className="title-bar-module">{moduleLabel}</span>
                    </Tooltip>
                ) : null}
            </div>

            <div
                id={TITLE_BAR_SLOT_ID}
                className={`title-bar-slot${useTitleBarSlot ? ' title-bar-slot-active' : ''}`}
            />

            {!useTitleBarSlot ? (
                <div className="title-bar-path">
                    <Tooltip title={activeLabel}>
                        <span className="title-bar-path-text">{activeLabel}</span>
                    </Tooltip>
                </div>
            ) : null}

            <Space
                size={4}
                className="title-bar-actions"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
                <Tooltip title="最小化" placement="bottom">
                    <Button
                        type="text"
                        size="small"
                        icon={<MinusOutlined />}
                        onClick={() => {
                            void getElectronAPI()?.window.minimize?.().catch(console.error);
                        }}
                        className="!p-1.5 window-control-btn"
                    />
                </Tooltip>
                <Tooltip title={isMaximized ? '还原' : '最大化'} placement="bottom">
                    <Button
                        type="text"
                        size="small"
                        icon={isMaximized ? <BlockOutlined /> : <BorderOutlined />}
                        onClick={() => {
                            void getElectronAPI()
                                ?.window.toggleMaximize?.()
                                .then(setIsMaximized)
                                .catch(console.error);
                        }}
                        className="!p-1.5 window-control-btn"
                    />
                </Tooltip>
                <Tooltip title="关闭" placement="bottom">
                    <Button
                        type="text"
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={() => window.close()}
                        className="!p-1.5 window-control-btn window-control-close"
                    />
                </Tooltip>
            </Space>
        </div>
    );
}
