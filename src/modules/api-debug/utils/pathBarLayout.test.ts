import { describe, expect, it } from 'vitest';
import { PATH_BAR_LAYOUT_WIDTH, resolvePathBarLayout } from './pathBarLayout';

describe('resolvePathBarLayout', () => {
    it('returns full when width is at or above the full breakpoint', () => {
        expect(resolvePathBarLayout(PATH_BAR_LAYOUT_WIDTH.full)).toBe('full');
        expect(resolvePathBarLayout(PATH_BAR_LAYOUT_WIDTH.full + 100)).toBe('full');
    });

    it('returns compact between the two breakpoints', () => {
        expect(resolvePathBarLayout(PATH_BAR_LAYOUT_WIDTH.full - 1)).toBe('compact');
        expect(resolvePathBarLayout(PATH_BAR_LAYOUT_WIDTH.compact)).toBe('compact');
    });

    it('returns narrow below the compact breakpoint', () => {
        expect(resolvePathBarLayout(PATH_BAR_LAYOUT_WIDTH.compact - 1)).toBe('narrow');
        expect(resolvePathBarLayout(1)).toBe('narrow');
    });
});
