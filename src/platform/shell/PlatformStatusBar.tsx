import type { ReactNode } from 'react';

interface PlatformStatusBarProps {
    children: ReactNode;
    actions?: ReactNode;
    className?: string;
}

export default function PlatformStatusBar({
    children,
    actions,
    className,
}: PlatformStatusBarProps) {
    return (
        <div className={`status-bar${className ? ` ${className}` : ''}`}>
            {children}
            {actions ? <div className="status-bar-actions">{actions}</div> : null}
        </div>
    );
}
