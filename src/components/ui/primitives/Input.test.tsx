// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Input from './Input';

describe('Input', () => {
    afterEach(cleanup);

    it('applies ga-input classes with default md size', () => {
        render(<Input data-testid="inp" />);
        const el = screen.getByTestId('inp');
        expect(el.className).toContain('ga-input');
        expect(el.className).toContain('ga-input--md');
    });

    it('applies sm size class', () => {
        render(<Input data-testid="inp" size="sm" />);
        expect(screen.getByTestId('inp').className).toContain('ga-input--sm');
    });

    it('merges a custom className', () => {
        render(<Input data-testid="inp" className="my-custom" />);
        const el = screen.getByTestId('inp');
        expect(el.className).toContain('ga-input');
        expect(el.className).toContain('my-custom');
    });

    it('forwards value and calls onChange', async () => {
        const onChange = vi.fn();
        render(<Input data-testid="inp" value="hello" onChange={onChange} />);
        await userEvent.click(screen.getByTestId('inp'));
        await userEvent.keyboard('!');
        expect(onChange).toHaveBeenCalled();
    });

    it('applies placeholder', () => {
        render(<Input placeholder="Type here" />);
        expect(screen.getByPlaceholderText('Type here')).toBeTruthy();
    });
});
