import { describe, expect, it } from 'vitest';
import { isEditableShortcutTarget } from './platformShortcutUtils';

describe('isEditableShortcutTarget', () => {
    it('returns false for null', () => {
        expect(isEditableShortcutTarget(null)).toBe(false);
    });

    it('returns false when closest is unavailable', () => {
        expect(isEditableShortcutTarget({} as EventTarget)).toBe(false);
    });

    it('returns true for editable targets', () => {
        const input = {
            closest: (selector: string) => (selector.includes('input') ? input : null),
        };
        expect(isEditableShortcutTarget(input as unknown as EventTarget)).toBe(true);
    });

    it('returns false for non-editable targets', () => {
        const div = {
            closest: () => null,
        };
        expect(isEditableShortcutTarget(div as unknown as EventTarget)).toBe(false);
    });
});
