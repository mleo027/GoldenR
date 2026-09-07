import { Typography } from 'antd';

export default function CaseSidebarHeader() {
    return (
        <div className="case-sidebar-header px-3 py-2.5 border-b border-[var(--color-divider)]">
            <Typography.Text strong className="text-sm text-[var(--color-text-title)]">
                用例集
            </Typography.Text>
        </div>
    );
}
