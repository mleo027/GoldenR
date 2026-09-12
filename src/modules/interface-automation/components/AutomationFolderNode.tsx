import {
    FolderAddOutlined,
    FolderOpenOutlined,
    MoreOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import { Button } from '@/components/ui/primitives';
import type { AutomationFolder } from '@/shared/automation/types';
import { useAutomationStore } from '../store/automationStore';
import AutomationScenarioNode from './AutomationScenarioNode';

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
            <div
                className="automation-tree-row automation-folder-row"
                style={{ paddingLeft: 8 + depth * 14 }}
            >
                <FolderOpenOutlined className="automation-folder-icon" />
                <span className="automation-tree-name">{folder.name}</span>
                <Tooltip title="添加子目录">
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<FolderAddOutlined />}
                        onClick={() => state.addFolder(folder.projectId, folder.id)}
                    />
                </Tooltip>
                <Tooltip title="添加场景">
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<PlusOutlined />}
                        onClick={() => state.addScenario(folder.projectId, folder.id)}
                    />
                </Tooltip>
                <Button
                    className="automation-project-more"
                    variant="ghost"
                    size="sm"
                    icon={<MoreOutlined />}
                    aria-label="目录更多操作"
                />
            </div>
            {scenarios.map((scenario) => (
                <AutomationScenarioNode key={scenario.id} scenario={scenario} depth={depth + 1} />
            ))}
            {childFolders.map((child) => (
                <AutomationFolderNode key={child.id} folder={child} depth={depth + 1} />
            ))}
        </div>
    );
}
