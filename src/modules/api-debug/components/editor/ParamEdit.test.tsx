// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import type { ReactElement } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import ParamEdit from './ParamEdit';

vi.mock('../../hooks/useParamSuggestions', () => ({
    useParamSuggestions: () => ({
        options: [],
        loading: false,
        pendingDeps: [],
        hasRule: false,
        hasFieldRule: false,
    }),
}));

describe('ParamEdit', () => {
    beforeAll(() => {
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            value: vi.fn().mockImplementation((query: string) => ({
                matches: false,
                media: query,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
        vi.stubGlobal(
            'ResizeObserver',
            class ResizeObserverMock {
                observe() {}
                unobserve() {}
                disconnect() {}
            },
        );
    });

    afterAll(() => {
        vi.unstubAllGlobals();
    });

    afterEach(cleanup);

    const renderParamEdit = (ui: ReactElement) => render(<App>{ui}</App>);

    it('shows the empty state and adds a parameter', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderParamEdit(<ParamEdit params={[]} onChange={onChange} />);

        await user.click(screen.getByRole('button', { name: /添加参数/ }));

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0]).toHaveLength(1);
    });

    it('renders parameter values in a wrap-capable textarea', () => {
        const longValue = 'x'.repeat(200);
        const view = renderParamEdit(
            <ParamEdit
                params={[{ name: 'key', value: longValue, type: 'string' }]}
                onChange={vi.fn()}
            />,
        );

        const textarea = view.container.querySelector(
            '.param-value-input textarea',
        ) as HTMLTextAreaElement;
        expect(textarea).toBeTruthy();
        expect(textarea.value).toBe(longValue);
    });

    it('shows a readable placeholder and dims disabled values without removing them', () => {
        const view = renderParamEdit(
            <ParamEdit
                params={[
                    { name: 'empty', value: '', type: 'string' },
                    { name: 'disabledKey', value: 'still-readable', type: 'disabled' },
                ]}
                onChange={vi.fn()}
            />,
        );

        const textareas = view.container.querySelectorAll('.param-value-input textarea');
        expect(textareas[0].getAttribute('placeholder')).toBe('未设置');
        expect((textareas[1] as HTMLTextAreaElement).value).toBe('still-readable');
        expect(textareas[1].closest('tr')?.className).toContain('param-row-disabled');
    });

    it('removes a parameter immediately from the row action', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderParamEdit(
            <ParamEdit
                params={[
                    { name: 'first', value: '1', type: 'string' },
                    { name: 'second', value: '2', type: 'string' },
                ]}
                onChange={onChange}
            />,
        );

        await user.click(screen.getAllByRole('button', { name: '删除参数' })[0]);
        expect(onChange).toHaveBeenLastCalledWith([{ name: 'second', value: '2', type: 'string' }]);
    });

    it('shows SOH markers in the value input and stores raw SOH', async () => {
        const rawValue = `8=FIXT.1.1${String.fromCharCode(1)}9=82`;
        const onChange = vi.fn();
        const view = renderParamEdit(
            <ParamEdit
                params={[{ name: 'key', value: rawValue, type: 'string' }]}
                onChange={onChange}
            />,
        );

        const textarea = view.container.querySelector(
            '.param-value-input textarea',
        ) as HTMLTextAreaElement;
        expect(textarea.value).toBe('8=FIXT.1.1□9=82');
        expect(view.container.querySelector('.param-value-soh-preview')).toBeNull();

        fireEvent.change(textarea, {
            target: { value: `8=FIXT.1.1□9=83` },
        });

        await waitFor(() => {
            const updated = onChange.mock.calls.at(-1)?.[0] as Array<{ value: string }>;
            expect(updated?.[0]?.value).toBe(`8=FIXT.1.1${String.fromCharCode(1)}9=83`);
        });
    });

    it('renders common parameters as a collapsed read-only panel', async () => {
        const user = userEvent.setup();
        const view = renderParamEdit(
            <ParamEdit
                params={[]}
                onChange={vi.fn()}
                commonParams={[
                    { name: 'orgid', value: '0101', type: 'string' },
                    { name: 'brhid', value: '1', type: 'string' },
                ]}
            />,
        );

        const toggle = screen.getByRole('button', { name: /公共参数/ });
        expect(toggle.textContent).toContain('2');
        expect(view.container.textContent).not.toContain('0101');

        await user.click(toggle);
        expect(view.container.textContent).toContain('0101');
        expect(view.container.querySelector('.common-params-value textarea')).toBeNull();
    });

    it('does not render the common parameter panel when no parameters are supplied', () => {
        renderParamEdit(<ParamEdit params={[]} onChange={vi.fn()} />);
        expect(screen.queryByRole('button', { name: /公共参数/ })).toBeNull();
    });
});
