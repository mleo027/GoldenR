// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createProject } from '../../../../test/factories';
import ProjectTreeItem from './ProjectTreeItem';

describe('ProjectTreeItem import action', () => {
    afterEach(cleanup);

    it('forwards the project import button click', async () => {
        const user = userEvent.setup();
        const onImport = vi.fn();
        const project = createProject({ name: 'Demo' });

        render(
            <ProjectTreeItem
                project={project}
                projectIndex={0}
                caseCount={project.cases.length}
                expanded={false}
                isActive
                isEditing={false}
                editingName=""
                inputRef={{ current: null }}
                menuItems={[]}
                onToggleExpand={vi.fn()}
                onStartRename={vi.fn()}
                onEditingNameChange={vi.fn()}
                onFinishRename={vi.fn()}
                onAddCase={vi.fn()}
                onImport={onImport}
            />,
        );

        await user.click(screen.getByRole('button', { name: '导入接口 JSON|INI' }));
        expect(onImport).toHaveBeenCalledOnce();
    });
});
