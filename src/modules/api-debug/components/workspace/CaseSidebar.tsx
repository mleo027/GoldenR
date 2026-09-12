import { forwardRef, useImperativeHandle } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { useCaseSidebarController } from '../../hooks/useCaseSidebarController';
import CaseActionBar from './CaseActionBar';
import CaseChildrenList from './CaseChildrenList';
import CaseSidebarHeader from './CaseSidebarHeader';
import ProjectTreeItem from './ProjectTreeItem';
import { Input } from '../../../../components/ui/primitives';
import CaseFolderTree from './CaseFolderTree';

export interface CaseSidebarHandle {
    focusSearch: () => void;
}

interface CaseSidebarProps {
    onOpenHistory: () => void;
}

type CaseSidebarController = ReturnType<typeof useCaseSidebarController>;

function CaseSidebarSearch({ controller }: { controller: CaseSidebarController }) {
    return (
        <div className="case-sidebar-search px-3 py-2 border-b border-[var(--color-divider)]">
            <Input
                ref={controller.searchInputRef}
                allowClear
                size="sm"
                placeholder="搜索接口..."
                prefix={<SearchOutlined className="text-[var(--color-text-muted)]" />}
                suffix={<span className="case-search-kbd">Ctrl+K</span>}
                value={controller.searchKeyword}
                onChange={(event) => controller.setSearchKeyword(event.target.value)}
            />
        </div>
    );
}

function CaseSidebarTree({ controller }: { controller: CaseSidebarController }) {
    const {
        state,
        searchHighlightTerm,
        draggingCaseId,
        dropTargetProjectIndex,
        dropTargetFolderId,
        sidebarListRef,
        visibleProjects,
        inputRef,
        editingName,
        setEditingName,
        isEditing,
        finishRename,
        getCaseMenu,
        getProjectMenu,
        getFolderMenu,
        startRename,
        getCaseActionHandler,
        getProjectActionHandler,
        handleCaseDragStart,
        handleProjectDragOver,
        handleProjectDragLeave,
        handleProjectDrop,
        handleFolderDragOver,
        handleFolderDragLeave,
        handleFolderDrop,
        handleCaseDragEnd,
    } = controller;

    return (
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
                visibleProjects.map(({ project, projectIndex, cases, folders, expanded }) => (
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
                            onAddCase={getProjectActionHandler(`${projectIndex}:add:${project.id}`)}
                            onImport={getProjectActionHandler(
                                `${projectIndex}:import:${project.id}`,
                            )}
                        />

                        {expanded && (
                            <div className="case-project-children">
                                <div className="case-project-root-content">
                                    <CaseFolderTree
                                        folders={folders}
                                        projectIndex={projectIndex}
                                        isEditing={isEditing}
                                        editingName={editingName}
                                        inputRef={inputRef}
                                        onStartRename={(folderId) =>
                                            startRename({ type: 'folder', projectIndex, folderId })
                                        }
                                        onEditingNameChange={setEditingName}
                                        onFinishRename={finishRename}
                                        getMenu={(folderId) =>
                                            getFolderMenu(projectIndex, folderId)
                                        }
                                        dropTargetFolderId={dropTargetFolderId}
                                        onFolderDragOver={handleFolderDragOver}
                                        onFolderDragLeave={handleFolderDragLeave}
                                        onFolderDrop={(folderId, event) =>
                                            handleFolderDrop(projectIndex, folderId, event)
                                        }
                                        forceExpanded={Boolean(controller.searchKeyword.trim())}
                                        renderCases={(node) => (
                                            <CaseChildrenList
                                                cases={node.cases}
                                                projectIndex={projectIndex}
                                                searchHighlightTerm={searchHighlightTerm}
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
                                    />
                                    <div className="case-project-root-cases">
                                        <CaseChildrenList
                                            cases={cases}
                                            projectIndex={projectIndex}
                                            searchHighlightTerm={searchHighlightTerm}
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
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
}

const CaseSidebar = forwardRef<CaseSidebarHandle, CaseSidebarProps>(function CaseSidebar(
    { onOpenHistory },
    ref,
) {
    const controller = useCaseSidebarController();

    useImperativeHandle(
        ref,
        () => ({
            focusSearch: () => {
                controller.searchInputRef.current?.focus({ cursor: 'all' });
            },
        }),
        [controller.searchInputRef],
    );

    return (
        <div ref={controller.sidebarRef} className="case-sidebar flex flex-col h-full">
            <CaseSidebarHeader />
            <CaseSidebarSearch controller={controller} />
            <CaseActionBar onAddProject={controller.addProject} onOpenHistory={onOpenHistory} />
            <CaseSidebarTree controller={controller} />
        </div>
    );
});

export default CaseSidebar;
