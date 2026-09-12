import { memo, type RefObject } from 'react';
import { Button, Dropdown, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { StarFilled, StarOutlined } from '@ant-design/icons';
import TextHighlight from '../../../../components/ui/TextHighlight';
import type { TabData } from '../../types/workspace';
import { getCaseDisplayParts, getCaseLabel } from '../../utils/workspace/caseLabel';
import InlineRenameInput from './InlineRenameInput';
import type { InputRef } from '../../../../components/ui/primitives';

interface CaseTreeItemProps {
    caseItem: TabData;
    caseIndex: number;
    projectIndex: number;
    isActive: boolean;
    isEditing: boolean;
    isDragging?: boolean;
    editingName: string;
    searchHighlightTerm: string;
    inputRef: RefObject<InputRef | null>;
    menuItems: MenuProps['items'];
    onSelect: () => void;
    onStartRename: () => void;
    onEditingNameChange: (value: string) => void;
    onFinishRename: () => void;
    onToggleFavorite: () => void;
    onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd?: () => void;
}

function FavoriteButton({ favorite, onToggle }: { favorite: boolean; onToggle: () => void }) {
    return (
        <Tooltip title={favorite ? '取消收藏' : '收藏接口'}>
            <Button
                type="text"
                size="small"
                icon={
                    favorite ? (
                        <StarFilled className="case-item-star case-item-star-filled" />
                    ) : (
                        <StarOutlined className="case-item-star" />
                    )
                }
                className="case-item-star-btn"
                aria-label={favorite ? '取消收藏' : '收藏接口'}
                onClick={(event) => {
                    event.stopPropagation();
                    onToggle();
                }}
            />
        </Tooltip>
    );
}

function CaseLabel({ item, index, query }: { item: TabData; index: number; query: string }) {
    const { msgtype, name } = getCaseDisplayParts(item, index);
    return (
        <div className="case-item-label-wrap">
            {msgtype && (
                <span className="case-item-msgtype">
                    <TextHighlight text={msgtype} queryTerm={query} />
                </span>
            )}
            <span className="case-item-name">
                <TextHighlight text={name} queryTerm={query} />
            </span>
        </div>
    );
}

function CaseTreeItem({
    caseItem,
    caseIndex,
    isActive,
    isEditing,
    isDragging = false,
    editingName,
    searchHighlightTerm,
    inputRef,
    menuItems,
    onSelect,
    onStartRename,
    onEditingNameChange,
    onFinishRename,
    onToggleFavorite,
    onDragStart,
    onDragEnd,
}: CaseTreeItemProps) {
    const label = getCaseLabel(caseItem, caseIndex);
    const favorite = caseItem.favorite ?? false;
    const draggable = Boolean(onDragStart) && !isEditing;
    return (
        <Dropdown menu={{ items: menuItems }} trigger={['contextMenu']}>
            <div
                className={`case-item group ${isActive ? 'case-item-active' : ''}${favorite ? ' case-item-favorite' : ''}${isDragging ? ' case-item-dragging' : ''}${draggable ? ' case-item-draggable' : ''}`}
                data-case-id={caseItem.id}
                tabIndex={isActive ? 0 : -1}
                draggable={draggable}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onClick={onSelect}
                onDoubleClick={(event) => {
                    event.stopPropagation();
                    onStartRename();
                }}
            >
                {!isEditing && <FavoriteButton favorite={favorite} onToggle={onToggleFavorite} />}
                {isEditing ? (
                    <InlineRenameInput
                        inputRef={inputRef}
                        value={editingName}
                        onChange={onEditingNameChange}
                        onFinish={onFinishRename}
                        onClick={(event) => event.stopPropagation()}
                    />
                ) : (
                    <Tooltip title={label}>
                        <CaseLabel item={caseItem} index={caseIndex} query={searchHighlightTerm} />
                    </Tooltip>
                )}
            </div>
        </Dropdown>
    );
}

export default memo(CaseTreeItem);
