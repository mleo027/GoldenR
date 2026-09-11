import { useCallback } from 'react';
import type { App, MenuProps } from 'antd';
import { message } from 'antd';
import {
    CheckOutlined,
    CloseOutlined,
    CopyOutlined,
    EditOutlined,
    ExportOutlined,
    ImportOutlined,
    PlusOutlined,
    SolutionOutlined,
    StarOutlined,
} from '@ant-design/icons';
import type { RenameTarget } from '../../../../hooks/useInlineRename';
import { useStableHandlerMap } from '../../../../hooks/useStableHandlerMap';
import type { useTabsActions, useTabsNavigation } from '../../store/useTabs';
import { applyTabDraftsToWorkspace } from '../../store/tabsData';
import { flushAllTabDrafts } from '../../utils/workspace/tabDraftRegistry';
import { exportProjectToIni } from '../../utils/import/configIniExport';
import { getCaseLabel, getCaseMsgtype } from '../../utils/workspace/caseLabel';

interface Config {
    modal: ReturnType<typeof App.useApp>['modal'];
    state: ReturnType<typeof useTabsNavigation>;
    commonSets: Array<{ id: string; name: string }>;
    actions: ReturnType<typeof useTabsActions>;
    startRename(target: RenameTarget): void;
    openImport(projectIndex: number): void;
}

function useDeleteCommands(config: Config) {
    const { state, modal, actions } = config;
    const deleteProject = useCallback(
        (projectIndex: number) => {
            const project = state.projects[projectIndex];
            if (!project) return;
            const isLast = state.projects.length === 1;
            modal.confirm({
                title: '删除项目',
                centered: true,
                mousePosition: null,
                autoFocusButton: 'cancel',
                content: isLast
                    ? `确定删除项目「${project.name}」吗？删除后将重置为空白项目。`
                    : `确定删除项目「${project.name}」吗？其中 ${project.cases.length} 个接口将一并删除。`,
                okText: '删除',
                okType: 'danger',
                cancelText: '取消',
                onOk: () => {
                    actions.deleteProject(projectIndex);
                    message.success(isLast ? '已删除项目并重置为空白项目' : '已删除项目');
                },
            });
        },
        [actions, modal, state.projects],
    );
    const deleteCase = useCallback(
        (projectIndex: number, caseIndex: number) => {
            const project = state.projects[projectIndex];
            const item = project?.cases[caseIndex];
            if (!project || !item) return;
            modal.confirm({
                title: '删除接口',
                centered: true,
                mousePosition: null,
                autoFocusButton: 'cancel',
                content:
                    project.cases.length === 1
                        ? `确定删除接口「${getCaseLabel(item, caseIndex)}」吗？这是项目的最后一个接口，删除后将保留空占位。`
                        : `确定删除接口「${getCaseLabel(item, caseIndex)}」吗？`,
                okText: '删除',
                okType: 'danger',
                cancelText: '取消',
                onOk: () => {
                    actions.deleteCase(projectIndex, caseIndex);
                    message.success('已删除接口');
                },
            });
        },
        [actions, modal, state.projects],
    );
    return { deleteProject, deleteCase };
}

function useProjectTransfer(config: Config) {
    const { state } = config;
    const exportProject = useCallback(
        async (projectIndex: number) => {
            try {
                const workspace = applyTabDraftsToWorkspace(state, flushAllTabDrafts());
                const project = workspace.projects[projectIndex];
                if (!project) return;
                const filename = `${project.name.trim().replace(/[\\/:*?"<>|]/g, '_') || 'project'}.ini`;
                const result = await exportProjectToIni(project, filename);
                if (result.saved) message.success(`已导出项目 INI：${result.filePath}`);
                else if (result.reason === 'empty') message.warning('当前项目没有可导出的接口');
                else if (result.reason === 'error')
                    message.error(`导出项目 INI 失败：${result.error ?? '保存失败'}`);
            } catch (error) {
                message.error(
                    `导出项目 INI 失败：${error instanceof Error ? error.message : String(error)}`,
                );
            }
        },
        [state],
    );
    return { exportProject };
}

function useFolderMenu(config: Config) {
    const { actions, modal, startRename } = config;
    const getFolderMenu = useCallback(
        (projectIndex: number, folderId: string): MenuProps['items'] => [
            {
                key: 'add-child',
                label: '新建子目录',
                icon: <PlusOutlined />,
                onClick: () => actions.addFolder(projectIndex, folderId),
            },
            {
                key: 'add-case',
                label: '在此目录新建接口',
                icon: <PlusOutlined />,
                onClick: () => actions.addCase(projectIndex, folderId),
            },
            {
                key: 'rename',
                label: '重命名',
                icon: <EditOutlined />,
                onClick: () => startRename({ type: 'folder', projectIndex, folderId }),
            },
            { type: 'divider' },
            {
                key: 'delete',
                label: '删除目录',
                icon: <CloseOutlined />,
                danger: true,
                onClick: () =>
                    modal.confirm({
                        title: '删除用例目录',
                        content:
                            '目录及其子目录会被删除，其中的用例会移动到项目根目录，确定继续吗？',
                        okText: '删除',
                        okType: 'danger',
                        cancelText: '取消',
                        onOk: () => actions.deleteFolder(projectIndex, folderId),
                    }),
            },
        ],
        [actions, modal, startRename],
    );
    return getFolderMenu;
}

function useCaseMenu(
    config: Config,
    deleteCase: (projectIndex: number, caseIndex: number) => void,
) {
    const { actions, startRename, state } = config;
    const getCaseMenu = useCallback(
        (projectIndex: number, caseIndex: number): MenuProps['items'] => [
            {
                key: 'copy',
                label: '复制接口',
                icon: <CopyOutlined />,
                onClick: () => {
                    actions.duplicateCase(projectIndex, caseIndex);
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
                onClick: () => actions.toggleCaseFavorite(projectIndex, caseIndex),
            },
            { type: 'divider' },
            {
                key: 'delete',
                label: '删除接口',
                icon: <CloseOutlined />,
                danger: true,
                onClick: () => deleteCase(projectIndex, caseIndex),
            },
        ],
        [actions, deleteCase, startRename, state.projects],
    );
    return getCaseMenu;
}

function useProjectMenu(
    config: Config,
    deleteProject: (projectIndex: number) => void,
    exportProject: (index: number) => Promise<void>,
) {
    const { actions, commonSets, openImport, startRename, state } = config;
    const getProjectMenu = useCallback(
        (projectIndex: number): MenuProps['items'] => {
            const project = state.projects[projectIndex];
            return [
                {
                    key: 'import',
                    label: '导入接口 JSON|INI',
                    icon: <ImportOutlined />,
                    onClick: () => openImport(projectIndex),
                },
                {
                    key: 'export',
                    label: '导出项目 INI',
                    icon: <ExportOutlined />,
                    onClick: () => void exportProject(projectIndex),
                },
                {
                    key: 'add-case',
                    label: '添加接口',
                    icon: <PlusOutlined />,
                    onClick: () => actions.addCase(projectIndex),
                },
                {
                    key: 'add-folder',
                    label: '新建用例目录',
                    icon: <PlusOutlined />,
                    onClick: () => actions.addFolder(projectIndex),
                },
                {
                    key: 'rename',
                    label: '重命名项目',
                    icon: <EditOutlined />,
                    onClick: () => startRename({ type: 'project', projectIndex }),
                },
                { type: 'divider' },
                {
                    key: 'common-params',
                    label: '公共参数',
                    icon: <SolutionOutlined />,
                    children: [
                        {
                            key: 'common-params-none',
                            label: '不设置',
                            icon:
                                project?.commonParamSetId === undefined ? (
                                    <CheckOutlined />
                                ) : undefined,
                            onClick: () => actions.setProjectCommonParamSet(projectIndex, null),
                        },
                        ...commonSets.map((set) => ({
                            key: `common-params-${set.id}`,
                            label: set.name,
                            icon:
                                project?.commonParamSetId === set.id ? (
                                    <CheckOutlined />
                                ) : undefined,
                            onClick: () => actions.setProjectCommonParamSet(projectIndex, set.id),
                        })),
                    ],
                },
                { type: 'divider' },
                {
                    key: 'delete',
                    label: '删除项目',
                    icon: <CloseOutlined />,
                    danger: true,
                    onClick: () => deleteProject(projectIndex),
                },
            ];
        },
        [
            actions,
            commonSets,
            deleteProject,
            exportProject,
            openImport,
            startRename,
            state.projects,
        ],
    );
    return getProjectMenu;
}

function useActionHandlers(
    config: Config,
    deleteCase: (projectIndex: number, caseIndex: number) => void,
) {
    const getCaseActionHandler = useStableHandlerMap((key: string) => {
        const [project, item, action] = key.split(':');
        const p = Number(project);
        const c = Number(item);
        if (action === 'select') return () => config.actions.selectCase(p, c);
        if (action === 'rename')
            return () => config.startRename({ type: 'case', projectIndex: p, caseIndex: c });
        if (action === 'duplicate')
            return () => {
                config.actions.duplicateCase(p, c);
                message.success('已复制接口');
            };
        if (action === 'delete') return () => deleteCase(p, c);
        if (action === 'favorite') return () => config.actions.toggleCaseFavorite(p, c);
        if (action === 'copy-msgtype')
            return () => {
                const value = config.state.projects[p]?.cases[c];
                const msgtype = value && getCaseMsgtype(value);
                if (!msgtype) return void message.warning('当前接口没有可复制的功能号');
                void navigator.clipboard
                    .writeText(msgtype)
                    .then(() => message.success(`已复制功能号 ${msgtype}`));
            };
        return () => undefined;
    });
    const getProjectActionHandler = useStableHandlerMap((key: string) => {
        const [project, action, projectId = ''] = key.split(':');
        const p = Number(project);
        if (action === 'toggle') return () => config.actions.toggleProjectExpand(projectId);
        if (action === 'rename')
            return () => config.startRename({ type: 'project', projectIndex: p });
        if (action === 'add') return () => config.actions.addCase(p);
        if (action === 'import') return () => config.openImport(p);
        return () => undefined;
    });
    return { getCaseActionHandler, getProjectActionHandler };
}

export function useCaseSidebarMenus(config: Config) {
    const deletes = useDeleteCommands(config);
    const { exportProject } = useProjectTransfer(config);
    const getFolderMenu = useFolderMenu(config);
    const getCaseMenu = useCaseMenu(config, deletes.deleteCase);
    const getProjectMenu = useProjectMenu(config, deletes.deleteProject, exportProject);
    return {
        getFolderMenu,
        getCaseMenu,
        getProjectMenu,
        ...useActionHandlers(config, deletes.deleteCase),
    };
}
