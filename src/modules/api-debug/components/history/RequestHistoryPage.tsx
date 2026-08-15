import { useMemo, useState } from 'react';
import { Button, Empty, Input, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    ArrowLeftOutlined,
    DeleteOutlined,
    HistoryOutlined,
    ReloadOutlined,
    SendOutlined,
} from '@ant-design/icons';
import { useApiDebugEnv } from '../../store/useApiDebugEnv';
import { useRequestHistoryActions, useRequestHistoryState } from '../../store/useRequestHistory';
import { useTabsActions } from '../../store/useTabs';
import { useKcbpCall } from '../../hooks/useKcbpCall';
import { formatDateTime } from '../../../../utils/formatDateTime';
import { parseKcbpResponseStatus } from '../../utils/kcbp/kcbpResponse';
import type { RequestHistoryEntry } from '../../types/requestHistory';

interface RequestHistoryPageProps {
    onClose: () => void;
}

interface HistoryTableProps {
    entries: RequestHistoryEntry[];
    selectedId?: string;
    loading: boolean;
    onSelect: (entry: RequestHistoryEntry) => void;
    onLoad: (entry: RequestHistoryEntry) => void;
    onReplay: (entry: RequestHistoryEntry) => void;
    onDelete: (entryId: string) => void;
}

function ResultTag({ entry }: { entry: RequestHistoryEntry }) {
    const status = parseKcbpResponseStatus(entry.response);
    return (
        <Tag
            color={entry.outcome.success ? 'success' : 'error'}
            title={`${status.businessCode} / ${status.businessMsg}`}
        >
            {entry.outcome.success ? '成功' : '失败'}
        </Tag>
    );
}

function HistoryRowActions({
    entry,
    onLoad,
    onReplay,
    onDelete,
}: {
    entry: RequestHistoryEntry;
    onLoad: (entry: RequestHistoryEntry) => void;
    onReplay: (entry: RequestHistoryEntry) => void;
    onDelete: (entryId: string) => void;
}) {
    return (
        <Space size={4}>
            <Button
                type="text"
                size="small"
                icon={<SendOutlined />}
                title="载入当前请求"
                onClick={() => onLoad(entry)}
            />
            <Button
                type="text"
                size="small"
                icon={<ReloadOutlined />}
                title="重新运行"
                onClick={() => onReplay(entry)}
            />
            <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                title="删除"
                onClick={() => onDelete(entry.id)}
            />
        </Space>
    );
}

function HistoryToolbar({
    count,
    query,
    mode,
    result,
    onQueryChange,
    onModeChange,
    onResultChange,
    onClear,
    onClose,
}: {
    count: number;
    query: string;
    mode?: string;
    result?: string;
    onQueryChange: (value: string) => void;
    onModeChange: (value?: string) => void;
    onResultChange: (value?: string) => void;
    onClear: () => void;
    onClose: () => void;
}) {
    return (
        <>
            <div className="request-history-header flex items-center gap-2 px-3 py-2 border-b border-[var(--color-divider)]">
                <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={onClose}>
                    返回
                </Button>
                <HistoryOutlined className="text-[var(--color-text-secondary)]" />
                <Typography.Text strong>请求历史</Typography.Text>
                <span className="text-xs text-[var(--color-text-muted)]">{count} 条</span>
                <div className="flex-1" />
                <Button size="small" danger onClick={onClear}>
                    清空
                </Button>
            </div>

            <div className="request-history-filters flex items-center gap-2 px-3 py-2 border-b border-[var(--color-divider)]">
                <Input
                    allowClear
                    size="small"
                    placeholder="搜索 Case / Msgtype / 地址 / 消息"
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    className="max-w-xs"
                />
                <Select
                    size="small"
                    allowClear
                    placeholder="模式"
                    value={mode}
                    onChange={onModeChange}
                    options={[
                        { value: 'ui', label: 'UI' },
                        { value: 'script', label: 'Script' },
                        { value: 'tcd', label: 'TCD' },
                    ]}
                    className="w-32"
                />
                <Select
                    size="small"
                    allowClear
                    placeholder="结果"
                    value={result}
                    onChange={onResultChange}
                    options={[
                        { value: 'success', label: '成功' },
                        { value: 'failed', label: '失败' },
                    ]}
                    className="w-32"
                />
            </div>
        </>
    );
}

function HistoryTable({
    entries,
    selectedId,
    loading,
    onSelect,
    onLoad,
    onReplay,
    onDelete,
}: HistoryTableProps) {
    const columns = useMemo<ColumnsType<RequestHistoryEntry>>(
        () => [
            {
                title: '时间',
                dataIndex: 'timestamp',
                width: 150,
                render: (value: number) => formatDateTime(value),
            },
            {
                title: 'Case',
                dataIndex: 'caseName',
                width: 150,
                ellipsis: true,
                render: (_value, entry) => (
                    <span title={`${entry.projectName} / ${entry.caseName}`}>{entry.caseName}</span>
                ),
            },
            {
                title: 'Msgtype',
                dataIndex: ['request', 'msgtype'],
                width: 120,
            },
            {
                title: '地址',
                dataIndex: ['request', 'address'],
                ellipsis: true,
                render: (value: string) => <span className="font-mono">{value}</span>,
            },
            {
                title: '模式',
                dataIndex: 'mode',
                width: 80,
                render: (value: string) => <Tag>{value.toUpperCase()}</Tag>,
            },
            {
                title: '结果',
                width: 90,
                render: (_value, entry) => <ResultTag entry={entry} />,
            },
            {
                title: '耗时',
                dataIndex: ['outcome', 'timecost'],
                width: 90,
                render: (value?: number) => (value == null ? '-' : `${value}ms`),
            },
            {
                title: '行数',
                dataIndex: ['outcome', 'rows'],
                width: 80,
                render: (value?: number) => value ?? '-',
            },
            {
                title: '',
                width: 110,
                render: (_value, entry) => (
                    <HistoryRowActions
                        entry={entry}
                        onLoad={onLoad}
                        onReplay={onReplay}
                        onDelete={onDelete}
                    />
                ),
            },
        ],
        [onDelete, onLoad, onReplay],
    );

    return (
        <Table<RequestHistoryEntry>
            rowKey="id"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={entries}
            pagination={{ pageSize: 50, showSizeChanger: false }}
            onRow={(entry) => ({
                onClick: () => onSelect(entry),
                className: selectedId === entry.id ? 'request-history-row-active' : '',
            })}
        />
    );
}

function RequestHistoryDetail({
    entry,
    onLoad,
    onReplay,
}: {
    entry: RequestHistoryEntry;
    onLoad: () => void;
    onReplay: () => void;
}) {
    return (
        <div className="space-y-3 p-2">
            <div className="flex items-center gap-2">
                <Typography.Text strong>{entry.caseName}</Typography.Text>
                <ResultTag entry={entry} />
                <div className="flex-1" />
                <Button size="small" icon={<SendOutlined />} onClick={onLoad}>
                    载入
                </Button>
                <Button size="small" icon={<ReloadOutlined />} onClick={onReplay}>
                    重跑
                </Button>
            </div>
            <div>
                <Typography.Text type="secondary">时间：</Typography.Text>
                {formatDateTime(entry.timestamp)}
            </div>
            <div>
                <Typography.Text type="secondary">项目：</Typography.Text>
                {entry.projectName}
            </div>
            <div>
                <Typography.Text type="secondary">环境：</Typography.Text>
                {entry.environmentName ?? '-'}
            </div>
            <div>
                <Typography.Text type="secondary">地址：</Typography.Text>
                <span className="font-mono">{entry.request.address}</span>
            </div>
            <div>
                <Typography.Text type="secondary">Msgtype：</Typography.Text>
                <span className="font-mono">{entry.request.msgtype}</span>
            </div>
            {entry.outcome.message ? (
                <div>
                    <Typography.Text type="secondary">结果：</Typography.Text>
                    {entry.outcome.message}
                </div>
            ) : null}
            <div>
                <Typography.Text type="secondary">请求参数：</Typography.Text>
                <pre className="request-history-code max-h-64 overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(entry.request.params, null, 2)}
                </pre>
            </div>
            {entry.request.script ? (
                <div>
                    <Typography.Text type="secondary">脚本：</Typography.Text>
                    <pre className="request-history-code max-h-64 overflow-auto whitespace-pre-wrap">
                        {entry.request.script}
                    </pre>
                </div>
            ) : null}
            <div>
                <Typography.Text type="secondary">响应：</Typography.Text>
                <pre className="request-history-code max-h-64 overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(entry.response, null, 2)}
                </pre>
            </div>
        </div>
    );
}

export default function RequestHistoryPage({ onClose }: RequestHistoryPageProps) {
    const { entries, loaded } = useRequestHistoryState();
    const { deleteEntry, clearHistory } = useRequestHistoryActions();
    const { updateTabUndoable } = useTabsActions();
    const { updateEnv } = useApiDebugEnv();
    const { run } = useKcbpCall();
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState<string>();
    const [result, setResult] = useState<string>();
    const [selectedId, setSelectedId] = useState<string>();

    const filtered = useMemo(() => {
        const keyword = query.trim().toLowerCase();
        return entries.filter((entry) => {
            if (mode && entry.mode !== mode) return false;
            if (result === 'success' && !entry.outcome.success) return false;
            if (result === 'failed' && entry.outcome.success) return false;
            if (!keyword) return true;
            return [
                entry.caseName,
                entry.projectName,
                entry.request.msgtype,
                entry.request.address,
                entry.outcome.message,
                entry.response.message,
            ]
                .filter(Boolean)
                .some((text) => String(text).toLowerCase().includes(keyword));
        });
    }, [entries, mode, query, result]);

    const selected = filtered.find((entry) => entry.id === selectedId) ?? filtered[0];

    const loadEntry = (entry: RequestHistoryEntry) => {
        updateTabUndoable(
            {
                address: entry.request.address,
                params: entry.request.params,
                ...(entry.request.script !== undefined ? { script: entry.request.script } : {}),
                ...(entry.request.runInput !== undefined
                    ? { runInput: entry.request.runInput }
                    : {}),
            },
            '载入历史请求',
        );
        updateEnv('editorMode', entry.mode === 'ui' ? 'ui' : 'script');
    };

    const handleReplay = (entry: RequestHistoryEntry) => {
        loadEntry(entry);
        onClose();
        window.setTimeout(() => {
            void run();
        }, 50);
    };

    return (
        <div className="request-history-page flex flex-col h-full min-h-0">
            <HistoryToolbar
                count={entries.length}
                query={query}
                mode={mode}
                result={result}
                onQueryChange={setQuery}
                onModeChange={setMode}
                onResultChange={setResult}
                onClear={clearHistory}
                onClose={onClose}
            />

            <div className="request-history-body grid grid-cols-1 lg:grid-cols-[minmax(560px,1.2fr)_minmax(360px,0.8fr)] gap-2 flex-1 min-h-0 p-3 overflow-hidden">
                <div className="request-history-list min-w-0 min-h-0 overflow-auto">
                    <HistoryTable
                        entries={filtered}
                        selectedId={selected?.id}
                        loading={!loaded}
                        onSelect={(entry) => setSelectedId(entry.id)}
                        onLoad={(entry) => {
                            loadEntry(entry);
                            onClose();
                        }}
                        onReplay={handleReplay}
                        onDelete={deleteEntry}
                    />
                </div>

                <div className="request-history-detail min-w-0 min-h-0 overflow-auto">
                    {selected ? (
                        <RequestHistoryDetail
                            entry={selected}
                            onLoad={() => {
                                loadEntry(selected);
                                onClose();
                            }}
                            onReplay={() => handleReplay(selected)}
                        />
                    ) : (
                        <Empty description="选择一条历史记录查看详情" />
                    )}
                </div>
            </div>
        </div>
    );
}
