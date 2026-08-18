// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ParamTextEdit from './ParamTextEdit';

describe('ParamTextEdit', () => {
    afterEach(cleanup);

    it('renders the current value and reports edits', async () => {
        const onChange = vi.fn();

        const view = render(<ParamTextEdit value="foo=bar" onChange={onChange} />);

        const input = within(view.container).getByRole('textbox');
        expect((input as HTMLTextAreaElement).value).toBe('foo=bar');
        fireEvent.change(input, { target: { value: 'id=1' } });

        expect(onChange).toHaveBeenLastCalledWith('id=1');
    });

    it('shows validation feedback when an error is supplied', () => {
        const view = render(<ParamTextEdit value="bad" error="参数格式错误" onChange={vi.fn()} />);

        expect(screen.getByText('参数格式错误')).toBeTruthy();
        expect(
            within(view.container)
                .getByRole('textbox')
                .classList.contains('param-text-textarea-error'),
        ).toBe(true);
    });

    it('shows SOH markers without changing the stored value', () => {
        const rawValue = `8=FIXT.1.1${String.fromCharCode(1)}9=82`;
        const onChange = vi.fn();
        const view = render(<ParamTextEdit value={rawValue} onChange={onChange} />);

        const input = within(view.container).getByRole('textbox') as HTMLTextAreaElement;
        expect(input.value).toBe('8=FIXT.1.1□9=82');
        expect(view.container.querySelector('.param-text-soh-preview')).toBeNull();

        fireEvent.change(input, {
            target: { value: `8=FIXT.1.1□9=83` },
        });

        expect(onChange).toHaveBeenLastCalledWith(`8=FIXT.1.1${String.fromCharCode(1)}9=83`);
    });

    it('copies raw SOH instead of the display marker', () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText },
        });
        const view = render(<ParamTextEdit value="x" onChange={vi.fn()} />);
        const input = within(view.container).getByRole('textbox') as HTMLTextAreaElement;

        fireEvent.copy(input, {
            target: {
                value: '8=FIXT.1.1□9=82',
                selectionStart: 10,
                selectionEnd: 11,
            },
        });

        expect(writeText).toHaveBeenCalledWith(String.fromCharCode(1));
    });

    it('keeps literal square characters distinct from SOH markers', () => {
        const onChange = vi.fn();
        const view = render(<ParamTextEdit value="字面□值" onChange={onChange} />);
        const input = within(view.container).getByRole('textbox') as HTMLTextAreaElement;

        expect(input.value).toBe('字面■值');

        fireEvent.change(input, { target: { value: '字面■X' } });
        expect(onChange).toHaveBeenLastCalledWith('字面□X');
    });
});
