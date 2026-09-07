import { Button, Tooltip } from 'antd';
import { FolderAddOutlined, HistoryOutlined } from '@ant-design/icons';

interface CaseActionBarProps {
    onAddProject: () => void;
    onOpenHistory: () => void;
}

export default function CaseActionBar({ onAddProject, onOpenHistory }: CaseActionBarProps) {
    return (
        <div className="case-sidebar-actionbar px-3 py-1.5 flex items-center gap-1 border-b border-[var(--color-divider)]">
            <Tooltip title="新建项目">
                <Button
                    type="text"
                    size="small"
                    icon={<FolderAddOutlined />}
                    onClick={onAddProject}
                    className="case-actionbar-btn"
                    aria-label="新建项目"
                />
            </Tooltip>
            <Tooltip title="请求历史">
                <Button
                    type="text"
                    size="small"
                    icon={<HistoryOutlined />}
                    onClick={onOpenHistory}
                    className="case-actionbar-btn"
                    aria-label="请求历史"
                />
            </Tooltip>
        </div>
    );
}
