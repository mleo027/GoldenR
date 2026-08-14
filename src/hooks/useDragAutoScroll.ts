import { useEffect, useRef, type RefObject } from 'react';

const EDGE_PX = 56;
const MAX_SPEED_PX = 18;

export interface DragAutoScrollOptions {
    enabled: boolean;
    /** 限制仅在容器水平范围内触发（例如侧栏列） */
    boundsRef?: RefObject<HTMLElement | null>;
}

function computeScrollDelta(
    scrollRect: DOMRect,
    clientY: number,
    edgePx: number,
    maxSpeedPx: number,
): number {
    const distanceToTop = clientY - scrollRect.top;
    const distanceToBottom = scrollRect.bottom - clientY;

    if (distanceToTop >= 0 && distanceToTop < edgePx) {
        return -maxSpeedPx * (1 - distanceToTop / edgePx);
    }

    if (distanceToBottom >= 0 && distanceToBottom < edgePx) {
        return maxSpeedPx * (1 - distanceToBottom / edgePx);
    }

    if (clientY < scrollRect.top) {
        return -maxSpeedPx;
    }

    if (clientY > scrollRect.bottom) {
        return maxSpeedPx;
    }

    return 0;
}

export function useDragAutoScroll(
    scrollRef: RefObject<HTMLElement | null>,
    { enabled, boundsRef }: DragAutoScrollOptions,
): void {
    const pointerRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (!enabled) return;

        let rafId = 0;

        const onDragOver = (event: DragEvent) => {
            pointerRef.current = { x: event.clientX, y: event.clientY };
        };

        const tick = () => {
            const scrollEl = scrollRef.current;
            if (scrollEl) {
                const boundsEl = boundsRef?.current ?? scrollEl;
                const boundsRect = boundsEl.getBoundingClientRect();
                const { x, y } = pointerRef.current;
                const inHorizontalRange = x >= boundsRect.left && x <= boundsRect.right;

                if (inHorizontalRange) {
                    const delta = computeScrollDelta(
                        scrollEl.getBoundingClientRect(),
                        y,
                        EDGE_PX,
                        MAX_SPEED_PX,
                    );
                    if (delta !== 0) {
                        scrollEl.scrollTop += delta;
                    }
                }
            }

            rafId = requestAnimationFrame(tick);
        };

        document.addEventListener('dragover', onDragOver);
        rafId = requestAnimationFrame(tick);

        return () => {
            document.removeEventListener('dragover', onDragOver);
            cancelAnimationFrame(rafId);
        };
    }, [boundsRef, enabled, scrollRef]);
}

export { computeScrollDelta, EDGE_PX, MAX_SPEED_PX };
