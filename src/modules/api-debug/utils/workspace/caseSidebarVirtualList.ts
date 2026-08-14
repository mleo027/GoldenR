export const CASE_SIDEBAR_ITEM_HEIGHT = 34;

/** 虚拟列表可视高度：在「内容总高」与「侧栏可用视口」之间取较小值 */
export function computeCaseVirtualListHeight(
    caseCount: number,
    availableViewportPx: number,
    itemHeight = CASE_SIDEBAR_ITEM_HEIGHT,
): number {
    if (caseCount <= 0) return itemHeight;

    const naturalHeight = caseCount * itemHeight;
    const viewport = Math.max(0, availableViewportPx);
    return Math.max(itemHeight, Math.min(naturalHeight, viewport));
}

/** 根据 DOM 几何计算接口列表可用视口高度（px） */
export function measureCaseListViewportHeight(container: HTMLElement): number {
    const scrollList = container.closest('.case-sidebar-list');
    if (!scrollList) return 0;

    const scrollRect = scrollList.getBoundingClientRect();
    const listTop = container.getBoundingClientRect().top;
    return Math.max(0, scrollRect.bottom - listTop);
}
