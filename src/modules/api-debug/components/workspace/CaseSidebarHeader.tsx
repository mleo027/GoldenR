import { Button, Typography } from 'antd';
import { FolderOutlined, HistoryOutlined } from '@ant-design/icons';

interface CaseSidebarHeaderProps {
    onAddProject: () => void;
    onOpenHistory: () => void;
}

export default function CaseSidebarHeader({ onAddProject, onOpenHistory }: CaseSidebarHeaderProps) {
    return (
        <div className="case-sidebar-header px-3 py-2.5 border-b border-[var(--color-divider)] flex items-center justify-between gap-2">
            <Typography.Text strong className="text-sm text-[var(--color-text-title)]">
                用例集
            </Typography.Text>
            <Button
                type="text"
                size="small"
                icon={<FolderOutlined />}
                onClick={onAddProject}
                className="case-header-add"
                title="新建项目"
            >
                项目
            </Button>
            <Button
                type="text"
                size="small"
                icon={<HistoryOutlined />}
                onClick={onOpenHistory}
                className="case-header-history"
                title="请求历史"
            />
        </div>
    );
}
