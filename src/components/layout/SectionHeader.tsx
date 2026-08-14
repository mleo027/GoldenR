import { forwardRef, type ReactNode } from 'react';
import { Typography } from 'antd';

type RequestHeaderLayout = 'full' | 'compact';

interface SectionHeaderProps {
    icon: ReactNode;
    iconClassName?: string;
    title: string;
    children?: ReactNode;
    actions?: ReactNode;
    /** 置于 actions 右侧（如 Run），始终贴齐行尾 */
    endActions?: ReactNode;
    compact?: boolean;
    /** 请求栏响应式布局，用于窄屏折叠标题等 */
    layout?: RequestHeaderLayout;
}

const SectionHeader = forwardRef<HTMLDivElement, SectionHeaderProps>(function SectionHeader(
    { icon, iconClassName, title, children, actions, endActions, compact = false, layout },
    ref,
) {
    const layoutClass = layout === 'compact' ? ' section-header--layout-compact' : '';

    return (
        <div
            ref={ref}
            className={`section-header flex items-center gap-3 pl-2.5 pr-0 border-b border-[var(--color-divider)] shrink-0${
                compact ? ' section-header--compact' : ' py-1.5 min-h-[52px]'
            }${layoutClass}`}
        >
            <div className="section-header-leading flex items-center gap-2 shrink-0">
                <span className={iconClassName}>{icon}</span>
                <Typography.Text
                    strong
                    className="section-header-title text-sm text-[var(--color-text-title)]"
                >
                    {title}
                </Typography.Text>
            </div>
            {children != null ? (
                <div className="section-header-path-wrap ui-scroll">{children}</div>
            ) : null}
            {actions != null || endActions != null ? (
                <div className="section-header-trailing shrink-0">
                    {actions}
                    {endActions}
                </div>
            ) : null}
        </div>
    );
});

export default SectionHeader;
