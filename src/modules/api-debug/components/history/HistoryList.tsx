import { useMemo } from 'react';
import { Button, Dropdown, Empty, Space, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
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
import { formatHistoryTime, getDayKey, getDayLabel, getResultSummary } from './historyFormat';
import type { RequestHistoryEntry } from '../../types/requestHistory';

interface HistoryListProps {
    entries: RequestHistoryEntry[];
    selectedId?: string;
    onSelect: (entry: RequestHistoryEntry) => void;
    onReplay: (entry: RequestHistoryEntry) => void;
    onLoad: (entry: RequestHistoryEntry) => void;
    onCopy: (entry: RequestHistoryEntry) => void;
    onDelete: (entryId: string) => void;
}

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

function HistoryRow({
    entry,
    selected,
    onSelect,
    onReplay,
    onLoad,
    onCopy,
    onDelete,
}: {
    entry: RequestHistoryEntry;
    selected: boolean;
    onSelect: () => void;
    onReplay: () => void;
    onLoad: () => void;
    onCopy: () => void;
    onDelete: () => void;
}) {
    const menuItems: MenuProps['items'] = [
        {
            key: 'load',
            label: '载入到编辑器',
            icon: <SendOutlined />,
            onClick: onLoad,
        },
        {
            key: 'copy',
            label: '复制请求参数',
            icon: <CopyOutlined />,
            onClick: onCopy,
        },
        { type: 'divider' },
        {
            key: 'delete',
            label: '删除',
            icon: <DeleteOutlined />,
            danger: true,
            onClick: onDelete,
        },
    ];

    return (
        <div
            className={`history-row grid items-center gap-2 px-3 py-2 border-b border-[var(--color-divider)] cursor-pointer${
                selected ? ' history-row-selected bg-[var(--color-fill-secondary)]' : ''
            }`}
            style={{ gridTemplateColumns: '110px 72px 56px 90px 80px minmax(220px, 1fr) 76px' }}
            onClick={onSelect}
        >
            <Tooltip title={formatDateTime(entry.timestamp)}>
                <span className="font-mono text-xs">{formatHistoryTime(entry.timestamp)}</span>
            </Tooltip>
            <HistoryStatus entry={entry} />
            <span className="text-xs">{entry.environmentName ?? '-'}</span>
            <span className="font-mono text-xs">{entry.request.msgtype}</span>
            <span className="font-mono text-xs">
                {entry.outcome.timecost == null ? '-' : `${entry.outcome.timecost}ms`}
            </span>
            <Tooltip title={getResultSummary(entry)}>
                <span className="history-result-summary truncate text-xs">
                    {getResultSummary(entry)}
                </span>
            </Tooltip>
            <Space size={2} onClick={(event) => event.stopPropagation()}>
                <Button
                    type="text"
                    size="small"
                    icon={<ReloadOutlined />}
                    title="重新执行"
                    onClick={onReplay}
                />
                <Dropdown menu={{ items: menuItems }} trigger={['click']}>
                    <Button type="text" size="small" icon={<HistoryOutlined />} title="更多" />
                </Dropdown>
            </Space>
        </div>
    );
}

export default function HistoryList({
    entries,
    selectedId,
    onSelect,
    onReplay,
    onLoad,
    onCopy,
    onDelete,
}: HistoryListProps) {
    const groups = useMemo(() => {
        const grouped = new Map<string, RequestHistoryEntry[]>();
        for (const entry of entries) {
            const key = getDayKey(entry.timestamp);
            const list = grouped.get(key) ?? [];
            list.push(entry);
            grouped.set(key, list);
        }
        return [...grouped.entries()].map(([key, items]) => ({
            key,
            label: getDayLabel(items[0]?.timestamp ?? Date.now()),
            items,
        }));
    }, [entries]);

    if (groups.length === 0) {
        return <Empty description="没有匹配的历史记录" />;
    }

    return (
        <div className="request-history-list">
            {groups.map((group) => (
                <div key={group.key}>
                    <div className="history-group-header sticky top-0 z-10 px-3 py-1.5 bg-[var(--color-fill)] text-xs font-medium text-[var(--color-text-secondary)] border-b border-[var(--color-divider)]">
                        {group.label}
                    </div>
                    {group.items.map((entry) => (
                        <HistoryRow
                            key={entry.id}
                            entry={entry}
                            selected={entry.id === selectedId}
                            onSelect={() => onSelect(entry)}
                            onReplay={() => onReplay(entry)}
                            onLoad={() => onLoad(entry)}
                            onCopy={() => onCopy(entry)}
                            onDelete={() => onDelete(entry.id)}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
