// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import AboutSettings from './AboutSettings';

describe('AboutSettings', () => {
    afterEach(cleanup);

    it('provides email and copy actions for the developer contact', () => {
        const { container } = render(<AboutSettings />);
        const emailLink = screen.getByRole('link', { name: 'meilingfeng@szkingdom.com' });

        expect(emailLink.getAttribute('href')).toBe('mailto:meilingfeng@szkingdom.com');
        expect(container.querySelector('.ant-typography-copy')).not.toBeNull();
    });
});
