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
});
