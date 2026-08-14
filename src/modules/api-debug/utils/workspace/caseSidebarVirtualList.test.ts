import { describe, expect, it } from 'vitest';
import { CASE_SIDEBAR_ITEM_HEIGHT, computeCaseVirtualListHeight } from './caseSidebarVirtualList';

describe('computeCaseVirtualListHeight', () => {
    it('fills available viewport when cases exceed visible area', () => {
        expect(computeCaseVirtualListHeight(859, 640)).toBe(640);
    });

    it('uses natural height when cases fit in viewport', () => {
        expect(computeCaseVirtualListHeight(10, 640)).toBe(10 * CASE_SIDEBAR_ITEM_HEIGHT);
    });

    it('never returns less than one row height', () => {
        expect(computeCaseVirtualListHeight(100, 0)).toBe(CASE_SIDEBAR_ITEM_HEIGHT);
    });
});
