// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CaseFolderTreeNode } from '../../utils/workspace/caseFolders';
import CaseFolderTree from './CaseFolderTree';

const folderNode: CaseFolderTreeNode = {
    folder: {
        id: 'folder-1',
        name: '嵌套目录名称',
        position: 0,
        createdAt: 1,
        updatedAt: 1,
    },
    cases: [],
    folders: [],
};

function renderTree(forceExpanded = false) {
    return render(
        <CaseFolderTree
            folders={[folderNode]}
            renderCases={() => <span data-testid="folder-cases">matched case</span>}
            projectIndex={0}
            isEditing={() => false}
            editingName=""
            inputRef={{ current: null }}
            onStartRename={vi.fn()}
            onEditingNameChange={vi.fn()}
            onFinishRename={vi.fn()}
            getMenu={() => []}
            forceExpanded={forceExpanded}
        />,
    );
}

describe('CaseFolderTree', () => {
    afterEach(cleanup);

    it('keeps matching folders expanded while search is active', () => {
        const view = renderTree(false);
        fireEvent.click(screen.getByText('嵌套目录名称'));
        expect(screen.queryByTestId('folder-cases')).toBeNull();

        view.rerender(
            <CaseFolderTree
                folders={[folderNode]}
                renderCases={() => <span data-testid="folder-cases">matched case</span>}
                projectIndex={0}
                isEditing={() => false}
                editingName=""
                inputRef={{ current: null }}
                onStartRename={vi.fn()}
                onEditingNameChange={vi.fn()}
                onFinishRename={vi.fn()}
                getMenu={() => []}
                forceExpanded
            />,
        );

        expect(screen.getByTestId('folder-cases')).toBeTruthy();
    });

    it('renders child folders before the parent folder cases', () => {
        const child = {
            ...folderNode,
            folder: { ...folderNode.folder, id: 'folder-2', name: '子目录' },
        };
        const parent = {
            ...folderNode,
            folder: { ...folderNode.folder, name: '父目录' },
            folders: [child],
        };
        render(
            <CaseFolderTree
                folders={[parent]}
                renderCases={(node) => (
                    <span>{node.folder.name === '父目录' ? '父目录用例' : '子目录用例'}</span>
                )}
                projectIndex={0}
                isEditing={() => false}
                editingName=""
                inputRef={{ current: null }}
                onStartRename={vi.fn()}
                onEditingNameChange={vi.fn()}
                onFinishRename={vi.fn()}
                getMenu={() => []}
            />,
        );
        const content = document.body.textContent ?? '';
        expect(content.indexOf('子目录用例')).toBeLessThan(content.indexOf('父目录用例'));
    });
});
