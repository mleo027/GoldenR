export type PathBarLayout = 'full' | 'compact' | 'tight';

/** 请求栏响应式断点（基于 section header 可用宽度） */
export const PATH_BAR_LAYOUT_WIDTH = {
    /** 辅助按钮收入「更多」；表单/代码、Run 精简 */
    compact: 620,
    /** Queue/Timeout 收入「更多」面板 */
    tight: 480,
} as const;

export function resolvePathBarLayout(width: number): PathBarLayout {
    if (width < PATH_BAR_LAYOUT_WIDTH.tight) return 'tight';
    if (width < PATH_BAR_LAYOUT_WIDTH.compact) return 'compact';
    return 'full';
}
