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
    value: { code: '0', message: 'ok', resultSets: [] } as ResponseData,
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
        responseState.value = { code: '0', message: 'ok', resultSets: [] };
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
            resultSets: [
                { name: 'DATA', rows: [{ id: '1' }] },
                { name: 'DETAIL', rows: [{ value: 'a' }] },
            ],
        };

        render(<ResponsePanel />);

        const tabs = screen.getAllByRole('tab');
        expect(tabs).toHaveLength(2);
        expect(tabs[0].textContent).toContain('DATA');
        expect(tabs[1].textContent).toContain('DETAIL');
        expect(screen.getAllByText('1').length).toBeGreaterThan(0);

        fireEvent.click(tabs[1]);

        expect(screen.getByText('a')).toBeTruthy();
    });

    it('keeps duplicate native result-set names as separate tabs', () => {
        responseState.value = {
            code: '0',
            message: '查询成功',
            resultSets: [
                { name: 'DATA', rows: [{ id: '1' }, { id: '2' }] },
                { name: 'DATA', rows: [{ id: '3' }] },
            ],
        };

        render(<ResponsePanel />);

        const tabs = screen.getAllByRole('tab');
        expect(tabs).toHaveLength(2);
        expect(tabs[0].textContent).toBe('DATA 12');
        expect(tabs[1].textContent).toBe('DATA 21');

        fireEvent.click(tabs[1]);
        expect(screen.getByText('3')).toBeTruthy();
    });
});
