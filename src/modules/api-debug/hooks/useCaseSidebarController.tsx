import { useCallback, useRef, useState, type DragEvent } from 'react';
import { App, message } from 'antd';
import type { InputRef, MenuProps } from 'antd';
import {
    CloseOutlined,
    CopyOutlined,
    EditOutlined,
    ExportOutlined,
    ImportOutlined,
    PlusOutlined,
    StarOutlined,
} from '@ant-design/icons';
import { useTabsActions, useTabsNavigation } from '../store/useTabs';
import { applyTabDraftsToWorkspace } from '../store/tabsData';
import { useInlineRename, type RenameTarget } from '../../../hooks/useInlineRename';
import { useDragAutoScroll } from '../../../hooks/useDragAutoScroll';
import { useVisibleProjects } from './useVisibleProjects';
import { useStableHandlerMap } from '../../../hooks/useStableHandlerMap';
import { useProjectImport } from './useProjectImport';
import { exportProjectToIni } from '../utils/import/configIniExport';
import { getCaseLabel, getCaseMsgtype } from '../utils/workspace/caseLabel';
import { isCaseDragEvent, readCaseDragData, writeCaseDragData } from '../utils/workspace/caseDrag';
import { getCaseSearchHighlightTerm, parseCaseSearchQuery } from '../utils/workspace/caseSearch';
import { flushAllTabDrafts } from '../utils/workspace/tabDraftRegistry';

export function useCaseSidebarController() {
    const { modal } = App.useApp();
    const {
        addProject,
        deleteProject,
        renameProject,
        toggleProjectExpand,
        addCase,
        duplicateCase,
        deleteCase,
        importCases,
        selectCase,
        renameCase,
        toggleCaseFavorite,
        moveCase,
    } = useTabsActions();

    const state = useTabsNavigation();

    const { openImportFormatPicker } = useProjectImport({
        projects: state.projects,
        importCases,
    });

    const [searchKeyword, setSearchKeyword] = useState('');
    const searchInputRef = useRef<InputRef>(null);
    const searchHighlightTerm = getCaseSearchHighlightTerm(parseCaseSearchQuery(searchKeyword));
    const [draggingCaseId, setDraggingCaseId] = useState<string | null>(null);
    const [dropTargetProjectIndex, setDropTargetProjectIndex] = useState<number | null>(null);
    const dragSourceProjectIndexRef = useRef<number | null>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const sidebarListRef = useRef<HTMLDivElement>(null);

    useDragAutoScroll(sidebarListRef, {
        enabled: draggingCaseId !== null,
        boundsRef: sidebarRef,
    });

    const getRenameName = useCallback(
        (target: RenameTarget) => {
            if (target.type === 'project') {
                return state.projects[target.projectIndex].name;
            }
            return state.projects[target.projectIndex].cases[target.caseIndex].name;
        },
        [state.projects],
    );

    const commitRename = useCallback(
        (target: RenameTarget, name: string) => {
            if (target.type === 'project') {
                renameProject(target.projectIndex, name);
            } else {
                renameCase(target.projectIndex, target.caseIndex, name);
            }
        },
        [renameCase, renameProject],
    );

    const { inputRef, editingName, setEditingName, startRename, finishRename, isEditing } =
        useInlineRename(getRenameName, commitRename);

    const visibleProjects = useVisibleProjects(
        state.projects,
        state.expandedProjectIds,
        searchKeyword,
    );

    const handleDeleteProject = useCallback(
        (projectIndex: number) => {
            const project = state.projects[projectIndex];
            if (!project) return;

            const isLastProject = state.projects.length === 1;
            const projectName = project.name.trim() || '未命名项目';
            const caseCount = project.cases.length;

            modal.confirm({
                title: '删除项目',
                centered: true,
                mousePosition: null,
                content: isLastProject
                    ? `确定要删除项目「${projectName}」吗？删除后将重置为空白项目。`
                    : `确定要删除项目「${projectName}」吗？其下 ${caseCount} 个接口将一并删除。`,
                okText: '删除',
                okType: 'danger',
                cancelText: '取消',
                onOk: () => {
                    deleteProject(projectIndex);
                    message.success(isLastProject ? '已删除项目，已重置为空白项目' : '已删除项目');
                },
            });
        },
        [deleteProject, modal, state.projects],
    );

    const handleDeleteCase = useCallback(
        (projectIndex: number, caseIndex: number) => {
            const project = state.projects[projectIndex];
            const caseItem = project?.cases[caseIndex];
            if (!project || !caseItem) return;

            const isLastCase = project.cases.length === 1;
            const caseLabel = getCaseLabel(caseItem, caseIndex);
            const projectName = project.name.trim() || '未命名项目';

            modal.confirm({
                title: '删除接口',
                centered: true,
                mousePosition: null,
                content: isLastCase
                    ? `确定要删除接口「${caseLabel}」吗？这是项目「${projectName}」的最后一个接口，删除后将保留空占位。`
                    : `确定要删除接口「${caseLabel}」吗？`,
                okText: '删除',
                okType: 'danger',
                cancelText: '取消',
                onOk: () => {
                    deleteCase(projectIndex, caseIndex);
                    message.success('已删除接口');
                },
            });
        },
        [deleteCase, modal, state.projects],
    );

    const handleImportProject = useCallback(
        (projectIndex: number) => {
            openImportFormatPicker(projectIndex);
        },
        [openImportFormatPicker],
    );

    const handleExportProject = useCallback(
        async (projectIndex: number) => {
            try {
                const workspace = applyTabDraftsToWorkspace(
                    {
                        projects: state.projects,
                        activeProjectIndex: state.activeProjectIndex,
                        activeCaseIndex: state.activeCaseIndex,
                        expandedProjectIds: state.expandedProjectIds,
                        openCaseIds: state.openCaseIds,
                    },
                    flushAllTabDrafts(),
                );
                const project = workspace.projects[projectIndex];
                if (!project) return;

                const safeName = project.name.trim().replace(/[\\/:*?"<>|]/g, '_') || 'project';
                const filename = `${safeName}.ini`;
                const result = await exportProjectToIni(project, filename);
                if (result.saved) {
                    message.success(`已导出项目 INI：${result.filePath}`);
                    return;
                }
                if (result.reason === 'empty') {
                    message.warning('当前项目没有可导出的接口');
                } else if (result.reason === 'error') {
                    message.error(`导出项目 INI 失败：${result.error ?? '保存失败'}`);
                }
            } catch (error) {
                const messageText = error instanceof Error ? error.message : String(error);
                message.error(`导出项目 INI 失败：${messageText}`);
            }
        },
        [state],
    );

    const getCaseMenu = useCallback(
        (projectIndex: number, caseIndex: number): MenuProps['items'] => [
            {
                key: 'copy',
                label: '复制接口',
                icon: <CopyOutlined />,
                onClick: () => {
                    duplicateCase(projectIndex, caseIndex);
                    message.success('已复制接口');
                },
            },
            {
                key: 'rename',
                label: '重命名',
                icon: <EditOutlined />,
                onClick: () => startRename({ type: 'case', projectIndex, caseIndex }),
            },
            {
                key: 'favorite',
                label: state.projects[projectIndex]?.cases[caseIndex]?.favorite
                    ? '取消收藏'
                    : '收藏',
                icon: <StarOutlined />,
                onClick: () => toggleCaseFavorite(projectIndex, caseIndex),
            },
            { type: 'divider' },
            {
                key: 'delete',
                label: '删除接口',
                icon: <CloseOutlined />,
                danger: true,
                onClick: () => handleDeleteCase(projectIndex, caseIndex),
            },
        ],
        [duplicateCase, handleDeleteCase, startRename, state.projects, toggleCaseFavorite],
    );

    const getProjectMenu = useCallback(
        (projectIndex: number): MenuProps['items'] => [
            {
                key: 'import',
                label: '导入接口 JSON|INI',
                icon: <ImportOutlined />,
                onClick: () => handleImportProject(projectIndex),
            },
            {
                key: 'export',
                label: '导出项目 INI',
                icon: <ExportOutlined />,
                onClick: () => void handleExportProject(projectIndex),
            },
            {
                key: 'add-case',
                label: '添加接口',
                icon: <PlusOutlined />,
                onClick: () => addCase(projectIndex),
            },
            {
                key: 'rename',
                label: '重命名项目',
                icon: <EditOutlined />,
                onClick: () => startRename({ type: 'project', projectIndex }),
            },
            { type: 'divider' },
            {
                key: 'delete',
                label: '删除项目',
                icon: <CloseOutlined />,
                danger: true,
                onClick: () => handleDeleteProject(projectIndex),
            },
        ],
        [addCase, handleDeleteProject, handleExportProject, handleImportProject, startRename],
    );

    const getCaseActionHandler = useStableHandlerMap((key: string) => {
        const [projectIndex, caseIndex, action] = key.split(':');
        const p = Number(projectIndex);
        const c = Number(caseIndex);
        switch (action) {
            case 'select':
                return () => selectCase(p, c);
            case 'rename':
                return () => startRename({ type: 'case', projectIndex: p, caseIndex: c });
            case 'duplicate':
                return () => {
                    duplicateCase(p, c);
                    message.success('已复制接口');
                };
            case 'delete':
                return () => handleDeleteCase(p, c);
            case 'favorite':
                return () => toggleCaseFavorite(p, c);
            case 'copy-msgtype': {
                return () => {
                    const caseItem = state.projects[p]?.cases[c];
                    if (!caseItem) return;
                    const msgtype = getCaseMsgtype(caseItem);
                    if (!msgtype) {
                        message.warning('当前接口没有可复制的功能号');
                        return;
                    }
                    void navigator.clipboard.writeText(msgtype).then(() => {
                        message.success(`已复制功能号 ${msgtype}`);
                    });
                };
            }
            default:
                return () => undefined;
        }
    });

    const getProjectActionHandler = useStableHandlerMap((key: string) => {
        const parts = key.split(':');
        const p = Number(parts[0]);
        const action = parts[1];
        const projectId = parts[2] ?? '';
        switch (action) {
            case 'toggle':
                return () => toggleProjectExpand(projectId);
            case 'rename':
                return () => startRename({ type: 'project', projectIndex: p });
            case 'add':
                return () => addCase(p);
            case 'import':
                return () => handleImportProject(p);
            default:
                return () => undefined;
        }
    });

    const clearCaseDragState = useCallback(() => {
        setDraggingCaseId(null);
        setDropTargetProjectIndex(null);
        dragSourceProjectIndexRef.current = null;
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

            dragSourceProjectIndexRef.current = projectIndex;
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
            if (dragSourceProjectIndexRef.current === projectIndex) return;

            setDropTargetProjectIndex(projectIndex);

            const project = state.projects[projectIndex];
            if (project && !state.expandedProjectIds.includes(project.id)) {
                toggleProjectExpand(project.id);
            }
        },
        [state.expandedProjectIds, state.projects, toggleProjectExpand],
    );

    const handleProjectDragLeave = useCallback(
        (projectIndex: number, event: DragEvent<HTMLDivElement>) => {
            const nextTarget = event.relatedTarget as Node | null;
            const currentTarget = event.currentTarget;
            if (nextTarget && currentTarget.contains(nextTarget)) return;
            setDropTargetProjectIndex((current) => (current === projectIndex ? null : current));
        },
        [],
    );

    const handleProjectDrop = useCallback(
        (projectIndex: number, event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            event.stopPropagation();

            const payload = readCaseDragData(event.dataTransfer);
            clearCaseDragState();
            if (!payload) return;
            if (payload.fromProjectIndex === projectIndex) return;

            moveCase(payload.fromProjectIndex, payload.fromCaseIndex, projectIndex);

            const caseItem = state.projects[payload.fromProjectIndex]?.cases[payload.fromCaseIndex];
            const label = caseItem ? getCaseLabel(caseItem, payload.fromCaseIndex) : '接口';
            const targetName = state.projects[projectIndex]?.name.trim() || '未命名项目';
            message.success(`已将「${label}」移动到「${targetName}」`);
        },
        [clearCaseDragState, moveCase, state.projects],
    );

    const handleCaseDragEnd = useCallback(() => {
        clearCaseDragState();
    }, [clearCaseDragState]);

    return {
        state,
        addProject,
        searchKeyword,
        setSearchKeyword,
        searchInputRef,
        searchHighlightTerm,
        draggingCaseId,
        dropTargetProjectIndex,
        sidebarRef,
        sidebarListRef,
        visibleProjects,
        inputRef,
        editingName,
        setEditingName,
        isEditing,
        finishRename,
        getCaseMenu,
        getProjectMenu,
        getCaseActionHandler,
        getProjectActionHandler,
        handleCaseDragStart,
        handleProjectDragOver,
        handleProjectDragLeave,
        handleProjectDrop,
        handleCaseDragEnd,
    };
}
