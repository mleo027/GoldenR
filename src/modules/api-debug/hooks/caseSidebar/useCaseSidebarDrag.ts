import { useCallback, useRef, useState, type DragEvent } from 'react';
import { message } from 'antd';
import type { ProjectData } from '../../types/workspace';
import { useDragAutoScroll } from '../../../../hooks/useDragAutoScroll';
import { getCaseLabel } from '../../utils/workspace/caseLabel';
import {
    isCaseDragEvent,
    readCaseDragData,
    writeCaseDragData,
} from '../../utils/workspace/caseDrag';

interface Config {
    projects: ProjectData[];
    moveCase(fromProjectIndex: number, fromCaseIndex: number, toProjectIndex: number): void;
    moveCaseToFolder(projectIndex: number, caseId: string, folderId?: string): void;
}

export function useCaseSidebarDrag(config: Config) {
    const { projects, moveCase, moveCaseToFolder } = config;
    const [draggingCaseId, setDraggingCaseId] = useState<string | null>(null);
    const [dropTargetProjectIndex, setDropTargetProjectIndex] = useState<number | null>(null);
    const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);
    const sourceProjectRef = useRef<number | null>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const sidebarListRef = useRef<HTMLDivElement>(null);
    useDragAutoScroll(sidebarListRef, { enabled: draggingCaseId !== null, boundsRef: sidebarRef });

    const clear = useCallback(() => {
        setDraggingCaseId(null);
        setDropTargetProjectIndex(null);
        setDropTargetFolderId(null);
        sourceProjectRef.current = null;
    }, []);
    const handleCaseDragStart = useCallback(
        (
            projectIndex: number,
            caseIndex: number,
            caseId: string,
            event: DragEvent<HTMLDivElement>,
        ) => {
            const target = event.target as HTMLElement;
            if (
                target.closest(
                    '.case-item-star-btn, .case-item-action, .case-item-input, .ant-input',
                )
            ) {
                event.preventDefault();
                return;
            }
            sourceProjectRef.current = projectIndex;
            setDraggingCaseId(caseId);
            writeCaseDragData(event.dataTransfer, {
                fromProjectIndex: projectIndex,
                fromCaseIndex: caseIndex,
                caseId,
            });
        },
        [],
    );
    const handleProjectDragOver = useCallback(
        (projectIndex: number, event: DragEvent<HTMLDivElement>) => {
            if (!isCaseDragEvent(event.dataTransfer)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            if (sourceProjectRef.current !== projectIndex) setDropTargetProjectIndex(projectIndex);
        },
        [],
    );
    const handleProjectDragLeave = useCallback(
        (projectIndex: number, event: DragEvent<HTMLDivElement>) => {
            const next = event.relatedTarget as Node | null;
            if (!next || !event.currentTarget.contains(next))
                setDropTargetProjectIndex((current) => (current === projectIndex ? null : current));
        },
        [],
    );
    const handleProjectDrop = useCallback(
        (projectIndex: number, event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            event.stopPropagation();
            const payload = readCaseDragData(event.dataTransfer);
            clear();
            if (!payload || payload.fromProjectIndex === projectIndex) return;
            const caseItem = projects[payload.fromProjectIndex]?.cases[payload.fromCaseIndex];
            moveCase(payload.fromProjectIndex, payload.fromCaseIndex, projectIndex);
            const label = caseItem ? getCaseLabel(caseItem, payload.fromCaseIndex) : '接口';
            const target = projects[projectIndex]?.name.trim() || '未命名项目';
            message.success(`已将「${label}」移动到「${target}」`);
        },
        [clear, moveCase, projects],
    );
    const handleFolderDragOver = useCallback(
        (folderId: string, event: DragEvent<HTMLDivElement>) => {
            if (!isCaseDragEvent(event.dataTransfer)) return;
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = 'move';
            setDropTargetFolderId(folderId);
        },
        [],
    );
    const handleFolderDragLeave = useCallback(
        (folderId: string, event: DragEvent<HTMLDivElement>) => {
            const next = event.relatedTarget as Node | null;
            if (!next || !event.currentTarget.contains(next)) {
                setDropTargetFolderId((current) => (current === folderId ? null : current));
            }
        },
        [],
    );
    const handleFolderDrop = useCallback(
        (projectIndex: number, folderId: string, event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            event.stopPropagation();
            const payload = readCaseDragData(event.dataTransfer);
            clear();
            if (!payload || payload.fromProjectIndex !== projectIndex) return;
            const caseItem = projects[projectIndex]?.cases.find(
                (item) => item.id === payload.caseId,
            );
            moveCaseToFolder(projectIndex, payload.caseId, folderId);
            const label = caseItem ? getCaseLabel(caseItem, payload.fromCaseIndex) : '接口';
            message.success(`已将「${label}」移动到目录`);
        },
        [clear, moveCaseToFolder, projects],
    );
    const handleCaseDragEnd = useCallback(() => {
        clear();
    }, [clear]);
    return {
        draggingCaseId,
        dropTargetProjectIndex,
        dropTargetFolderId,
        sidebarRef,
        sidebarListRef,
        handleCaseDragStart,
        handleProjectDragOver,
        handleProjectDragLeave,
        handleProjectDrop,
        handleFolderDragOver,
        handleFolderDragLeave,
        handleFolderDrop,
        handleCaseDragEnd,
    };
}
