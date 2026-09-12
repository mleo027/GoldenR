// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCaseTab } from '../../../../test/factories';
import CaseTreeItem from './CaseTreeItem';

describe('CaseTreeItem', () => {
    afterEach(cleanup);

    it('selects and favorites an interface', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        const onToggleFavorite = vi.fn();
        render(
            <CaseTreeItem
                caseItem={createCaseTab({ name: '登录接口' })}
                caseIndex={0}
                projectIndex={0}
                isActive={false}
                isEditing={false}
                editingName=""
                searchHighlightTerm=""
                inputRef={{ current: null }}
                menuItems={[]}
                onSelect={onSelect}
                onStartRename={vi.fn()}
                onEditingNameChange={vi.fn()}
                onFinishRename={vi.fn()}
                onToggleFavorite={onToggleFavorite}
            />,
        );

        await user.click(screen.getByText('登录接口'));
        await user.click(screen.getByRole('button', { name: '收藏接口' }));

        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onToggleFavorite).toHaveBeenCalledTimes(1);
    });
});
