import { describe, expect, it } from 'vitest';
import { allowWindowClose, isWindowCloseAllowed } from './closeGuard';

describe('closeGuard', () => {
    it('blocks close until the quit flush explicitly allows it', () => {
        expect(isWindowCloseAllowed()).toBe(false);
        allowWindowClose();
        expect(isWindowCloseAllowed()).toBe(true);
    });
});
