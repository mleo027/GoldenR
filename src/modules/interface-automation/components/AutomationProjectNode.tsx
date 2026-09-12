import { DeleteOutlined, FolderAddOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Switch } from 'antd';
import { Input } from '@/components/ui/primitives';
import type { AutomationProject } from '@/shared/automation/types';
import { useAutomationStore } from '../store/automationStore';
import AutomationFolderNode from './AutomationFolderNode';

export default function AutomationProjectNode({ project }: { project: AutomationProject }) {
    const state = useAutomationStore();
    const folders = state.workspace.folders
        .filter((item) => item.projectId === project.id && !item.parentId)
        .sort((a, b) => a.position - b.position);
    const scenarios = state.workspace.scenarios
        .filter((item) => item.projectId === project.id && !item.folderId)
        .sort((a, b) => a.position - b.position);
    return (
        <section className="automation-project">
            <div className="automation-tree-row automation-project-row">
                <Input
                    className="automation-tree-name"
                    variant="borderless"
                    size="sm"
                    value={project.name}
                    onChange={(event) => state.updateProject(project.id, event.target.value)}
                />
                <Button
                    type="text"
                    size="small"
                    icon={<FolderAddOutlined />}
                    onClick={() => state.addFolder(project.id)}
                />
                <Button
                    type="text"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => state.addScenario(project.id)}
                />
                <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => state.removeProject(project.id)}
                />
            </div>
            {scenarios.map((scenario) => (
                <div
                    key={scenario.id}
                    className={`automation-tree-row automation-scenario-row${state.selectedScenarioId === scenario.id ? ' is-active' : ''}`}
                    onClick={() => state.selectScenario(scenario.id)}
                >
                    <Switch
                        size="small"
                        checked={scenario.enabled}
                        onClick={(_, event) => event.stopPropagation()}
                        onChange={(enabled) => state.updateScenario(scenario.id, { enabled })}
                    />
                    <span>{scenario.name}</span>
                    <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={(event) => {
                            event.stopPropagation();
                            state.removeScenario(scenario.id);
                        }}
                    />
                </div>
            ))}
            {folders.map((folder) => (
                <AutomationFolderNode key={folder.id} folder={folder} depth={0} />
            ))}
        </section>
    );
}
