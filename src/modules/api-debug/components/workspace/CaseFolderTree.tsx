import { Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { FolderOpenOutlined, RightOutlined } from '@ant-design/icons';
import { useState, type DragEvent, type RefObject, type ReactNode } from 'react';
import { Input } from '../../../../components/ui/primitives';
import type { InputRef } from '../../../../components/ui/primitives';
import type { CaseFolderTreeNode } from '../../utils/workspace/caseFolders';

interface CaseFolderTreeProps {
    folders: CaseFolderTreeNode[];
    renderCases: (node: CaseFolderTreeNode) => ReactNode;
    projectIndex: number;
    isEditing: (target: { type: 'folder'; projectIndex: number; folderId: string }) => boolean;
    editingName: string;
    inputRef: RefObject<InputRef | null>;
    onStartRename: (folderId: string) => void;
    onEditingNameChange: (name: string) => void;
    onFinishRename: () => void;
    getMenu: (folderId: string) => MenuProps['items'];
    dropTargetFolderId?: string | null;
    onFolderDragOver?: (folderId: string, event: DragEvent<HTMLDivElement>) => void;
    onFolderDragLeave?: (folderId: string, event: DragEvent<HTMLDivElement>) => void;
    onFolderDrop?: (folderId: string, event: DragEvent<HTMLDivElement>) => void;
    forceExpanded?: boolean;
    depth?: number;
}

interface CaseFolderRowProps {
    node: CaseFolderTreeNode;
    projectIndex: number;
    isEditing: CaseFolderTreeProps['isEditing'];
    editingName: string;
    inputRef: RefObject<InputRef | null>;
    onStartRename: (folderId: string) => void;
    onEditingNameChange: (name: string) => void;
    onFinishRename: () => void;
    getMenu: (folderId: string) => MenuProps['items'];
    dropTargetFolderId: string | null;
    onFolderDragOver: (folderId: string, event: DragEvent<HTMLDivElement>) => void;
    onFolderDragLeave: (folderId: string, event: DragEvent<HTMLDivElement>) => void;
    onFolderDrop: (folderId: string, event: DragEvent<HTMLDivElement>) => void;
    collapsed: boolean;
    forceExpanded: boolean;
    onToggle: () => void;
}

function CaseFolderRow({
    node,
    projectIndex,
    isEditing,
    editingName,
    inputRef,
    onStartRename,
    onEditingNameChange,
    onFinishRename,
    getMenu,
    dropTargetFolderId,
    onFolderDragOver,
    onFolderDragLeave,
    onFolderDrop,
    collapsed,
    forceExpanded,
    onToggle,
}: CaseFolderRowProps) {
    return (
        <Dropdown trigger={['contextMenu']} menu={{ items: getMenu(node.folder.id) }}>
            <div
                className={`case-folder-row flex items-center gap-1.5 py-1 pr-2 text-xs text-[var(--color-text-secondary)]${dropTargetFolderId === node.folder.id ? ' case-folder-row-drop-target' : ''}`}
                style={{ paddingLeft: '8px' }}
                data-folder-id={node.folder.id}
                onDragOver={(event) => onFolderDragOver(node.folder.id, event)}
                onDragLeave={(event) => onFolderDragLeave(node.folder.id, event)}
                onDrop={(event) => onFolderDrop(node.folder.id, event)}
                onClick={onToggle}
                onDoubleClick={(event) => {
                    event.stopPropagation();
                    onStartRename(node.folder.id);
                }}
            >
                <RightOutlined
                    className={`text-[10px] text-[var(--color-text-muted)] transition-transform ${!forceExpanded && collapsed ? '' : 'rotate-90'}`}
                />
                <FolderOpenOutlined className="text-[var(--color-text-muted)]" />
                {isEditing({
                    type: 'folder',
                    projectIndex,
                    folderId: node.folder.id,
                }) ? (
                    <Input
                        ref={inputRef as React.Ref<InputRef>}
                        size="sm"
                        value={editingName}
                        onChange={(event) => onEditingNameChange(event.target.value)}
                        onPressEnter={onFinishRename}
                        onBlur={onFinishRename}
                        onClick={(event) => event.stopPropagation()}
                        className="case-item-input"
                    />
                ) : (
                    <Tooltip title={node.folder.name}>
                        <span className="case-folder-name truncate">{node.folder.name}</span>
                    </Tooltip>
                )}
                <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">
                    {node.cases.length}
                </span>
            </div>
        </Dropdown>
    );
}

export default function CaseFolderTree({
    folders,
    renderCases,
    projectIndex,
    isEditing,
    editingName,
    inputRef,
    onStartRename,
    onEditingNameChange,
    onFinishRename,
    getMenu,
    dropTargetFolderId = null,
    onFolderDragOver = () => undefined,
    onFolderDragLeave = () => undefined,
    onFolderDrop = () => undefined,
    forceExpanded = false,
    depth = 0,
}: CaseFolderTreeProps) {
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

    const toggleFolder = (folderId: string) => {
        setCollapsed((current) => {
            const next = new Set(current);
            if (next.has(folderId)) next.delete(folderId);
            else next.add(folderId);
            return next;
        });
    };

    return (
        <>
            {folders.map((node) => (
                <div
                    key={node.folder.id}
                    className={`case-folder-block case-folder-depth-${depth}`}
                    style={{ marginLeft: `${depth * 16}px` }}
                >
                    <CaseFolderRow
                        node={node}
                        projectIndex={projectIndex}
                        isEditing={isEditing}
                        editingName={editingName}
                        inputRef={inputRef}
                        onStartRename={onStartRename}
                        onEditingNameChange={onEditingNameChange}
                        onFinishRename={onFinishRename}
                        getMenu={getMenu}
                        dropTargetFolderId={dropTargetFolderId}
                        onFolderDragOver={onFolderDragOver}
                        onFolderDragLeave={onFolderDragLeave}
                        onFolderDrop={onFolderDrop}
                        collapsed={collapsed.has(node.folder.id)}
                        forceExpanded={forceExpanded}
                        onToggle={() => toggleFolder(node.folder.id)}
                    />
                    {(forceExpanded || !collapsed.has(node.folder.id)) && (
                        <>
                            <CaseFolderTree
                                folders={node.folders}
                                renderCases={renderCases}
                                projectIndex={projectIndex}
                                isEditing={isEditing}
                                editingName={editingName}
                                inputRef={inputRef}
                                onStartRename={onStartRename}
                                onEditingNameChange={onEditingNameChange}
                                onFinishRename={onFinishRename}
                                getMenu={getMenu}
                                dropTargetFolderId={dropTargetFolderId}
                                onFolderDragOver={onFolderDragOver}
                                onFolderDragLeave={onFolderDragLeave}
                                onFolderDrop={onFolderDrop}
                                forceExpanded={forceExpanded}
                                depth={depth + 1}
                            />
                            <div className="case-folder-cases">{renderCases(node)}</div>
                        </>
                    )}
                </div>
            ))}
        </>
    );
}
