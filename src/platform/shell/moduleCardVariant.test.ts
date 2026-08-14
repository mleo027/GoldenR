import { describe, expect, it } from 'vitest';
import { getModuleCardClassName } from './moduleCardVariant';

describe('getModuleCardClassName', () => {
    it('returns sidebar card classes', () => {
        expect(getModuleCardClassName('sidebar')).toContain('ga-card--sidebar');
    });

    it('adds padding layout for sidebar with padding option', () => {
        const className = getModuleCardClassName('sidebar', { padding: true });
        expect(className).toContain('ga-card--padded');
        expect(className).toContain('flex');
    });

    it('returns empty string for none variant', () => {
        expect(getModuleCardClassName('none')).toBe('');
    });

    it('appends custom className', () => {
        expect(getModuleCardClassName('workspace', { className: 'flex flex-col' })).toContain(
            'flex flex-col',
        );
    });
});
