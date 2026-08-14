import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { App, Input, message } from 'antd';
import type { InputRef } from 'antd';
import type { MenuProps } from 'antd';
import {
    PlusOutlined,
    CloseOutlined,
    CopyOutlined,
    EditOutlined,
    SearchOutlined,
    StarOutlined,
    ImportOutlined,
} from '@ant-design/icons';
import { useTabsActions, useTabsNavigation } from '../../store/useTabs';
import { useInlineRename, type RenameTarget } from '../../../../hooks/useInlineRename';
import { useDragAutoScroll } from '../../../../hooks/useDragAutoScroll';
import { useVisibleProjects } from '../../hooks/useVisibleProjects';
import { useStableHandlerMap } from '../../../../hooks/useStableHandlerMap';
import { useProjectImport } from '../../hooks/useProjectImport';
import { getCaseLabel, getCaseMsgtype } from '../../utils/workspace/caseLabel';
import {
    isCaseDragEvent,
    readCaseDragData,
    writeCaseDragData,
} from '../../utils/workspace/caseDrag';
import CaseChildrenList from './CaseChildrenList';
import CaseSidebarHeader from './CaseSidebarHeader';
import ProjectTreeItem from './ProjectTreeItem';
import { resolveActiveCaseGroupKey } from '../../utils/workspace/caseMsgtypeGroup';
import { getCaseSearchHighlightTerm, parseCaseSearchQuery } from '../../utils/workspace/caseSearch';

export interface CaseSidebarHandle {
    focusSearch: () => void;
}

const CaseSidebar = forwardRef<CaseSidebarHandle>(function CaseSidebar(_props, ref) {
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
    const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(() => new Set());
    const [draggingCaseId, setDraggingCaseId] = useState<string | null>(null);
    const [dropTargetProjectIndex, setDropTargetProjectIndex] = useState<number | null>(null);
    const dragSourceProjectIndexRef = useRef<number | null>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const sidebarListRef = useRef<HTMLDivElement>(null);

    useDragAutoScroll(sidebarListRef, {
        enabled: draggingCaseId !== null,
        boundsRef: sidebarRef,
    });

    const handleToggleGroup = useCallback((storageKey: string) => {
        setExpandedGroupKeys((prev) => {
            const next = new Set(prev);
            if (next.has(storageKey)) {
                next.delete(storageKey);
            } else {
                next.add(storageKey);
            }
            return next;
        });
    }, []);

    useEffect(() => {
        const projectIndex = state.activeProjectIndex;
        const project = state.projects[projectIndex];
        if (!project) return;

        const cases = project.cases.map((caseItem, caseIndex) => ({ caseItem, caseIndex }));
        const storageKey = resolveActiveCaseGroupKey(projectIndex, state.activeCaseIndex, cases);
        if (!storageKey) return;

        setExpandedGroupKeys((prev) => {
            if (prev.has(storageKey)) return prev;
            const next = new Set(prev);
            next.add(storageKey);
            return next;
        });
    }, [state.activeCaseIndex, state.activeProjectIndex, state.projects]);

    useImperativeHandle(
        ref,
        () => ({
            focusSearch: () => {
                searchInputRef.current?.focus({ cursor: 'all' });
            },
        }),
        [],
    );

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
                label: '导入接口 JSON',
                icon: <ImportOutlined />,
                onClick: () => handleImportProject(projectIndex),
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
        [addCase, handleDeleteProject, handleImportProject, startRename],
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
            event: React.DragEvent<HTMLDivElement>,
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
        (projectIndex: number, event: React.DragEvent<HTMLDivElement>) => {
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
        (projectIndex: number, event: React.DragEvent<HTMLDivElement>) => {
            const nextTarget = event.relatedTarget as Node | null;
            const currentTarget = event.currentTarget;
            if (nextTarget && currentTarget.contains(nextTarget)) return;
            setDropTargetProjectIndex((current) => (current === projectIndex ? null : current));
        },
        [],
    );

    const handleProjectDrop = useCallback(
        (projectIndex: number, event: React.DragEvent<HTMLDivElement>) => {
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

    return (
        <div ref={sidebarRef} className="case-sidebar flex flex-col h-full">
            <CaseSidebarHeader onAddProject={addProject} />

            <div className="case-sidebar-search px-3 py-2 border-b border-[var(--color-divider)]">
                <Input
                    ref={searchInputRef}
                    allowClear
                    size="small"
                    placeholder="搜索接口..."
                    prefix={<SearchOutlined className="text-[var(--color-text-muted)]" />}
                    suffix={<span className="case-search-kbd">Ctrl+K</span>}
                    value={searchKeyword}
                    onChange={(event) => setSearchKeyword(event.target.value)}
                />
            </div>

            <div
                ref={sidebarListRef}
                className="case-sidebar-list ui-scroll flex-1 overflow-y-auto py-1"
                onDragOver={(event) => {
                    if (!draggingCaseId) return;
                    event.preventDefault();
                }}
            >
                {visibleProjects.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-[var(--color-text-muted)]">
                        无匹配结果
                    </div>
                ) : (
                    visibleProjects.map(({ project, projectIndex, cases, expanded }) => (
                        <div
                            key={project.id}
                            className={`case-project-block${dropTargetProjectIndex === projectIndex ? ' case-project-block-drop-target' : ''}`}
                            onDragOver={(event) => handleProjectDragOver(projectIndex, event)}
                            onDragLeave={(event) => handleProjectDragLeave(projectIndex, event)}
                            onDrop={(event) => handleProjectDrop(projectIndex, event)}
                        >
                            <ProjectTreeItem
                                project={project}
                                projectIndex={projectIndex}
                                caseCount={cases.length}
                                expanded={expanded}
                                isActive={projectIndex === state.activeProjectIndex}
                                isEditing={isEditing({ type: 'project', projectIndex })}
                                editingName={editingName}
                                inputRef={inputRef}
                                menuItems={getProjectMenu(projectIndex)}
                                onToggleExpand={getProjectActionHandler(
                                    `${projectIndex}:toggle:${project.id}`,
                                )}
                                onStartRename={getProjectActionHandler(
                                    `${projectIndex}:rename:${project.id}`,
                                )}
                                onEditingNameChange={setEditingName}
                                onFinishRename={finishRename}
                                onAddCase={getProjectActionHandler(
                                    `${projectIndex}:add:${project.id}`,
                                )}
                                onImport={getProjectActionHandler(
                                    `${projectIndex}:import:${project.id}`,
                                )}
                            />

                            {expanded && (
                                <CaseChildrenList
                                    cases={cases}
                                    projectIndex={projectIndex}
                                    searchKeyword={searchKeyword}
                                    searchHighlightTerm={searchHighlightTerm}
                                    expandedGroupKeys={expandedGroupKeys}
                                    onToggleGroup={handleToggleGroup}
                                    activeProjectIndex={state.activeProjectIndex}
                                    activeCaseIndex={state.activeCaseIndex}
                                    isEditing={isEditing}
                                    editingName={editingName}
                                    inputRef={inputRef}
                                    getCaseMenu={getCaseMenu}
                                    getCaseActionHandler={getCaseActionHandler}
                                    onEditingNameChange={setEditingName}
                                    onFinishRename={finishRename}
                                    draggingCaseId={draggingCaseId}
                                    onCaseDragStart={handleCaseDragStart}
                                    onCaseDragEnd={handleCaseDragEnd}
                                />
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
});

export default CaseSidebar;
