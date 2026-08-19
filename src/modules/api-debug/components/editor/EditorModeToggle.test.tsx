// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEditorModeActions } from '../../hooks/useEditorModeActions';
import EditorModeToggle from './EditorModeToggle';

vi.mock('../../hooks/useEditorModeActions', () => ({
    useEditorModeActions: vi.fn(),
}));

const mockedUseEditorModeActions = vi.mocked(useEditorModeActions);

describe('EditorModeToggle', () => {
    it('marks form mode active and keeps code mode hidden', () => {
        const switchEditorMode = vi.fn();
        mockedUseEditorModeActions.mockReturnValue({ editorMode: 'ui', switchEditorMode });

        render(<EditorModeToggle />);

        const formButton = screen.getByRole('button', { name: /表单/ });
        expect(formButton.getAttribute('aria-pressed')).toBe('true');
        expect(screen.queryByRole('button', { name: /代码/ })).toBeNull();
        expect(switchEditorMode).not.toHaveBeenCalled();
    });
});
