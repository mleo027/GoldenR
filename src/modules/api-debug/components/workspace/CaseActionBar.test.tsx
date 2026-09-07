// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CaseActionBar from './CaseActionBar';

describe('CaseActionBar', () => {
    afterEach(cleanup);

    it('renders add-project and history buttons', () => {
        render(<CaseActionBar onAddProject={vi.fn()} onOpenHistory={vi.fn()} />);

        expect(screen.getByRole('button', { name: '新建项目' })).toBeTruthy();
        expect(screen.getByRole('button', { name: '请求历史' })).toBeTruthy();
    });

    it('calls onAddProject when add-project button is clicked', async () => {
        const user = userEvent.setup();
        const onAddProject = vi.fn();
        render(<CaseActionBar onAddProject={onAddProject} onOpenHistory={vi.fn()} />);

        await user.click(screen.getByRole('button', { name: '新建项目' }));

        expect(onAddProject).toHaveBeenCalledTimes(1);
    });

    it('calls onOpenHistory when history button is clicked', async () => {
        const user = userEvent.setup();
        const onOpenHistory = vi.fn();
        render(<CaseActionBar onAddProject={vi.fn()} onOpenHistory={onOpenHistory} />);

        await user.click(screen.getByRole('button', { name: '请求历史' }));

        expect(onOpenHistory).toHaveBeenCalledTimes(1);
    });
});
