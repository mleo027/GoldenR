// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ResponseData } from '../../types/workspace';
import ResponseMeta from './ResponseMeta';

describe('ResponseMeta', () => {
    afterEach(cleanup);

    it('shows success status, row count, timing, and call time', () => {
        const response: ResponseData = {
            code: '0',
            message: 'ok',
            data: [{ id: 1 }],
            calledAt: 1_700_000_000_000,
            stats: { rows: 1, timecost: 12 },
        };

        render(<ResponseMeta response={response} />);

        expect(screen.getByText('Success')).toBeTruthy();
        expect(screen.getByText('1 Rows')).toBeTruthy();
        expect(screen.getByText('12 ms')).toBeTruthy();
    });

    it('renders no footer for an empty successful response', () => {
        const response: ResponseData = { code: '0', message: '', data: [] };

        expect(
            render(<ResponseMeta response={response} variant="footer" />).container.innerHTML,
        ).toBe('');
    });
});
