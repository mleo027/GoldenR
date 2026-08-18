import { memo, type MouseEvent, type ReactNode } from 'react';
import { CloseOutlined } from '@ant-design/icons';

export interface TitleBarTabItem {
    key: string;
    label: string;
    active?: boolean;
    leadingIcon?: ReactNode;
    icon?: ReactNode;
    onSelect: () => void;
    onClose?: () => void;
}

interface TitleBarTabBarProps {
    items: TitleBarTabItem[];
    variant?: 'default' | 'title-bar';
    canClose?: boolean;
    onCloseOthers?: () => void;
}

function TitleBarTabBar({
    items,
    variant = 'title-bar',
    canClose,
    onCloseOthers,
}: TitleBarTabBarProps) {
    const isTitleBar = variant === 'title-bar';

    if (items.length === 0) {
        return isTitleBar ? (
            <div className="title-bar-drag-fill title-bar-drag-fill--solo" aria-hidden />
        ) : null;
    }

    const closable = canClose ?? items.length > 1;

    const handleClose = (event: MouseEvent, item: TitleBarTabItem) => {
        event.stopPropagation();
        item.onClose?.();
    };

    return (
        <div className={`case-tab-bar${isTitleBar ? ' case-tab-bar-title' : ''}`}>
            <div className="case-tab-bar-scroll ui-scroll">
                {items.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        className={`case-tab-item${item.active ? ' case-tab-item-active' : ''}${item.icon ? ' case-tab-item-favorite' : ''}${isTitleBar ? ' case-tab-item-title' : ''}`}
                        style={
                            isTitleBar
                                ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties)
                                : undefined
                        }
                        title={item.label}
                        onClick={item.onSelect}
                        onMouseDown={(event) => {
                            if (event.button === 1 && closable && item.onClose) {
                                event.preventDefault();
                                item.onClose();
                            }
                        }}
                    >
                        {item.leadingIcon ? (
                            <span className="case-tab-leading-icon" aria-hidden>
                                {item.leadingIcon}
                            </span>
                        ) : null}
                        {item.icon ? (
                            <span className="case-tab-favorite" aria-hidden>
                                {item.icon}
                            </span>
                        ) : null}
                        <span className="case-tab-label">{item.label}</span>
                        {closable && item.onClose ? (
                            <span
                                role="button"
                                tabIndex={-1}
                                className="case-tab-close"
                                aria-label="关闭页签"
                                style={
                                    isTitleBar
                                        ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties)
                                        : undefined
                                }
                                onClick={(event) => handleClose(event, item)}
                            >
                                <CloseOutlined />
                            </span>
                        ) : null}
                    </button>
                ))}
            </div>
            {onCloseOthers ? (
                <button
                    type="button"
                    className="case-tab-close-others"
                    style={
                        isTitleBar
                            ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties)
                            : undefined
                    }
                    onClick={onCloseOthers}
                >
                    关闭其他
                </button>
            ) : null}
            {isTitleBar ? <div className="title-bar-drag-fill" aria-hidden /> : null}
        </div>
    );
}

export default memo(TitleBarTabBar);
