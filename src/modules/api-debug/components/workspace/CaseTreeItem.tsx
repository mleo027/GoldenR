import { memo, type RefObject } from 'react';
import type { InputRef } from 'antd';
import { Button, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { CopyOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import TextHighlight from '../../../../components/ui/TextHighlight';
import type { TabData } from '../../types/workspace';
import { getCaseDisplayParts, getCaseLabel, getCaseMsgtype } from '../../utils/workspace/caseLabel';
import InlineRenameInput from './InlineRenameInput';

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
    onCopyMsgtype: () => void;
    onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd?: () => void;
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
    onCopyMsgtype,
    onDragStart,
    onDragEnd,
}: CaseTreeItemProps) {
    const label = getCaseLabel(caseItem, caseIndex);
    const { msgtype, name } = getCaseDisplayParts(caseItem, caseIndex);
    const isFavorite = caseItem.favorite ?? false;
    const resolvedMsgtype = getCaseMsgtype(caseItem);

    const draggable = Boolean(onDragStart) && !isEditing;

    return (
        <Dropdown menu={{ items: menuItems }} trigger={['contextMenu']}>
            <div
                className={`case-item group ${isActive ? 'case-item-active' : ''}${isFavorite ? ' case-item-favorite' : ''}${isDragging ? ' case-item-dragging' : ''}${draggable ? ' case-item-draggable' : ''}`}
                draggable={draggable}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onClick={onSelect}
                onDoubleClick={(event) => {
                    event.stopPropagation();
                    onStartRename();
                }}
                title={label}
            >
                {!isEditing && (
                    <Button
                        type="text"
                        size="small"
                        icon={
                            isFavorite ? (
                                <StarFilled className="case-item-star case-item-star-filled" />
                            ) : (
                                <StarOutlined className="case-item-star" />
                            )
                        }
                        className="case-item-star-btn"
                        title={isFavorite ? '取消收藏' : '收藏接口'}
                        onClick={(event) => {
                            event.stopPropagation();
                            onToggleFavorite();
                        }}
                    />
                )}
                {isEditing ? (
                    <InlineRenameInput
                        inputRef={inputRef}
                        value={editingName}
                        onChange={onEditingNameChange}
                        onFinish={onFinishRename}
                        onClick={(event) => event.stopPropagation()}
                    />
                ) : (
                    <div className="case-item-label-wrap">
                        {msgtype ? (
                            <>
                                <span className="case-item-msgtype">
                                    <TextHighlight text={msgtype} queryTerm={searchHighlightTerm} />
                                </span>
                                <span className="case-item-name">
                                    <TextHighlight text={name} queryTerm={searchHighlightTerm} />
                                </span>
                            </>
                        ) : (
                            <span className="case-item-name">
                                <TextHighlight text={name} queryTerm={searchHighlightTerm} />
                            </span>
                        )}
                    </div>
                )}
                {!isEditing && resolvedMsgtype ? (
                    <div className="case-item-actions">
                        <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined className="text-[10px]" />}
                            className="case-item-action"
                            title={`复制功能号 ${resolvedMsgtype}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                onCopyMsgtype();
                            }}
                        />
                    </div>
                ) : null}
            </div>
        </Dropdown>
    );
}

export default memo(CaseTreeItem);
