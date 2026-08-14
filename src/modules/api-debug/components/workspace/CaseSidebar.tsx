import { forwardRef, useImperativeHandle } from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useCaseSidebarController } from '../../hooks/useCaseSidebarController';
import CaseChildrenList from './CaseChildrenList';
import CaseSidebarHeader from './CaseSidebarHeader';
import ProjectTreeItem from './ProjectTreeItem';

export interface CaseSidebarHandle {
    focusSearch: () => void;
}

const CaseSidebar = forwardRef<CaseSidebarHandle>(function CaseSidebar(_props, ref) {
    const {
        state,
        addProject,
        searchKeyword,
        setSearchKeyword,
        searchInputRef,
        searchHighlightTerm,
        expandedGroupKeys,
        handleToggleGroup,
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
    } = useCaseSidebarController();

    useImperativeHandle(
        ref,
        () => ({
            focusSearch: () => {
                searchInputRef.current?.focus({ cursor: 'all' });
            },
        }),
        [searchInputRef],
    );

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
