// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ResponsePanel from './ResponsePanel';

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
    useResponse: () => ({ code: '0', message: 'ok', data: [] }),
}));

describe('ResponsePanel', () => {
    afterEach(cleanup);

    it('shows the code and msg footer when there are no response data rows', () => {
        const { container } = render(<ResponsePanel />);

        expect(container.querySelector('.response-footer')).not.toBeNull();
        expect(container.querySelector('.response-meta-badge')?.textContent).toBe('0');
        expect(container.querySelector('.response-meta-msg')?.textContent).toBe('ok');
    });
});
