// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CaseActionBar from './CaseActionBar';
import { SettingsModalContext } from '../../../../platform/shell/SettingsModalContext';

const openSettings = vi.fn();
function renderBar(props: React.ComponentProps<typeof CaseActionBar>) {
    return render(
        <SettingsModalContext.Provider
            value={{ open: false, openSettings, closeSettings: vi.fn() }}
        >
            <CaseActionBar {...props} />
        </SettingsModalContext.Provider>,
    );
}

describe('CaseActionBar', () => {
    afterEach(cleanup);

    it('renders add-project and history buttons', () => {
        renderBar({ onAddProject: vi.fn(), onOpenHistory: vi.fn() });

        expect(screen.getByRole('button', { name: '新建项目' })).toBeTruthy();
        expect(screen.getByRole('button', { name: '请求历史' })).toBeTruthy();
    });

    it('calls onAddProject when add-project button is clicked', async () => {
        const user = userEvent.setup();
        const onAddProject = vi.fn();
        renderBar({ onAddProject, onOpenHistory: vi.fn() });

        await user.click(screen.getByRole('button', { name: '新建项目' }));

        expect(onAddProject).toHaveBeenCalledTimes(1);
    });

    it('calls onOpenHistory when history button is clicked', async () => {
        const user = userEvent.setup();
        const onOpenHistory = vi.fn();
        renderBar({ onAddProject: vi.fn(), onOpenHistory });

        await user.click(screen.getByRole('button', { name: '请求历史' }));

        expect(onOpenHistory).toHaveBeenCalledTimes(1);
    });

    it('opens common params settings from the action bar', async () => {
        const user = userEvent.setup();
        openSettings.mockClear();
        renderBar({ onAddProject: vi.fn(), onOpenHistory: vi.fn() });
        await user.click(screen.getByRole('button', { name: '公共参数' }));
        expect(openSettings).toHaveBeenCalledWith('api-common-params');
    });
});
