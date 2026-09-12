import { useState } from 'react';
import { CloseOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { KcxpEnvironment } from '@/shared/kcxp/types';

/**
 * 环境只读提示：由横穿主区域的黄色横幅改为紧凑、可关闭的 Notice，
 * 避免打断工具栏与编辑器之间的垂直节奏。
 */
export default function AutomationEnvironmentWarning({
    environment,
}: {
    environment?: KcxpEnvironment;
}) {
    const [dismissed, setDismissed] = useState(false);
    if (!environment || dismissed) return null;

    const isProduction = environment.environmentType === 'production';
    const needsWriteAuth = !isProduction && !environment.allowAutomationSqlWrite;
    if (!isProduction && !needsWriteAuth) return null;

    return (
        <div className={`automation-notice${isProduction ? ' is-danger' : ''}`} role="status">
            <InfoCircleOutlined className="automation-notice-icon" />
            <span className="automation-notice-text">
                {isProduction
                    ? '生产环境始终禁止自动化 SQL 写入'
                    : '当前环境仅允许 SQL 查询，写操作需在请求设置中显式授权'}
            </span>
            <button
                type="button"
                className="automation-notice-close"
                aria-label="关闭环境提示"
                onClick={() => setDismissed(true)}
            >
                <CloseOutlined />
            </button>
        </div>
    );
}
