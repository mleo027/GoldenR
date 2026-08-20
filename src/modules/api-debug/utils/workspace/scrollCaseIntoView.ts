/**
 * 将侧边栏中指定 case 滚入可视区域并按需聚焦。
 *
 * 仅当该节点当前不在容器可视区域内时才滚动/聚焦，
 * 避免激活项已可见时抢占编辑器或搜索框的焦点。
 *
 * @param root 侧边栏列表容器（非虚拟态为 .case-children，虚拟态为 .case-children-virtual）
 * @param caseId 目标 case 的 id，对应渲染节点上的 data-case-id
 */
export function scrollCaseIntoView(root: HTMLElement | null, caseId: string): void {
    if (!root) return;

    const el = root.querySelector<HTMLElement>(`[data-case-id="${CSS.escape(caseId)}"]`);
    if (!el) return;

    const containerRect = root.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const outOfView = elRect.top < containerRect.top || elRect.bottom > containerRect.bottom;
    if (!outOfView) return;

    el.scrollIntoView({ block: 'nearest' });
    el.focus({ preventScroll: true });
}
