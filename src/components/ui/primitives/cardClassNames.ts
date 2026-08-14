import type { CardVariant } from './types';

export function getCardClassNames(
    variant: CardVariant,
    options?: { padding?: boolean; className?: string; accent?: 'none' | 'primary' },
): string {
    if (variant === 'none') {
        return options?.className ?? '';
    }

    const parts = ['ga-card', `ga-card--${variant}`];

    if (options?.accent === 'primary') {
        parts.push('ga-card--accent-primary');
    }

    if (variant === 'sidebar') {
        parts.push('h-full', 'min-h-0', 'min-w-0');
        if (options?.padding) {
            parts.push('ga-card--padded', 'flex', 'flex-col', 'overflow-hidden');
        }
    } else if (variant === 'workspace') {
        parts.push('flex', 'flex-col', 'h-full', 'min-h-0', 'min-w-0', 'overflow-hidden');
    } else if (variant === 'default') {
        parts.push('h-full', 'min-h-0', 'min-w-0', 'overflow-hidden');
        if (options?.padding) {
            parts.push('ga-card--padded');
        }
    }

    if (options?.className) {
        parts.push(options.className);
    }

    return parts.join(' ');
}
