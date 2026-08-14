import { Button } from 'antd';
import { FolderOutlined } from '@ant-design/icons';

interface CaseSidebarFooterProps {
    onAddProject: () => void;
}

export default function CaseSidebarFooter({ onAddProject }: CaseSidebarFooterProps) {
    return (
        <div className="case-sidebar-footer p-2 border-t border-[var(--color-divider)]">
            <Button
                block
                size="small"
                icon={<FolderOutlined />}
                onClick={onAddProject}
                className="case-footer-btn"
            >
                新建项目
            </Button>
        </div>
    );
}
