import { describe, expect, it } from 'vitest';
import { PATH_BAR_LAYOUT_WIDTH, resolvePathBarLayout } from './pathBarLayout';

describe('resolvePathBarLayout', () => {
    it('returns full when width is at or above compact breakpoint', () => {
        expect(resolvePathBarLayout(PATH_BAR_LAYOUT_WIDTH.compact)).toBe('full');
        expect(resolvePathBarLayout(PATH_BAR_LAYOUT_WIDTH.compact + 100)).toBe('full');
    });

    it('returns compact between tight and compact breakpoints', () => {
        expect(resolvePathBarLayout(PATH_BAR_LAYOUT_WIDTH.compact - 1)).toBe('compact');
        expect(resolvePathBarLayout(PATH_BAR_LAYOUT_WIDTH.tight)).toBe('compact');
    });

    it('returns tight below tight breakpoint', () => {
        expect(resolvePathBarLayout(PATH_BAR_LAYOUT_WIDTH.tight - 1)).toBe('tight');
        expect(resolvePathBarLayout(320)).toBe('tight');
    });
});
