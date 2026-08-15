import { Button, Input, Segmented, Select, Typography } from 'antd';
import { ArrowLeftOutlined, HistoryOutlined } from '@ant-design/icons';
import type { DetailMode, ResultFilter, TimeFilter } from './historyFormat';

interface HistoryToolbarProps {
    counts: Record<ResultFilter, number>;
    query: string;
    resultFilter: ResultFilter;
    timeFilter: TimeFilter;
    environment?: string;
    mode?: string;
    environments: string[];
    detailMode: DetailMode;
    onQueryChange: (value: string) => void;
    onResultChange: (value: ResultFilter) => void;
    onTimeChange: (value: TimeFilter) => void;
    onEnvironmentChange: (value?: string) => void;
    onModeChange: (value?: string) => void;
    onDetailModeChange: (value: DetailMode) => void;
    onClear: () => void;
    onClose: () => void;
}

function ToolbarHeader({
    detailMode,
    onDetailModeChange,
    onClose,
}: {
    detailMode: DetailMode;
    onDetailModeChange: (value: DetailMode) => void;
    onClose: () => void;
}) {
    return (
        <div className="flex items-center gap-2 px-3 py-2">
            <Button type="text" size="small" icon={<ArrowLeftOutlined />} onClick={onClose}>
                返回
            </Button>
            <HistoryOutlined className="text-[var(--color-text-secondary)]" />
            <Typography.Text strong>请求历史</Typography.Text>
            <div className="flex-1" />
            <Segmented<DetailMode>
                size="small"
                value={detailMode}
                onChange={onDetailModeChange}
                options={[
                    { label: '底部', value: 'bottom' },
                    { label: '右侧', value: 'right' },
                    { label: '隐藏', value: 'hidden' },
                ]}
            />
        </div>
    );
}

function ToolbarFilters({
    counts,
    query,
    resultFilter,
    timeFilter,
    environment,
    mode,
    environments,
    onQueryChange,
    onResultChange,
    onTimeChange,
    onEnvironmentChange,
    onModeChange,
    onClear,
}: Pick<
    HistoryToolbarProps,
    | 'counts'
    | 'query'
    | 'resultFilter'
    | 'timeFilter'
    | 'environment'
    | 'mode'
    | 'environments'
    | 'onQueryChange'
    | 'onResultChange'
    | 'onTimeChange'
    | 'onEnvironmentChange'
    | 'onModeChange'
    | 'onClear'
>) {
    return (
        <div className="flex flex-wrap items-center gap-2 px-3 pb-2">
            <Input
                allowClear
                size="small"
                placeholder="搜索历史记录..."
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                className="w-56"
            />
            <Segmented<ResultFilter>
                size="small"
                value={resultFilter}
                onChange={onResultChange}
                options={[
                    { label: `全部 ${counts.all}`, value: 'all' },
                    { label: `失败 ${counts.failed}`, value: 'failed' },
                    { label: `成功 ${counts.success}`, value: 'success' },
                ]}
            />
            <Select
                size="small"
                allowClear
                placeholder="环境"
                value={environment}
                onChange={onEnvironmentChange}
                options={environments.map((name) => ({ value: name, label: name }))}
                className="w-32"
            />
            <Select
                size="small"
                allowClear
                placeholder="类型"
                value={mode}
                onChange={onModeChange}
                options={[
                    { value: 'ui', label: 'UI' },
                    { value: 'script', label: 'Script' },
                    { value: 'tcd', label: 'TCD' },
                ]}
                className="w-28"
            />
            <Select
                size="small"
                value={timeFilter}
                onChange={onTimeChange}
                options={[
                    { value: 'all', label: '全部时间' },
                    { value: 'hour', label: '最近1小时' },
                    { value: 'day', label: '最近24小时' },
                    { value: 'week', label: '最近7天' },
                ]}
                className="w-32"
            />
            <Button type="link" size="small" onClick={onClear}>
                清除筛选
            </Button>
        </div>
    );
}

export default function HistoryToolbar(props: HistoryToolbarProps) {
    return (
        <div className="border-b border-[var(--color-divider)]">
            <ToolbarHeader
                detailMode={props.detailMode}
                onDetailModeChange={props.onDetailModeChange}
                onClose={props.onClose}
            />
            <ToolbarFilters {...props} />
        </div>
    );
}
