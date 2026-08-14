export type PathBarLayout = 'full' | 'compact';

/** 请求栏响应式断点（基于 section header 可用宽度） */
export const PATH_BAR_LAYOUT_WIDTH = {
    /** 辅助按钮收入「更多」；表单/代码、Run 精简 */
    compact: 620,
} as const;

export function resolvePathBarLayout(width: number): PathBarLayout {
    if (width < PATH_BAR_LAYOUT_WIDTH.compact) return 'compact';
    return 'full';
}
