export type PathBarLayout = 'full' | 'compact' | 'narrow';

/** 请求栏响应式断点（基于 section header 可用宽度） */
export const PATH_BAR_LAYOUT_WIDTH = {
    /** 完整展示全部请求字段。 */
    full: 1200,
    /** 仅保留关键字段，连接详情进入展开面板。 */
    compact: 900,
} as const;

export function resolvePathBarLayout(width: number): PathBarLayout {
    if (width >= PATH_BAR_LAYOUT_WIDTH.full) return 'full';
    if (width >= PATH_BAR_LAYOUT_WIDTH.compact) return 'compact';
    return 'narrow';
}
