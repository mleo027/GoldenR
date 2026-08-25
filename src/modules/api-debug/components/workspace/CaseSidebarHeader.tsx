import { Button, Tooltip, Typography } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';

interface CaseSidebarHeaderProps {
    onOpenHistory: () => void;
}

export default function CaseSidebarHeader({ onOpenHistory }: CaseSidebarHeaderProps) {
    return (
        <div className="case-sidebar-header px-3 py-2.5 border-b border-[var(--color-divider)] flex items-center justify-between gap-2">
            <Typography.Text strong className="text-sm text-[var(--color-text-title)]">
                用例集
            </Typography.Text>
            <Tooltip title="请求历史">
                <Button
                    type="text"
                    size="small"
                    icon={<HistoryOutlined />}
                    onClick={onOpenHistory}
                    className="case-header-history"
                    aria-label="请求历史"
                />
            </Tooltip>
        </div>
    );
}
