// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Password from './Password';

describe('Password', () => {
    afterEach(cleanup);

    it('renders an input that accepts a password', () => {
        render(<Password data-testid="pwd" />);
        const el = screen.getByTestId('pwd');
        expect(el.tagName).toBe('INPUT');
        expect((el as HTMLInputElement).type).toBe('password');
    });

    it('applies placeholder', () => {
        render(<Password placeholder="Enter password" />);
        expect(screen.getByPlaceholderText('Enter password')).toBeTruthy();
    });

    it('accepts a custom className without throwing', () => {
        const { container } = render(<Password className="extra" />);
        expect(container.querySelector('input')).toBeTruthy();
    });
});
