import { describe, expect, it } from 'vitest';
import { computeScrollDelta, EDGE_PX, MAX_SPEED_PX } from './useDragAutoScroll';

describe('computeScrollDelta', () => {
    const scrollRect = {
        top: 100,
        bottom: 500,
        left: 0,
        right: 240,
        width: 240,
        height: 400,
        x: 0,
        y: 100,
        toJSON: () => ({}),
    } as DOMRect;

    it('scrolls up near top edge', () => {
        expect(computeScrollDelta(scrollRect, 110, EDGE_PX, MAX_SPEED_PX)).toBeLessThan(0);
    });

    it('scrolls down near bottom edge', () => {
        expect(computeScrollDelta(scrollRect, 490, EDGE_PX, MAX_SPEED_PX)).toBeGreaterThan(0);
    });

    it('does not scroll in the middle', () => {
        expect(computeScrollDelta(scrollRect, 300, EDGE_PX, MAX_SPEED_PX)).toBe(0);
    });

    it('scrolls when pointer is above the container', () => {
        expect(computeScrollDelta(scrollRect, 80, EDGE_PX, MAX_SPEED_PX)).toBe(-MAX_SPEED_PX);
    });
});
