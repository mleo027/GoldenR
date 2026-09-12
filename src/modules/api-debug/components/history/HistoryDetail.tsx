import { useEffect, useRef, useState } from 'react';
import { Button, Empty, Tag, Typography } from 'antd';
import Grid from '../../../../components/ui/Grid';
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
import { MAX_HISTORY_RESPONSE_ROWS } from '../../utils/historyResponse';
import { serializeParamsToKcbpIni } from '../../utils/workspace/rawText';

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
        <div className="grid gap-x-6 gap-y-1 md:grid-cols-4">
            {items.map(([label, value]) => (
                <div key={label} className="flex gap-2 min-w-0">
                    <Typography.Text type="secondary" className="w-16 shrink-0 text-xs">
                        {label}
                    </Typography.Text>
                    <span
                        className={`${
                            label === '错误信息' && !entry.outcome.success
                                ? 'text-[var(--color-error)] font-medium'
                                : ''
                        } min-w-0 break-all`}
                    >
                        <span className="text-xs">{value}</span>
                    </span>
                </div>
            ))}
        </div>
    );
}

function ParamTable({ params }: { params: ParamItem[] }) {
    if (params.length === 0) {
        return <Empty description="无请求参数" />;
    }

    const rawText = serializeParamsToKcbpIni(params, { title: '', msgtype: '' });
    return (
        <div className="history-request-params-raw" title={rawText}>
            <code>{rawText}</code>
        </div>
    );

    /*
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
    */
}

function ResponseDataTable({
    data,
    truncated,
    fixedScrollY,
}: {
    data: Record<string, unknown>[];
    truncated: boolean;
    fixedScrollY: number;
}) {
    const keys = [...new Set(data.flatMap((row) => Object.keys(row)))];
    return (
        <div className="history-response-grid flex-1 min-h-0 flex flex-col">
            {truncated ? (
                <Typography.Text type="warning">
                    应答数据已截断，仅展示前 {MAX_HISTORY_RESPONSE_ROWS} 条记录
                </Typography.Text>
            ) : null}
            <Grid data={data} columnKeys={keys} showRowIndex fixedScrollY={fixedScrollY} />
        </div>
    );

    /*
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
        <div className="history-detail-response space-y-2 flex-1 min-h-0 flex flex-col">
            {truncated ? (
                <Typography.Text type="warning">
                    应答数据较大，仅展示前 {MAX_HISTORY_DETAIL_ROWS} 条记录
                </Typography.Text>
            ) : null}
            <Table<ResponseTableRow>
                size="small"
                rowKey="key"
                columns={columns}
                dataSource={rows}
                pagination={{
                    defaultPageSize: 100,
                    showSizeChanger: true,
                    pageSizeOptions: [50, 100, 200],
                    showTotal: (total) => `共 ${total} 条`,
                }}
                scroll={{ x: true }}
            />
        </div>
    );
    */
}

function RequestDetail({ entry }: { entry: RequestHistoryEntry }) {
    return (
        <div className="space-y-2">
            <div className="grid gap-x-4 gap-y-1 md:grid-cols-2 text-xs">
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
        </div>
    );
}

function ResponseDetail({
    entry,
    responseHeight,
}: {
    entry: RequestHistoryEntry;
    responseHeight: number;
}) {
    const data: Record<string, unknown>[] = [];
    let truncated = false;
    for (const resultSet of entry.response.resultSets) {
        for (const row of resultSet.rows) {
            if (data.length >= MAX_HISTORY_RESPONSE_ROWS) {
                truncated = true;
                break;
            }
            data.push(row);
        }
        if (truncated) break;
    }

    return (
        <div className="history-detail-response space-y-2 flex flex-1 min-h-0 flex-col">
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
            <ResponseDataTable
                data={data}
                truncated={truncated || Boolean(entry.response.historyTruncated)}
                fixedScrollY={Math.max(120, responseHeight - 110)}
            />
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
    const [responseHeight, setResponseHeight] = useState(420);
    const [resizing, setResizing] = useState(false);
    const resizeStart = useRef({ y: 0, height: 420 });

    useEffect(() => {
        if (!resizing) return undefined;
        const handlePointerMove = (event: PointerEvent) => {
            const delta = event.clientY - resizeStart.current.y;
            setResponseHeight(Math.max(240, Math.min(1200, resizeStart.current.height - delta)));
        };
        const handlePointerUp = () => setResizing(false);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [resizing]);

    const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
        resizeStart.current = { y: event.clientY, height: responseHeight };
        setResizing(true);
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    if (!entry) {
        return <Empty description="选择一条历史记录查看详情" />;
    }

    return (
        <div className="request-history-detail h-full flex flex-col min-h-0">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--color-divider)]">
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
                <section className="px-3 py-2 border-b border-[var(--color-divider)]">
                    <SectionTitle>概览</SectionTitle>
                    <OverviewPanel entry={entry} />
                </section>
                <section className="px-3 py-2 border-b border-[var(--color-divider)]">
                    <SectionTitle>请求参数</SectionTitle>
                    <RequestDetail entry={entry} />
                </section>
                <section
                    className={`history-detail-response-section px-3 py-2${resizing ? ' is-resizing' : ''}`}
                    style={{ height: responseHeight }}
                >
                    <div
                        className="history-response-resize-handle"
                        role="separator"
                        aria-label="调整响应区域高度"
                        onPointerDown={startResize}
                    />
                    <SectionTitle>响应</SectionTitle>
                    <ResponseDetail entry={entry} responseHeight={responseHeight} />
                </section>
            </div>
        </div>
    );
}
