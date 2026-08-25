// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResponseData } from '../../types/workspace';
import ResponsePanel from './ResponsePanel';

Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
    writable: true,
    value: ResizeObserverMock,
});

const responseState = vi.hoisted(() => ({
    value: { code: '0', message: 'ok', data: [] } as ResponseData,
}));

vi.mock('../../store/useTabs', () => ({
    useActiveTab: () => ({
        activeTab: { id: 'case-1', name: 'Case', address: 'host/150501' },
    }),
}));

vi.mock('../../../../store/useAppEnv', () => ({
    useAppEnv: () => ({ env: { showRowIndex: true } }),
}));

vi.mock('../../hooks/useKcbpCall', () => ({
    useKcbpCall: () => ({ loading: false }),
}));

vi.mock('../../store/useResponse', () => ({
    useResponse: () => responseState.value,
}));

describe('ResponsePanel', () => {
    afterEach(cleanup);

    afterEach(() => {
        responseState.value = { code: '0', message: 'ok', data: [] };
    });

    it('shows the code and msg footer when there are no response data rows', () => {
        const { container } = render(<ResponsePanel />);

        expect(container.querySelector('.response-footer')).not.toBeNull();
        expect(container.querySelector('.response-meta-badge')?.textContent).toBe('0');
        expect(container.querySelector('.response-meta-msg')?.textContent).toBe('ok');
    });

    it('shows and switches between multiple result sets', () => {
        responseState.value = {
            code: '0',
            message: 'ok',
            data: [{ id: '1' }],
            resultSets: [
                { name: 'DATA', columns: ['id'], rows: [{ id: '1' }] },
                { name: 'DETAIL', columns: ['value'], rows: [{ value: 'a' }] },
            ],
        };

        render(<ResponsePanel />);

        const selector = screen.getByRole('combobox', { name: '选择响应结果集' });
        expect(selector).toBeTruthy();
        expect(screen.getAllByText('1').length).toBeGreaterThan(0);

        fireEvent.change(selector, { target: { value: '1' } });

        expect(screen.getByText('a')).toBeTruthy();
    });
});
