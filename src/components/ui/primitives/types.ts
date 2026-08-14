export type CardVariant = 'none' | 'sidebar' | 'workspace' | 'default' | 'panel';

export type CardAccent = 'none' | 'primary';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link' | 'dangerGhost';

export type PrimitiveSize = 'sm' | 'md';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error' | 'callout';

export type ModalWidth = 'sm' | 'md' | 'lg' | number;

export type DrawerWidth = 'sm' | 'md' | 'lg' | number;

export const MODAL_WIDTHS: Record<'sm' | 'md' | 'lg', number> = {
    sm: 420,
    md: 560,
    lg: 720,
};

export const DRAWER_WIDTHS: Record<'sm' | 'md' | 'lg', number> = {
    sm: 400,
    md: 480,
    lg: 640,
};

export function resolveWidth(
    width: ModalWidth | DrawerWidth | undefined,
    defaults: Record<'sm' | 'md' | 'lg', number>,
    fallback: number,
): number {
    if (width == null) return fallback;
    if (typeof width === 'number') return width;
    return defaults[width];
}
