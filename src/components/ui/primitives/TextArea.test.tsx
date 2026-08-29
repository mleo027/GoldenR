// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TextArea from './TextArea';

describe('TextArea', () => {
    afterEach(cleanup);

    it('applies ga-textarea class', () => {
        render(<TextArea data-testid="ta" />);
        expect(screen.getByTestId('ta').className).toContain('ga-textarea');
    });

    it('merges a custom className', () => {
        render(<TextArea data-testid="ta" className="custom-ta" />);
        const el = screen.getByTestId('ta');
        expect(el.className).toContain('ga-textarea');
        expect(el.className).toContain('custom-ta');
    });

    it('forwards placeholder', () => {
        render(<TextArea placeholder="Type content" />);
        expect(screen.getByPlaceholderText('Type content')).toBeTruthy();
    });

    it('calls onChange when typing', async () => {
        const onChange = vi.fn();
        render(<TextArea data-testid="ta" onChange={onChange} />);
        await screen.getByTestId('ta').focus();
        await userEvent.paste('hello');
        expect(onChange).toHaveBeenCalled();
    });
});
