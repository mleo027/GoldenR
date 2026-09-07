import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { FolderOpenOutlined, RightOutlined } from '@ant-design/icons';
import { useState, type RefObject, type ReactNode } from 'react';
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
    depth?: number;
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
    depth = 0,
}: CaseFolderTreeProps) {
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

    return (
        <>
            {folders.map((node) => (
                <div
                    key={node.folder.id}
                    className="case-folder-block"
                    style={{ marginLeft: `${depth * 16}px` }}
                >
                    <Dropdown trigger={['contextMenu']} menu={{ items: getMenu(node.folder.id) }}>
                        <div
                            className="case-folder-row flex items-center gap-1.5 py-1 pr-2 text-xs text-[var(--color-text-secondary)]"
                            style={{ paddingLeft: '8px' }}
                            data-folder-id={node.folder.id}
                            onClick={() => {
                                setCollapsed((current) => {
                                    const next = new Set(current);
                                    if (next.has(node.folder.id)) next.delete(node.folder.id);
                                    else next.add(node.folder.id);
                                    return next;
                                });
                            }}
                            onDoubleClick={(event) => {
                                event.stopPropagation();
                                onStartRename(node.folder.id);
                            }}
                        >
                            <RightOutlined
                                className={`text-[10px] text-[var(--color-text-muted)] transition-transform ${collapsed.has(node.folder.id) ? '' : 'rotate-90'}`}
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
                                <span className="truncate">{node.folder.name}</span>
                            )}
                            <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">
                                {node.cases.length}
                            </span>
                        </div>
                    </Dropdown>
                    {!collapsed.has(node.folder.id) && (
                        <>
                            {renderCases(node)}
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
                                depth={depth + 1}
                            />
                        </>
                    )}
                </div>
            ))}
        </>
    );
}
