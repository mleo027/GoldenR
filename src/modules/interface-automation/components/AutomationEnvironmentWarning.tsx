import type { KcxpEnvironment } from '@/shared/kcxp/types';

export default function AutomationEnvironmentWarning({
    environment,
}: {
    environment?: KcxpEnvironment;
}) {
    if (environment?.environmentType === 'production') {
        return <div className="automation-warning">生产环境始终禁止自动化 SQL 写入</div>;
    }
    if (environment && !environment.allowAutomationSqlWrite) {
        return (
            <div className="automation-warning">
                当前环境仅允许 SQL 查询；写操作需在请求设置中显式授权
            </div>
        );
    }
    return null;
}
