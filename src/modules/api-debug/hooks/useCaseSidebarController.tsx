import { useRef, useState } from 'react';
import { App } from 'antd';
import type { InputRef } from '../../../components/ui/primitives';
import { useTabsActions, useTabsNavigation } from '../store/useTabs';
import { useCommonParamsState } from '../store/useCommonParams';
import { useVisibleProjects } from './useVisibleProjects';
import { useProjectImport } from './useProjectImport';
import { getCaseSearchHighlightTerm, parseCaseSearchQuery } from '../utils/workspace/caseSearch';
import { useCaseSidebarDrag } from './caseSidebar/useCaseSidebarDrag';
import { useCaseSidebarMenus } from './caseSidebar/useCaseSidebarMenus';
import { useCaseSidebarRename } from './caseSidebar/useCaseSidebarRename';

export function useCaseSidebarController() {
    const { modal } = App.useApp();
    const actions = useTabsActions();
    const {
        addProject,
        renameProject,
        importCases,
        renameCase,
        moveCase,
        moveCaseToFolder,
        renameFolder,
    } = actions;

    const state = useTabsNavigation();
    const { sets: commonSets } = useCommonParamsState();

    const { openImportFormatPicker } = useProjectImport({
        projects: state.projects,
        importCases,
    });

    const [searchKeyword, setSearchKeyword] = useState('');
    const searchInputRef = useRef<InputRef>(null);
    const searchHighlightTerm = getCaseSearchHighlightTerm(parseCaseSearchQuery(searchKeyword));
    const { inputRef, editingName, setEditingName, startRename, finishRename, isEditing } =
        useCaseSidebarRename({ projects: state.projects, renameProject, renameFolder, renameCase });

    const visibleProjects = useVisibleProjects(
        state.projects,
        state.expandedProjectIds,
        searchKeyword,
    );

    const {
        getCaseMenu,
        getProjectMenu,
        getFolderMenu,
        getCaseActionHandler,
        getProjectActionHandler,
    } = useCaseSidebarMenus({
        modal,
        state,
        commonSets,
        actions,
        startRename,
        openImport: openImportFormatPicker,
    });

    const {
        draggingCaseId,
        dropTargetProjectIndex,
        sidebarRef,
        sidebarListRef,
        handleCaseDragStart,
        handleProjectDragOver,
        handleProjectDragLeave,
        handleProjectDrop,
        dropTargetFolderId,
        handleFolderDragOver,
        handleFolderDragLeave,
        handleFolderDrop,
        handleCaseDragEnd,
    } = useCaseSidebarDrag({
        projects: state.projects,
        moveCase,
        moveCaseToFolder,
    });

    return {
        state,
        addProject,
        searchKeyword,
        setSearchKeyword,
        searchInputRef,
        searchHighlightTerm,
        draggingCaseId,
        dropTargetProjectIndex,
        dropTargetFolderId,
        sidebarRef,
        sidebarListRef,
        visibleProjects,
        inputRef,
        editingName,
        setEditingName,
        isEditing,
        finishRename,
        startRename,
        getCaseMenu,
        getProjectMenu,
        getFolderMenu,
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
    };
}
