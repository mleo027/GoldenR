// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    it('shows the empty state and adds a parameter', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<ParamEdit params={[]} onChange={onChange} />);

        await user.click(screen.getByRole('button', { name: /添加参数/ }));

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0]).toHaveLength(1);
    });

    it('renders parameter values in a wrap-capable textarea', () => {
        const longValue = 'x'.repeat(200);
        const view = render(
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

    it('shows SOH markers in the value input and stores raw SOH', async () => {
        const rawValue = `8=FIXT.1.1${String.fromCharCode(1)}9=82`;
        const onChange = vi.fn();
        const view = render(
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
});
