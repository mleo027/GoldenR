import { Segmented } from 'antd';
import {
    AppstoreOutlined,
    ClearOutlined,
    ClockCircleOutlined,
    EnvironmentOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import { Button, Input, Select } from '../../../../components/ui/primitives';
import type { ResultFilter, TimeFilter } from './historyFormat';

interface HistoryToolbarProps {
    counts: Record<ResultFilter, number>;
    filteredCount?: number;
    query: string;
    resultFilter: ResultFilter;
    timeFilter: TimeFilter;
    environment?: string;
    mode?: string;
    environments: string[];
    onQueryChange: (value: string) => void;
    onResultChange: (value: ResultFilter) => void;
    onTimeChange: (value: TimeFilter) => void;
    onEnvironmentChange: (value?: string) => void;
    onModeChange: (value?: string) => void;
    onClear: () => void;
}

type ToolbarFilterProps = Pick<
    HistoryToolbarProps,
    | 'counts'
    | 'filteredCount'
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
>;

function ToolbarSearchRow({
    counts,
    filteredCount,
    query,
    onQueryChange,
}: Pick<ToolbarFilterProps, 'counts' | 'filteredCount' | 'query' | 'onQueryChange'>) {
    const shownCount = filteredCount ?? counts.all;

    return (
        <div className="history-toolbar-search-row">
            <Input
                allowClear
                size="md"
                placeholder="搜索 Msgtype / 地址 / 关键字…"
                prefix={<SearchOutlined className="history-toolbar-search-icon" />}
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                className="history-toolbar-search"
                aria-label="搜索历史记录"
            />
            <span className="history-toolbar-count" aria-live="polite">
                {shownCount === counts.all
                    ? `共 ${counts.all} 条`
                    : `${shownCount} / ${counts.all} 条`}
            </span>
        </div>
    );
}

function ResultFilterSegmented({
    counts,
    value,
    onChange,
}: {
    counts: Record<ResultFilter, number>;
    value: ResultFilter;
    onChange: (value: ResultFilter) => void;
}) {
    return (
        <Segmented<ResultFilter>
            size="small"
            value={value}
            onChange={onChange}
            className="history-toolbar-segmented"
            aria-label="按结果筛选"
            options={[
                {
                    label: (
                        <span className="history-toolbar-segment-label">
                            全部
                            <em className="history-toolbar-segment-count">{counts.all}</em>
                        </span>
                    ),
                    value: 'all',
                },
                {
                    label: (
                        <span className="history-toolbar-segment-label">
                            <span className="history-toolbar-dot history-toolbar-dot--failed" />
                            失败
                            <em className="history-toolbar-segment-count">{counts.failed}</em>
                        </span>
                    ),
                    value: 'failed',
                },
                {
                    label: (
                        <span className="history-toolbar-segment-label">
                            <span className="history-toolbar-dot history-toolbar-dot--success" />
                            成功
                            <em className="history-toolbar-segment-count">{counts.success}</em>
                        </span>
                    ),
                    value: 'success',
                },
            ]}
        />
    );
}

function ToolbarFilterRow({
    counts,
    query,
    resultFilter,
    timeFilter,
    environment,
    mode,
    environments,
    onResultChange,
    onTimeChange,
    onEnvironmentChange,
    onModeChange,
    onClear,
}: Omit<ToolbarFilterProps, 'filteredCount' | 'onQueryChange'>) {
    const hasActiveFilters =
        query.trim() !== '' ||
        resultFilter !== 'all' ||
        timeFilter !== 'day' ||
        environment !== undefined ||
        mode !== undefined;

    return (
        <div className="history-toolbar-filter-row">
            <ResultFilterSegmented counts={counts} value={resultFilter} onChange={onResultChange} />
            <span className="history-toolbar-divider" aria-hidden />
            <Select
                size="sm"
                allowClear
                showSearch
                prefix={<EnvironmentOutlined />}
                placeholder="环境"
                value={environment}
                onChange={onEnvironmentChange}
                options={environments.map((name) => ({ value: name, label: name }))}
                className="history-toolbar-select"
                aria-label="按环境筛选"
            />
            <Select
                size="sm"
                allowClear
                prefix={<AppstoreOutlined />}
                placeholder="类型"
                value={mode}
                onChange={onModeChange}
                options={[
                    { value: 'ui', label: 'UI' },
                    { value: 'script', label: 'Script' },
                ]}
                className="history-toolbar-select history-toolbar-select--narrow"
                aria-label="按类型筛选"
            />
            <Select
                size="sm"
                prefix={<ClockCircleOutlined />}
                value={timeFilter}
                onChange={onTimeChange}
                options={[
                    { value: 'all', label: '全部时间' },
                    { value: 'hour', label: '最近 1 小时' },
                    { value: 'day', label: '最近 24 小时' },
                    { value: 'week', label: '最近 7 天' },
                ]}
                className="history-toolbar-select"
                aria-label="按时间筛选"
            />
            <span className="history-toolbar-spacer" />
            <Button
                variant="ghost"
                size="sm"
                icon={<ClearOutlined />}
                onClick={onClear}
                disabled={!hasActiveFilters}
                className="history-toolbar-clear"
                aria-label="清除筛选"
            >
                清除筛选
            </Button>
        </div>
    );
}

function ToolbarFilters(props: ToolbarFilterProps) {
    return (
        <div className="history-toolbar">
            <ToolbarSearchRow {...props} />
            <ToolbarFilterRow {...props} />
        </div>
    );
}

export default function HistoryToolbar(props: HistoryToolbarProps) {
    return <ToolbarFilters {...props} />;
}
