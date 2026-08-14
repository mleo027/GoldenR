import type { ReactNode } from 'react';

export interface EmptyProps {
    icon: ReactNode;
    title: string;
    description?: ReactNode;
    action?: ReactNode;
    prompts?: ReactNode;
    variant?: 'default' | 'compact';
    className?: string;
}

export default function Empty({
    icon,
    title,
    description,
    action,
    prompts,
    variant = 'default',
    className,
}: EmptyProps) {
    return (
        <div
            className={`ga-empty${variant === 'compact' ? ' ga-empty--compact' : ''}${className ? ` ${className}` : ''}`}
        >
            <div className="ga-empty__icon">{icon}</div>
            <p className="ga-empty__title">{title}</p>
            {description != null ? <div className="ga-empty__desc">{description}</div> : null}
            {prompts != null ? <div className="ga-empty__prompts">{prompts}</div> : null}
            {action != null ? <div className="ga-empty__action">{action}</div> : null}
        </div>
    );
}
