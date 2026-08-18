// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useEditorModeActions } from '../../hooks/useEditorModeActions';
import EditorModeToggle from './EditorModeToggle';

vi.mock('../../hooks/useEditorModeActions', () => ({
    useEditorModeActions: vi.fn(),
}));

const mockedUseEditorModeActions = vi.mocked(useEditorModeActions);

describe('EditorModeToggle', () => {
    it('marks the active mode and switches mode on click', async () => {
        const switchEditorMode = vi.fn();
        mockedUseEditorModeActions.mockReturnValue({ editorMode: 'ui', switchEditorMode });
        const user = userEvent.setup();

        render(<EditorModeToggle />);

        const formButton = screen.getByRole('button', { name: /表单/ });
        expect(formButton.getAttribute('aria-pressed')).toBe('true');
        await user.click(screen.getByRole('button', { name: /代码/ }));
        expect(switchEditorMode).toHaveBeenCalledWith('script');
    });
});
