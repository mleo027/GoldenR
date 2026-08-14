import { describe, expect, it } from 'vitest';
import { getCardClassNames } from './cardClassNames';

describe('getCardClassNames', () => {
    it('returns sidebar card classes', () => {
        expect(getCardClassNames('sidebar')).toContain('ga-card--sidebar');
    });

    it('adds padding layout for sidebar with padding option', () => {
        const className = getCardClassNames('sidebar', { padding: true });
        expect(className).toContain('ga-card--padded');
        expect(className).toContain('flex');
    });

    it('returns empty string for none variant', () => {
        expect(getCardClassNames('none')).toBe('');
    });

    it('appends custom className', () => {
        expect(getCardClassNames('workspace', { className: 'flex flex-col' })).toContain(
            'flex flex-col',
        );
    });

    it('adds accent class when accent is primary', () => {
        expect(getCardClassNames('panel', { accent: 'primary' })).toContain(
            'ga-card--accent-primary',
        );
    });
});
