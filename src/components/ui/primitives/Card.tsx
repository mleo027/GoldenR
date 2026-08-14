import type { ReactNode } from 'react';
import { getCardClassNames } from './cardClassNames';
import type { CardAccent, CardVariant } from './types';

export interface CardProps {
    variant?: CardVariant;
    padding?: boolean;
    title?: ReactNode;
    description?: ReactNode;
    headerActions?: ReactNode;
    accent?: CardAccent;
    bodyClassName?: string;
    className?: string;
    children?: ReactNode;
}

export default function Card({
    variant = 'default',
    padding = false,
    title,
    description,
    headerActions,
    accent = 'none',
    bodyClassName,
    className,
    children,
}: CardProps) {
    if (variant === 'none') {
        return className ? <div className={className}>{children}</div> : <>{children}</>;
    }

    const rootClassName = getCardClassNames(variant, { padding, className, accent });
    const hasHeader = title != null || description != null || headerActions != null;
    const isPanel = variant === 'panel';

    if (isPanel) {
        const bodyClasses = ['ga-card__body', 'ga-card__body--padded', bodyClassName]
            .filter(Boolean)
            .join(' ');

        return (
            <div className={rootClassName}>
                {hasHeader ? (
                    <div
                        className={`ga-card__header${headerActions != null ? ' ga-card__header--split' : ''}`}
                    >
                        <div className="ga-card__header-main">
                            {title != null ? <h3 className="ga-card__title">{title}</h3> : null}
                            {description != null ? (
                                <p className="ga-card__desc">{description}</p>
                            ) : null}
                        </div>
                        {headerActions != null ? (
                            <div className="ga-card__header-actions">{headerActions}</div>
                        ) : null}
                    </div>
                ) : null}
                <div className={bodyClasses}>{children}</div>
            </div>
        );
    }

    return <div className={rootClassName}>{children}</div>;
}
