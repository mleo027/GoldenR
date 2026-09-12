import { useMemo, useState } from 'react';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    ClockCircleOutlined,
    ReloadOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import { Collapse, Empty, Tabs, Tag, Tooltip } from 'antd';
import { Button, Input } from '@/components/ui/primitives';
import type { AutomationFolderRunReport, AutomationRunReport } from '@/shared/automation/types';

const lineNumber = (error?: string) => {
    const match = error?.match(/(?:scenario\.js|<anonymous>):(\d+)(?::\d+)?/);
    return match ? Number(match[1]) : undefined;
};

function statusClass(status: string) {
    return status === 'passed' ? 'is-passed' : status === 'failed' ? 'is-failed' : 'is-neutral';
}

type Action = AutomationRunReport['steps'][number]['actions'][number];

function ActionError({
    error,
    onGoToLine,
}: {
    error: string;
    onGoToLine?: (line: number) => void;
}) {
    const line = lineNumber(error);
    return (
        <div className="automation-report-error">
            {error}
            {line ? (
                <button type="button" onClick={() => onGoToLine?.(line)}>
                    跳转至第 {line} 行
                </button>
            ) : null}
        </div>
    );
}

function JsonTree({ label, value }: { label: string; value: unknown }) {
    if (!value || typeof value !== 'object') {
        return (
            <div className="automation-json-value">
                {label ? <b>{label}</b> : null}
                <code>{JSON.stringify(value)}</code>
            </div>
        );
    }
    const entries = Array.isArray(value)
        ? value.map((item, index) => [String(index), item] as const)
        : Object.entries(value);
    return (
        <details className="automation-json-tree">
            <summary>
                {label ? `${label} · ` : ''}
                {Array.isArray(value) ? `数组 (${entries.length})` : `对象 (${entries.length})`}
            </summary>
            <div className="automation-json-children">
                {entries.map(([key, item]) => (
                    <div key={key} className="automation-json-entry">
                        <span>{key}</span>
                        <JsonTree label="" value={item} />
                    </div>
                ))}
            </div>
        </details>
    );
}

function ActionCard({
    action,
    onGoToLine,
}: {
    action: Action;
    onGoToLine?: (line: number) => void;
}) {
    return (
        <details className={`automation-action ${statusClass(action.status)}`}>
            <summary>
                <span>
                    <b>{action.kind}</b>
                    {action.name}
                </span>
                <span>{action.durationMs} ms</span>
            </summary>
            {action.error ? <ActionError error={action.error} onGoToLine={onGoToLine} /> : null}
            {action.request !== undefined ? <JsonTree label="请求" value={action.request} /> : null}
            {action.result !== undefined ? <JsonTree label="结果" value={action.result} /> : null}
        </details>
    );
}

function StepList({
    steps,
    query,
    onGoToLine,
}: {
    steps: AutomationRunReport['steps'];
    query: string;
    onGoToLine?: (line: number) => void;
}) {
    const matching = (value: string) => !query || value.toLowerCase().includes(query.toLowerCase());
    const items = steps
        .filter(
            (step) => matching(step.name) || step.actions.some((action) => matching(action.name)),
        )
        .map((step) => ({
            key: step.id,
            label: (
                <span className={`automation-step-heading ${statusClass(step.status)}`}>
                    <span>
                        {step.status === 'passed' ? '✓' : step.status === 'failed' ? '✕' : '•'}
                    </span>
                    <strong>{step.name}</strong>
                    <small>{step.durationMs} ms</small>
                </span>
            ),
            children: (
                <div className="automation-actions">
                    {step.error ? <ActionError error={step.error} onGoToLine={onGoToLine} /> : null}
                    {step.actions.map((action) => (
                        <ActionCard key={action.id} action={action} onGoToLine={onGoToLine} />
                    ))}
                    {step.actions.length === 0 ? <span>此步骤没有框架动作</span> : null}
                </div>
            ),
        }));
    return <Collapse ghost className="automation-step-list" items={items} />;
}

function OutputList({ actions, empty }: { actions: Action[]; empty: string }) {
    if (!actions.length) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty} />;
    return (
        <div className="automation-output-list">
            {actions.map((action) => (
                <details
                    key={action.id}
                    className={`automation-action ${statusClass(action.status)}`}
                >
                    <summary>
                        <span>
                            <b>{action.name.toUpperCase()}</b>
                            {action.kind === 'api-call' ? action.name : '输出'}
                        </span>
                        <span>{action.durationMs} ms</span>
                    </summary>
                    {action.request !== undefined ? (
                        <JsonTree label="请求" value={action.request} />
                    ) : null}
                    {action.result !== undefined ? (
                        <JsonTree label="结果" value={action.result} />
                    ) : null}
                    {action.error ? (
                        <div className="automation-report-error">{action.error}</div>
                    ) : null}
                </details>
            ))}
        </div>
    );
}

function FolderSummary({ report }: { report: AutomationFolderRunReport }) {
    return (
        <Tag color={report.status === 'passed' ? 'success' : 'error'}>
            目录批跑：{report.passedCount} 通过 / {report.failedCount} 失败 / {report.skippedCount}{' '}
            跳过 · {report.durationMs} ms
        </Tag>
    );
}

function ReportSummary({
    report,
    folderReport,
    query,
    setQuery,
    onGoToLine,
    onRerun,
}: {
    report: AutomationRunReport;
    folderReport?: AutomationFolderRunReport;
    query: string;
    setQuery: (value: string) => void;
    onGoToLine?: (line: number) => void;
    onRerun?: () => void;
}) {
    const passed = report.steps
        .flatMap((step) => step.actions)
        .filter((a) => a.status === 'passed');
    const failed = report.steps
        .flatMap((step) => step.actions)
        .filter((a) => a.status === 'failed');
    return (
        <div className="automation-report-summary">
            {folderReport ? <FolderSummary report={folderReport} /> : null}
            <Tag className="automation-summary-pill is-passed" icon={<CheckCircleOutlined />}>
                通过 {passed.length}
            </Tag>
            <Tag
                className={`automation-summary-pill ${failed.length ? 'is-failed' : 'is-neutral'}`}
                icon={<CloseCircleOutlined />}
            >
                失败 {failed.length}
            </Tag>
            <Tag icon={<ClockCircleOutlined />}>{report.durationMs} ms</Tag>
            <span className="automation-report-time">
                {new Date(report.startedAt).toLocaleTimeString()}
            </span>
            <span className="automation-report-actions">
                <Tooltip title="搜索输出">
                    <Input
                        aria-label="搜索输出"
                        size="sm"
                        prefix={<SearchOutlined />}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                    />
                </Tooltip>
                <Tooltip title="重新运行">
                    <Button variant="ghost" size="sm" icon={<ReloadOutlined />} onClick={onRerun} />
                </Tooltip>
            </span>
            {report.forcedTermination ? <Tag color="error">强制终止，清理未执行</Tag> : null}
            {report.error ? <ActionError error={report.error} onGoToLine={onGoToLine} /> : null}
        </div>
    );
}

export default function AutomationReportPanel({
    report,
    folderReport,
    onGoToLine,
    onRerun,
}: {
    report?: AutomationRunReport;
    folderReport?: AutomationFolderRunReport;
    onGoToLine?: (line: number) => void;
    onRerun?: () => void;
}) {
    const [query, setQuery] = useState('');
    const actions = useMemo(
        () => report?.steps.flatMap((step) => step.actions) ?? [],
        [report?.steps],
    );
    if (!report && folderReport)
        return (
            <div className="automation-report">
                <FolderSummary report={folderReport} />
            </div>
        );
    if (!report) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚未运行场景" />;
    const logs = actions.filter((action) => action.kind === 'log');
    const network = actions.filter((action) => action.kind === 'api-call');
    return (
        <div className="automation-report">
            <ReportSummary
                report={report}
                folderReport={folderReport}
                query={query}
                setQuery={setQuery}
                onGoToLine={onGoToLine}
                onRerun={onRerun}
            />
            <Tabs
                className="automation-output-tabs"
                items={[
                    {
                        key: 'runner',
                        label: '执行步骤与断言',
                        children: (
                            <StepList steps={report.steps} query={query} onGoToLine={onGoToLine} />
                        ),
                    },
                    {
                        key: 'console',
                        label: `控制台日志 (${logs.length})`,
                        children: <OutputList actions={logs} empty="暂无结构化日志" />,
                    },
                    {
                        key: 'network',
                        label: `网络请求 (${network.length})`,
                        children: <OutputList actions={network} empty="暂无接口调用" />,
                    },
                ]}
            />
        </div>
    );
}
