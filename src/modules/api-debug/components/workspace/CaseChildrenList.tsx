import { useEffect, useRef, useState, type RefObject } from 'react';
import type { InputRef } from 'antd';
import type { MenuProps } from 'antd';
import VirtualList from 'rc-virtual-list';
import { PERFORMANCE_THRESHOLDS } from '../../../../constants/ui';
import {
    CASE_SIDEBAR_ITEM_HEIGHT,
    computeCaseVirtualListHeight,
    measureCaseListViewportHeight,
} from '../../utils/workspace/caseSidebarVirtualList';
import type { VisibleCaseItem } from '../../hooks/useVisibleProjects';
import CaseTreeItem from './CaseTreeItem';

interface CaseChildrenListProps {
    cases: VisibleCaseItem[];
    projectIndex: number;
    activeProjectIndex: number;
    activeCaseIndex: number;
    searchHighlightTerm: string;
    isEditing: (target: { type: 'case'; projectIndex: number; caseIndex: number }) => boolean;
    editingName: string;
    inputRef: RefObject<InputRef | null>;
    getCaseMenu: (projectIndex: number, caseIndex: number) => MenuProps['items'];
    getCaseActionHandler: (key: string) => () => void;
    onEditingNameChange: (value: string) => void;
    onFinishRename: () => void;
    draggingCaseId?: string | null;
    onCaseDragStart?: (
        projectIndex: number,
        caseIndex: number,
        caseId: string,
        event: React.DragEvent<HTMLDivElement>,
    ) => void;
    onCaseDragEnd?: () => void;
}

function CaseCaseList({
    cases,
    projectIndex,
    activeProjectIndex,
    activeCaseIndex,
    isEditing,
    editingName,
    searchHighlightTerm,
    inputRef,
    getCaseMenu,
    getCaseActionHandler,
    onEditingNameChange,
    onFinishRename,
    draggingCaseId,
    onCaseDragStart,
    onCaseDragEnd,
}: CaseChildrenListProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [listHeight, setListHeight] = useState(CASE_SIDEBAR_ITEM_HEIGHT);
    const useVirtual = cases.length >= PERFORMANCE_THRESHOLDS.sidebarVirtualCases;

    useEffect(() => {
        if (!useVirtual) return;

        const el = containerRef.current;
        if (!el) return;

        const scrollList = el.closest('.case-sidebar-list');
        const sidebar = el.closest('.case-sidebar');

        const updateHeight = () => {
            const available = measureCaseListViewportHeight(el);
            setListHeight(computeCaseVirtualListHeight(cases.length, available));
        };

        updateHeight();

        const observer = new ResizeObserver(updateHeight);
        if (scrollList) observer.observe(scrollList);
        if (sidebar) observer.observe(sidebar);

        scrollList?.addEventListener('scroll', updateHeight, { passive: true });
        window.addEventListener('resize', updateHeight);

        return () => {
            observer.disconnect();
            scrollList?.removeEventListener('scroll', updateHeight);
            window.removeEventListener('resize', updateHeight);
        };
    }, [cases.length, useVirtual]);

    const renderCaseItem = (item: VisibleCaseItem) => (
        <CaseTreeItem
            caseItem={item.caseItem}
            caseIndex={item.caseIndex}
            projectIndex={projectIndex}
            isActive={projectIndex === activeProjectIndex && item.caseIndex === activeCaseIndex}
            isEditing={isEditing({ type: 'case', projectIndex, caseIndex: item.caseIndex })}
            editingName={editingName}
            searchHighlightTerm={searchHighlightTerm}
            inputRef={inputRef}
            menuItems={getCaseMenu(projectIndex, item.caseIndex)}
            onSelect={getCaseActionHandler(`${projectIndex}:${item.caseIndex}:select`)}
            onStartRename={getCaseActionHandler(`${projectIndex}:${item.caseIndex}:rename`)}
            onEditingNameChange={onEditingNameChange}
            onFinishRename={onFinishRename}
            onToggleFavorite={getCaseActionHandler(`${projectIndex}:${item.caseIndex}:favorite`)}
            onCopyMsgtype={getCaseActionHandler(`${projectIndex}:${item.caseIndex}:copy-msgtype`)}
            isDragging={draggingCaseId === item.caseItem.id}
            onDragStart={
                onCaseDragStart
                    ? (event) =>
                          onCaseDragStart(projectIndex, item.caseIndex, item.caseItem.id, event)
                    : undefined
            }
            onDragEnd={onCaseDragEnd}
        />
    );

    if (!useVirtual) {
        return (
            <div className="case-children">
                {cases.map((item) => (
                    <div key={item.caseItem.id}>{renderCaseItem(item)}</div>
                ))}
            </div>
        );
    }

    return (
        <div ref={containerRef} className="case-children case-children-virtual ui-scroll">
            <VirtualList
                data={cases}
                height={listHeight}
                itemHeight={CASE_SIDEBAR_ITEM_HEIGHT}
                itemKey={(item) => item.caseItem.id}
            >
                {(item, _index, { style }) => (
                    <div style={style} className="case-virtual-item">
                        {renderCaseItem(item)}
                    </div>
                )}
            </VirtualList>
        </div>
    );
}

export default function CaseChildrenList(props: CaseChildrenListProps) {
    return <CaseCaseList {...props} />;
}
