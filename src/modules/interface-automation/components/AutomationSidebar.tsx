import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useAutomationStore } from '../store/automationStore';
import AutomationProjectNode from './AutomationProjectNode';

export default function AutomationSidebar() {
    const projects = useAutomationStore((state) => state.workspace.projects);
    const addProject = useAutomationStore((state) => state.addProject);
    return (
        <div className="automation-sidebar">
            <div className="automation-sidebar-title">
                <strong>接口自动化</strong>
                <Button size="small" type="text" icon={<PlusOutlined />} onClick={addProject} />
            </div>
            {[...projects]
                .sort((a, b) => a.position - b.position)
                .map((project) => (
                    <AutomationProjectNode key={project.id} project={project} />
                ))}
        </div>
    );
}
