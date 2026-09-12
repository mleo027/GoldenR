import { FolderAddOutlined, FolderOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { Button } from '@/components/ui/primitives';
import type { AutomationProject } from '@/shared/automation/types';
import { useAutomationStore } from '../store/automationStore';
import AutomationFolderNode from './AutomationFolderNode';
import AutomationScenarioNode from './AutomationScenarioNode';

export default function AutomationProjectNode({ project }: { project: AutomationProject }) {
    const state = useAutomationStore();
    const folders = state.workspace.folders
        .filter((item) => item.projectId === project.id && !item.parentId)
        .sort((a, b) => a.position - b.position);
    const scenarios = state.workspace.scenarios
        .filter((item) => item.projectId === project.id && !item.folderId)
        .sort((a, b) => a.position - b.position);
    return (
        <section className="automation-project" role="treeitem">
            <div className="automation-tree-row automation-project-row">
                <FolderOutlined className="automation-folder-icon" />
                <span className="automation-tree-name">{project.name}</span>
                <Tooltip title="添加目录">
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<FolderAddOutlined />}
                        onClick={() => state.addFolder(project.id)}
                    />
                </Tooltip>
                <Tooltip title="添加场景">
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<PlusOutlined />}
                        onClick={() => state.addScenario(project.id)}
                    />
                </Tooltip>
                <Button
                    className="automation-project-more"
                    variant="ghost"
                    size="sm"
                    icon={<MoreOutlined />}
                    aria-label="项目更多操作"
                />
            </div>
            {scenarios.map((scenario) => (
                <AutomationScenarioNode key={scenario.id} scenario={scenario} depth={0} />
            ))}
            {folders.map((folder) => (
                <AutomationFolderNode key={folder.id} folder={folder} depth={0} />
            ))}
        </section>
    );
}
