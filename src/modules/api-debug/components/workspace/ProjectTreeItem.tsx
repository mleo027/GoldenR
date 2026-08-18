import { Button, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
    PlusOutlined,
    FolderOutlined,
    FolderOpenOutlined,
    CaretRightOutlined,
    CaretDownOutlined,
    ImportOutlined,
} from '@ant-design/icons';
import { memo, type RefObject } from 'react';
import type { InputRef } from 'antd';
import type { ProjectData } from '../../types/workspace';
import InlineRenameInput from './InlineRenameInput';

interface ProjectTreeItemProps {
    project: ProjectData;
    projectIndex: number;
    caseCount: number;
    expanded: boolean;
    isActive: boolean;
    isEditing: boolean;
    editingName: string;
    inputRef: RefObject<InputRef | null>;
    menuItems: MenuProps['items'];
    onToggleExpand: () => void;
    onStartRename: () => void;
    onEditingNameChange: (value: string) => void;
    onFinishRename: () => void;
    onAddCase: () => void;
    onImport: () => void;
}

function ProjectTreeItem({
    project,
    caseCount,
    expanded,
    isActive,
    isEditing,
    editingName,
    inputRef,
    menuItems,
    onToggleExpand,
    onStartRename,
    onEditingNameChange,
    onFinishRename,
    onAddCase,
    onImport,
}: ProjectTreeItemProps) {
    return (
        <Dropdown menu={{ items: menuItems }} trigger={['contextMenu']}>
            <div
                className={`case-project group${expanded ? ' case-project-expanded' : ''}${isActive ? ' case-project-active' : ''}`}
                onClick={onToggleExpand}
                onDoubleClick={(event) => {
                    event.stopPropagation();
                    onStartRename();
                }}
            >
                <span className="case-project-caret">
                    {expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
                </span>
                <span className="case-project-icon">
                    {expanded ? <FolderOpenOutlined /> : <FolderOutlined />}
                </span>
                {isEditing ? (
                    <InlineRenameInput
                        inputRef={inputRef}
                        value={editingName}
                        onChange={onEditingNameChange}
                        onFinish={onFinishRename}
                        onClick={(event) => event.stopPropagation()}
                    />
                ) : (
                    <span className="case-project-label" title={project.name}>
                        {project.name}
                        <span className="case-project-count">{caseCount}</span>
                    </span>
                )}
                {!isEditing && (
                    <div className="case-item-actions">
                        <Button
                            type="text"
                            size="small"
                            icon={<ImportOutlined className="text-[10px]" />}
                            className="case-item-action"
                            title="导入接口 JSON|INI"
                            onClick={(event) => {
                                event.stopPropagation();
                                onImport();
                            }}
                        />
                        <Button
                            type="text"
                            size="small"
                            icon={<PlusOutlined className="text-[10px]" />}
                            className="case-item-action"
                            title="为该项目添加接口"
                            onClick={(event) => {
                                event.stopPropagation();
                                onAddCase();
                            }}
                        />
                    </div>
                )}
            </div>
        </Dropdown>
    );
}

export default memo(ProjectTreeItem);
