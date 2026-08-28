import { Button, Empty, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    CheckCircleFilled,
    CloseCircleFilled,
    CopyOutlined,
    DeleteOutlined,
    HistoryOutlined,
    ReloadOutlined,
    SendOutlined,
} from '@ant-design/icons';
import { formatDateTime } from '../../../../utils/formatDateTime';
import { ControlCharText } from '../../../../utils/ControlCharText';
import { parseKcbpResponseStatus } from '../../utils/kcbp/kcbpResponse';
import type { RequestHistoryEntry } from '../../types/requestHistory';
import type { ParamItem } from '../../types/workspace';

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

function SectionTitle({ children }: { children: string }) {
    return (
        <Typography.Title level={5} className="!mt-0 !mb-2">
            {children}
        </Typography.Title>
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
        <div className="grid gap-3 md:grid-cols-2">
            {items.map(([label, value]) => (
                <div key={label} className="flex gap-2 min-w-0">
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

interface ParamTableRow {
    key: string;
    name: string;
    value: string;
    type: ParamItem['type'];
}

function ParamTable({ params }: { params: ParamItem[] }) {
    const rows: ParamTableRow[] = params.map((param, index) => ({
        key: String(index),
        name: param.name,
        value: param.value,
        type: param.type,
    }));
    const columns: ColumnsType<ParamTableRow> = [
        {
            title: 'Key',
            dataIndex: 'name',
            ellipsis: true,
            render: (text: string) => <span>{text}</span>,
        },
        {
            title: 'Value',
            dataIndex: 'value',
            ellipsis: true,
            render: (text: string) => <span className="break-all">{text}</span>,
        },
        {
            title: 'Type',
            dataIndex: 'type',
            width: 90,
        },
    ];

    if (rows.length === 0) {
        return <Empty description="无请求参数" />;
    }

    return (
        <Table<ParamTableRow>
            size="small"
            rowKey="key"
            columns={columns}
            dataSource={rows}
            pagination={false}
            scroll={{ x: true }}
        />
    );
}

interface RunInputRow {
    key: string;
    name: string;
    value: unknown;
}

function RunInputTable({ runInput }: { runInput: Record<string, unknown> }) {
    const rows: RunInputRow[] = Object.entries(runInput).map(([name, value], index) => ({
        key: String(index),
        name,
        value,
    }));
    const columns: ColumnsType<RunInputRow> = [
        {
            title: 'Key',
            dataIndex: 'name',
            ellipsis: true,
            render: (text: string) => <span>{text}</span>,
        },
        {
            title: 'Value',
            dataIndex: 'value',
            ellipsis: true,
            render: (value: unknown) => <span className="break-all">{formatCellValue(value)}</span>,
        },
    ];

    if (rows.length === 0) {
        return <Empty description="无运行参数" />;
    }

    return (
        <Table<RunInputRow>
            size="small"
            rowKey="key"
            columns={columns}
            dataSource={rows}
            pagination={false}
            scroll={{ x: true }}
        />
    );
}

function formatCellValue(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

interface ResponseTableRow {
    key: string;
    [key: string]: unknown;
}

function ResponseDataTable({ data }: { data: Record<string, unknown>[] }) {
    const keys = [...new Set(data.flatMap((row) => Object.keys(row)))];
    const rows: ResponseTableRow[] = data.map((row, index) => ({
        key: String(index),
        ...row,
    }));
    const columns: ColumnsType<ResponseTableRow> = keys.map((key) => ({
        title: key,
        dataIndex: key,
        key,
        ellipsis: true,
        render: (value: unknown) => (
            <ControlCharText className="break-all" text={formatCellValue(value)} />
        ),
    }));

    if (rows.length === 0) {
        return <Empty description="无响应数据" />;
    }

    return (
        <div className="overflow-x-auto">
            <Table<ResponseTableRow>
                size="small"
                rowKey="key"
                columns={columns}
                dataSource={rows}
                pagination={false}
                scroll={{ x: true }}
            />
        </div>
    );
}

function RequestDetail({ entry }: { entry: RequestHistoryEntry }) {
    return (
        <div className="space-y-4">
            <div className="grid gap-2 md:grid-cols-2">
                <div>
                    <Typography.Text type="secondary">地址：</Typography.Text>
                    <span>{entry.request.address}</span>
                </div>
                <div>
                    <Typography.Text type="secondary">模式：</Typography.Text>
                    {entry.mode.toUpperCase()}
                </div>
                {entry.request.queue ? (
                    <div>
                        <Typography.Text type="secondary">队列：</Typography.Text>
                        <span>{entry.request.queue}</span>
                    </div>
                ) : null}
                {entry.request.timeout ? (
                    <div>
                        <Typography.Text type="secondary">超时：</Typography.Text>
                        <span>{entry.request.timeout}s</span>
                    </div>
                ) : null}
            </div>
            <ParamTable params={entry.request.params} />
            {entry.request.runInput ? <RunInputTable runInput={entry.request.runInput} /> : null}
        </div>
    );
}

function ResponseDetail({ entry }: { entry: RequestHistoryEntry }) {
    const data = entry.response.resultSets.flatMap((resultSet) => resultSet.rows);

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <HistoryStatus entry={entry} />
                <Tag className="ml-2">{String(entry.response.code)}</Tag>
                {entry.response.message ? (
                    <ControlCharText
                        className="min-w-0 break-all text-[var(--color-text-secondary)]"
                        text={entry.response.message}
                    />
                ) : null}
            </div>
            <ResponseDataTable data={data} />
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
                <HistoryOutlined className="text-[var(--color-text-secondary)]" />
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
            <div className="request-history-detail-scroll flex-1 min-h-0 overflow-y-auto">
                <section className="px-4 py-3 border-b border-[var(--color-divider)]">
                    <SectionTitle>概览</SectionTitle>
                    <OverviewPanel entry={entry} />
                </section>
                <section className="px-4 py-3 border-b border-[var(--color-divider)]">
                    <SectionTitle>请求参数</SectionTitle>
                    <RequestDetail entry={entry} />
                </section>
                <section className="px-4 py-3">
                    <SectionTitle>响应</SectionTitle>
                    <ResponseDetail entry={entry} />
                </section>
            </div>
        </div>
    );
}
