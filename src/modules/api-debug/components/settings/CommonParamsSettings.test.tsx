// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { CommonParamSet } from '../../types/commonParams';
import CommonParamsSettings from './CommonParamsSettings';

vi.mock('../../hooks/useParamSuggestions', () => ({
    useParamSuggestions: () => ({
        options: [], loading: false, pendingDeps: [], hasRule: false, hasFieldRule: false,
    }),
}));

beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false, media: query, addListener: vi.fn(), removeListener: vi.fn(),
            addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
        })),
    });
    vi.stubGlobal('ResizeObserver', class ResizeObserverMock {
        observe() {}
        disconnect() {}
    });
});

afterAll(() => vi.unstubAllGlobals());

function renderSettings(
    sets: CommonParamSet[],
    overrides: Partial<React.ComponentProps<typeof CommonParamsSettings>> = {},
) {
    const props = {
        sets,
        loaded: true,
        onAdd: vi.fn(),
        onRename: vi.fn(),
        onDelete: vi.fn(),
        onUpdateParams: vi.fn(),
        ...overrides,
    };
    return { ...render(<App><CommonParamsSettings {...props} /></App>), props };
}

describe('CommonParamsSettings', () => {
    afterEach(cleanup);

    it('creates a named parameter set', async () => {
        const user = userEvent.setup();
        const { props } = renderSettings([]);

        await user.click(screen.getByRole('button', { name: /新建参数集/ }));

        expect(props.onAdd).toHaveBeenCalledWith('公共参数 1');
    });

    it('updates the active set name and parameter values', async () => {
        const user = userEvent.setup();
        const { props } = renderSettings([
            { id: 'set-1', name: '交易公共', params: [{ name: 'orgid', value: '', type: 'string' }] },
        ]);

        const nameInput = screen.getByDisplayValue('交易公共');
        await user.clear(nameInput);
        await user.type(nameInput, '交易参数');
        expect(props.onRename).toHaveBeenCalled();

        const valueInput = document.querySelector('.param-value-input textarea') as HTMLTextAreaElement;
        await user.type(valueInput, '0101');
        await waitFor(() => expect(props.onUpdateParams).toHaveBeenCalled());
    });

    it('shows the number of projects using a set before deletion', async () => {
        const user = userEvent.setup();
        const { props } = renderSettings(
            [{ id: 'set-1', name: '交易公共', params: [] }],
            { mountedCountBySet: { 'set-1': 2 } },
        );

        await user.click(screen.getByRole('button', { name: '删除 交易公共' }));
        expect(await screen.findByText(/2 个项目正在使用/)).toBeTruthy();
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /删/ }));
        expect(props.onDelete).toHaveBeenCalledWith('set-1');
    });
});
