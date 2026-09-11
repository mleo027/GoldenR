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
    value: { code: '0', message: 'ok', resultSets: [] } as ResponseData | undefined,
}));

const callState = vi.hoisted(() => ({
    loading: false,
}));

const traceNav = vi.hoisted(() => ({
    openTrace: vi.fn(),
}));

vi.mock('../../store/useTabs', () => ({
    useActiveTab: () => ({
        activeTab: { id: 'case-1', name: 'Case', address: 'host/150501' },
    }),
}));

vi.mock('../../../../store/useAppEnv', () => ({
    useAppEnv: () => ({ env: { showRowIndex: true } }),
}));

vi.mock('../../hooks/useApiCall', () => ({
    useApiCall: () => ({ loading: callState.loading }),
}));

vi.mock('../../store/useResponse', () => ({
    useResponse: () => responseState.value,
}));

vi.mock('../../store/useRequestHistoryNavigation', () => ({
    useRequestHistoryNavigation: () => traceNav,
}));

describe('ResponsePanel', () => {
    afterEach(cleanup);

    afterEach(() => {
        responseState.value = { code: '0', message: 'ok', resultSets: [] };
        callState.loading = false;
    });

    it('shows stable metrics and the server message when there are no response rows', () => {
        const { container } = render(<ResponsePanel />);

        expect(container.querySelector('.response-footer')).toBeNull();
        expect(screen.getByText('状态')).toBeTruthy();
        expect(screen.getByText('耗时')).toBeTruthy();
        expect(screen.getByText('大小')).toBeTruthy();
        expect(screen.getByText('ok')).toBeTruthy();
        expect(container.querySelector('.response-idle-success')).not.toBeNull();
    });

    it('hides the zero row badge before the first request', () => {
        responseState.value = undefined;
        const { container } = render(<ResponsePanel />);

        expect(screen.getByText('配置请求参数后点击 Run')).toBeTruthy();
        expect(
            container.querySelector('.response-section-toggle .param-section-toggle-count'),
        ).toBeNull();
    });

    it('keeps metric positions stable while loading', () => {
        responseState.value = undefined;
        callState.loading = true;
        const { container } = render(<ResponsePanel />);

        expect(container.querySelectorAll('.response-idle-metric')).toHaveLength(3);
        expect(container.querySelector('.response-idle-loading')).not.toBeNull();
        expect(screen.getByText('请求进行中…')).toBeTruthy();
    });

    it('uses the error treatment for failed empty responses', () => {
        responseState.value = { code: '1001', message: '服务调用失败', resultSets: [] };
        const { container } = render(<ResponsePanel />);

        expect(container.querySelector('.response-idle-error')).not.toBeNull();
        expect(screen.getByText('服务调用失败')).toBeTruthy();
    });

    it('renders native headers for an empty result set', () => {
        responseState.value = {
            code: '0',
            message: 'no rows',
            resultSets: [{ name: 'DATA', columns: ['fundid', 'market'], rows: [] }],
        };

        const { container } = render(<ResponsePanel />);

        expect(container.querySelector('.response-idle-metrics')).toBeNull();
        expect(screen.getByText('fundid')).toBeTruthy();
        expect(screen.getByText('market')).toBeTruthy();
        expect(screen.getByText('暂无数据')).toBeTruthy();
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
