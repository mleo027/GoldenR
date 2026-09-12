import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Collapse, Empty, Tag } from 'antd';
import type { AutomationFolderRunReport, AutomationRunReport } from '@/shared/automation/types';

function printable(value: unknown): string {
    return JSON.stringify(value, null, 2) ?? String(value);
}

export default function AutomationReportPanel({
    report,
    folderReport,
}: {
    report?: AutomationRunReport;
    folderReport?: AutomationFolderRunReport;
}) {
    if (!report && folderReport)
        return (
            <div className="automation-report">
                <Tag color={folderReport.status === 'passed' ? 'success' : 'error'}>
                    目录批跑：{folderReport.passedCount} 通过 / {folderReport.failedCount} 失败 /{' '}
                    {folderReport.skippedCount} 跳过 · {folderReport.durationMs} ms
                </Tag>
            </div>
        );
    if (!report) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未运行场景" />;
    const passed = report.steps
        .flatMap((step) => step.actions)
        .filter((a) => a.status === 'passed');
    const failed = report.steps
        .flatMap((step) => step.actions)
        .filter((a) => a.status === 'failed');
    return (
        <div className="automation-report">
            <div className="automation-report-summary">
                {folderReport ? (
                    <Tag color={folderReport.status === 'passed' ? 'success' : 'error'}>
                        目录批跑：{folderReport.passedCount} 通过 / {folderReport.failedCount} 失败
                        / {folderReport.skippedCount} 跳过 · {folderReport.durationMs} ms
                    </Tag>
                ) : null}
                <Tag icon={<CheckCircleOutlined />} color="success">
                    通过 {passed.length}
                </Tag>
                <Tag icon={<CloseCircleOutlined />} color={failed.length ? 'error' : 'default'}>
                    失败 {failed.length}
                </Tag>
                <Tag icon={<ClockCircleOutlined />}>{report.durationMs} ms</Tag>
                {report.forcedTermination ? <Tag color="error">强制终止，清理未执行</Tag> : null}
                {report.error ? (
                    <span className="automation-report-error">{report.error}</span>
                ) : null}
            </div>
            <Collapse
                ghost
                items={report.steps.map((step) => ({
                    key: step.id,
                    label: `${step.status === 'passed' ? '✓' : step.status === 'failed' ? '✕' : '•'} ${step.name} · ${step.durationMs} ms`,
                    children: (
                        <div className="automation-actions">
                            {step.actions.map((action) => (
                                <details
                                    key={action.id}
                                    className={`automation-action is-${action.status}`}
                                >
                                    <summary>
                                        <span>{action.name}</span>
                                        <span>{action.durationMs} ms</span>
                                    </summary>
                                    {action.error ? (
                                        <div className="automation-report-error">
                                            {action.error}
                                        </div>
                                    ) : null}
                                    {action.request !== undefined ? (
                                        <pre>{printable(action.request)}</pre>
                                    ) : null}
                                    {action.result !== undefined ? (
                                        <pre>{printable(action.result)}</pre>
                                    ) : null}
                                </details>
                            ))}
                            {step.actions.length === 0 ? <span>此步骤没有框架动作</span> : null}
                        </div>
                    ),
                }))}
            />
        </div>
    );
}
