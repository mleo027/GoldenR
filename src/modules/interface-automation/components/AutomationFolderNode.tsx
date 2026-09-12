import { DeleteOutlined, FolderAddOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Switch, Tooltip } from 'antd';
import { Input } from '@/components/ui/primitives';
import type { AutomationFolder } from '@/shared/automation/types';
import { useAutomationStore } from '../store/automationStore';

export default function AutomationFolderNode({
    folder,
    depth,
}: {
    folder: AutomationFolder;
    depth: number;
}) {
    const state = useAutomationStore();
    const childFolders = state.workspace.folders
        .filter((item) => item.parentId === folder.id)
        .sort((a, b) => a.position - b.position);
    const scenarios = state.workspace.scenarios
        .filter((item) => item.folderId === folder.id)
        .sort((a, b) => a.position - b.position);
    return (
        <div>
            <div className="automation-tree-row" style={{ paddingLeft: 8 + depth * 14 }}>
                <Input
                    className="automation-tree-name"
                    variant="borderless"
                    size="sm"
                    value={folder.name}
                    onChange={(event) => state.updateFolder(folder.id, event.target.value)}
                />
                <Tooltip title="添加子目录">
                    <Button
                        type="text"
                        size="small"
                        icon={<FolderAddOutlined />}
                        onClick={() => state.addFolder(folder.projectId, folder.id)}
                    />
                </Tooltip>
                <Tooltip title="添加场景">
                    <Button
                        type="text"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => state.addScenario(folder.projectId, folder.id)}
                    />
                </Tooltip>
                <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => state.removeFolder(folder.id)}
                />
            </div>
            {scenarios.map((scenario) => (
                <div
                    key={scenario.id}
                    className={`automation-tree-row automation-scenario-row${state.selectedScenarioId === scenario.id ? ' is-active' : ''}`}
                    style={{ paddingLeft: 28 + depth * 14 }}
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
            {childFolders.map((child) => (
                <AutomationFolderNode key={child.id} folder={child} depth={depth + 1} />
            ))}
        </div>
    );
}
