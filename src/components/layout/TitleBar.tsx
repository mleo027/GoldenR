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
        if (!api?.isWindowMaximized) return;

        void api.isWindowMaximized().then(setIsMaximized);

        const unsubscribe = api.onWindowMaximizedChange?.(setIsMaximized);
        return () => unsubscribe?.();
    }, []);

    const activeLabel = breadcrumb || moduleLabel;

    return (
        <div className="title-bar" style={{ userSelect: 'none' } as React.CSSProperties}>
            <div className="title-bar-brand">
                <GoldenApiLogo size={28} className="title-bar-logo" title="Golden API Debug" />
                <span className="title-bar-name">Golden API Debug</span>
                {moduleLabel && !useTitleBarSlot ? (
                    <span className="title-bar-module" title={moduleLabel}>
                        {moduleLabel}
                    </span>
                ) : null}
            </div>

            <div
                id={TITLE_BAR_SLOT_ID}
                className={`title-bar-slot${useTitleBarSlot ? ' title-bar-slot-active' : ''}`}
            />

            {!useTitleBarSlot ? (
                <div className="title-bar-path">
                    <span className="title-bar-path-text" title={activeLabel}>
                        {activeLabel}
                    </span>
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
                        onClick={() => getElectronAPI()?.minimizeWindow?.()}
                        className="!p-1.5 window-control-btn"
                    />
                </Tooltip>
                <Tooltip title={isMaximized ? '还原' : '最大化'} placement="bottom">
                    <Button
                        type="text"
                        size="small"
                        icon={isMaximized ? <BlockOutlined /> : <BorderOutlined />}
                        onClick={() => {
                            void getElectronAPI()?.toggleMaximizeWindow?.().then(setIsMaximized);
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
