import { Button, Empty, Tabs, Tag, Typography } from 'antd';
import {
    CheckCircleFilled,
    CloseCircleFilled,
    CopyOutlined,
    DeleteOutlined,
    ReloadOutlined,
    SendOutlined,
} from '@ant-design/icons';
import { formatDateTime } from '../../../../utils/formatDateTime';
import { parseKcbpResponseStatus } from '../../utils/kcbp/kcbpResponse';
import { formatHistoryTime } from './historyFormat';
import type { RequestHistoryEntry } from '../../types/requestHistory';

function HistoryStatus({ entry }: { entry: RequestHistoryEntry }) {
    return entry.outcome.success ? (
        <span className="text-[var(--color-success)]">
            <CheckCircleFilled /> 成功
        </span>
    ) : (
        <span className="text-[var(--color-error)]">
            <CloseCircleFilled /> 失败
        </span>
    );
}

function OverviewPanel({ entry }: { entry: RequestHistoryEntry }) {
    const status = parseKcbpResponseStatus(entry.response);
    const items = [
        ['状态', entry.outcome.success ? '成功' : '失败'],
        ['错误码', String(status.businessCode ?? status.transportCode ?? '-')],
        ['错误信息', status.businessMsg || entry.outcome.message || '-'],
        ['耗时', entry.outcome.timecost == null ? '-' : `${entry.outcome.timecost}ms`],
        ['环境', entry.environmentName ?? '-'],
        ['MsgType', entry.request.msgtype],
        ['地址', entry.request.address],
        ['时间', formatDateTime(entry.timestamp)],
    ];

    return (
        <div className="grid gap-3 p-4 md:grid-cols-2">
            {items.map(([label, value]) => (
                <div key={label} className="flex gap-2">
                    <Typography.Text type="secondary" className="w-20 shrink-0">
                        {label}
                    </Typography.Text>
                    <span
                        className={`${
                            label === '错误信息' && !entry.outcome.success
                                ? 'text-[var(--color-error)] font-medium'
                                : ''
                        } min-w-0 break-all`}
                    >
                        {value}
                    </span>
                </div>
            ))}
        </div>
    );
}

function RequestDetail({ entry }: { entry: RequestHistoryEntry }) {
    return (
        <div className="p-4 space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
                <div>
                    <Typography.Text type="secondary">地址：</Typography.Text>
                    <span className="font-mono">{entry.request.address}</span>
                </div>
                <div>
                    <Typography.Text type="secondary">模式：</Typography.Text>
                    {entry.mode.toUpperCase()}
                </div>
                {entry.request.queue ? (
                    <div>
                        <Typography.Text type="secondary">队列：</Typography.Text>
                        <span className="font-mono">{entry.request.queue}</span>
                    </div>
                ) : null}
                {entry.request.timeout ? (
                    <div>
                        <Typography.Text type="secondary">超时：</Typography.Text>
                        <span className="font-mono">{entry.request.timeout}s</span>
                    </div>
                ) : null}
            </div>
            <pre className="request-history-code max-h-96 overflow-auto whitespace-pre-wrap">
                {JSON.stringify(entry.request.params, null, 2)}
            </pre>
            {entry.request.runInput ? (
                <pre className="request-history-code max-h-96 overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(entry.request.runInput, null, 2)}
                </pre>
            ) : null}
        </div>
    );
}

function ResponseDetail({ entry }: { entry: RequestHistoryEntry }) {
    return (
        <div className="p-4">
            <div className="mb-3">
                <HistoryStatus entry={entry} />
                <Tag className="ml-2">{String(entry.response.code)}</Tag>
            </div>
            <pre className="request-history-code max-h-[520px] overflow-auto whitespace-pre-wrap">
                {JSON.stringify(entry.response, null, 2)}
            </pre>
        </div>
    );
}

function ScriptDetail({ entry }: { entry: RequestHistoryEntry }) {
    if (!entry.request.script) {
        return <Empty description="本次请求没有脚本" />;
    }
    return (
        <pre className="request-history-code p-4 max-h-[520px] overflow-auto whitespace-pre-wrap">
            {entry.request.script}
        </pre>
    );
}

function LogDetail({ entry }: { entry: RequestHistoryEntry }) {
    const consoleEntries = entry.outcome.scriptConsole?.entries ?? [];
    return (
        <div className="p-4 space-y-2">
            {consoleEntries.length === 0 && !entry.outcome.scriptError ? (
                <Empty description="本次请求没有运行日志" />
            ) : null}
            {entry.outcome.scriptError ? (
                <pre className="request-history-code whitespace-pre-wrap text-[var(--color-error)]">
                    {entry.outcome.scriptError}
                </pre>
            ) : null}
            {consoleEntries.map((item, index) => (
                <div key={`${item.timestamp}-${index}`} className="font-mono text-xs">
                    <span className="text-[var(--color-text-muted)]">
                        {formatHistoryTime(item.timestamp)} [{item.level}]
                    </span>{' '}
                    {item.message}
                </div>
            ))}
        </div>
    );
}

export default function HistoryDetail({
    entry,
    onLoad,
    onReplay,
    onCopy,
    onDelete,
}: {
    entry?: RequestHistoryEntry;
    onLoad: () => void;
    onReplay: () => void;
    onCopy: () => void;
    onDelete: () => void;
}) {
    if (!entry) {
        return <Empty description="选择一条历史记录查看详情" />;
    }

    return (
        <div className="request-history-detail h-full flex flex-col min-h-0">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-divider)]">
                <Typography.Text strong>{entry.caseName}</Typography.Text>
                <HistoryStatus entry={entry} />
                <div className="flex-1" />
                <Button size="small" icon={<SendOutlined />} onClick={onLoad}>
                    载入到编辑器
                </Button>
                <Button size="small" type="primary" icon={<ReloadOutlined />} onClick={onReplay}>
                    重新执行
                </Button>
                <Button size="small" icon={<CopyOutlined />} onClick={onCopy}>
                    复制
                </Button>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={onDelete}>
                    删除
                </Button>
            </div>
            <Tabs
                className="request-history-detail-tabs flex-1 min-h-0"
                items={[
                    { key: 'overview', label: '概览', children: <OverviewPanel entry={entry} /> },
                    {
                        key: 'request',
                        label: '请求参数',
                        children: <RequestDetail entry={entry} />,
                    },
                    { key: 'response', label: '响应', children: <ResponseDetail entry={entry} /> },
                    { key: 'script', label: '脚本', children: <ScriptDetail entry={entry} /> },
                    { key: 'logs', label: '日志', children: <LogDetail entry={entry} /> },
                ]}
            />
        </div>
    );
}
