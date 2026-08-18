// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ParamEdit from './ParamEdit';

describe('ParamEdit', () => {
    afterEach(cleanup);

    it('shows the empty state and adds a parameter', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<ParamEdit params={[]} onChange={onChange} />);

        await user.click(screen.getByRole('button', { name: /添加参数/ }));

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0]).toHaveLength(1);
    });
});
