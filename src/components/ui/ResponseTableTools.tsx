import { useEffect, useRef, useState, type RefObject } from 'react';
import { Button, Checkbox, Modal, Popover, Radio, Space, Tooltip, message } from 'antd';
import {
    ExportOutlined,
    EyeOutlined,
    FullscreenExitOutlined,
    FullscreenOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import { UI_DEBOUNCE_MS, PERFORMANCE_THRESHOLDS } from '../../constants/ui';
import { useDebouncedDraft } from '../../hooks/useDebouncedDraft';
import { exportTableToCsv, exportTableToText } from '../../utils/exportTable';
import { Input } from './primitives';
import type { InputRef } from './primitives';

interface ResponseTableToolsProps {
    disabled?: boolean;
    searchKeyword: string;
    onSearchKeywordChange: (value: string) => void;
    onFullscreen: () => void;
    fullscreenActive?: boolean;
    exportData?: Record<string, unknown>[];
    exportFilename?: string;
    traceAvailable?: boolean;
    onViewTrace?: () => void;
    columnKeys?: string[];
    visibleColumnKeys?: string[];
    onVisibleColumnKeysChange?: (keys: string[]) => void;
}

type ExportFormat = 'csv' | 'text';

function toTxtFilename(filename: string): string {
    return `${filename.replace(/\.csv$/i, '')}.txt`;
}

async function exportResponseTable(
    exportData: Record<string, unknown>[],
    exportFilename: string,
    format: ExportFormat,
): Promise<void> {
    if (exportData.length >= PERFORMANCE_THRESHOLDS.largeExportRows) {
        message.warning(
            `将导出 ${exportData.length} 行数据，文件可能较大，导出过程可能略有延迟`,
            3,
        );
    }

    const result =
        format === 'text'
            ? await exportTableToText(exportData, toTxtFilename(exportFilename))
            : await exportTableToCsv(exportData, exportFilename);
    if (result.saved) {
        const formatLabel = format === 'text' ? 'TXT' : 'CSV';
        message.success(`已导出 ${formatLabel}：${result.filePath}`);
    } else if (result.reason === 'empty') {
        message.warning('暂无数据可导出');
    }
}

function ResponseTableSearchInput({
    inputRef,
    disabled,
    draft,
    onSearchChange,
    onSearchClear,
    onSearchBlur,
    onCommit,
}: {
    inputRef: RefObject<InputRef>;
    disabled: boolean;
    draft: string;
    onSearchChange: (value: string) => void;
    onSearchClear: () => void;
    onSearchBlur: () => void;
    onCommit: (value: string) => void;
}) {
    return (
        <Input
            ref={inputRef}
            allowClear
            size="sm"
            placeholder="搜索表格内容"
            prefix={<SearchOutlined className="text-[var(--color-text-muted)]" />}
            value={draft}
            onChange={(event) => onSearchChange(event.target.value)}
            onClear={onSearchClear}
            onBlur={onSearchBlur}
            onPressEnter={() => onCommit(draft)}
            className="response-table-tools-search"
            disabled={disabled}
        />
    );
}

export default function ResponseTableTools({
    disabled = false,
    searchKeyword,
    onSearchKeywordChange,
    onFullscreen,
    fullscreenActive = false,
    exportData = [],
    exportFilename = 'response.csv',
    traceAvailable = false,
    onViewTrace,
    columnKeys = [],
    visibleColumnKeys = columnKeys,
    onVisibleColumnKeysChange,
}: ResponseTableToolsProps) {
    const inputRef = useRef<InputRef>(null);
    const [searchExpanded, setSearchExpanded] = useState(false);
    const [formatModalOpen, setFormatModalOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
    const [columnSearch, setColumnSearch] = useState('');

    const { draft, setDraftDebounced, commitNow, clearDraft, flushPending } = useDebouncedDraft(
        searchKeyword,
        {
            delayMs: UI_DEBOUNCE_MS.search,
            onCommit: onSearchKeywordChange,
        },
    );

    const showSearchInput = searchExpanded || draft.length > 0 || searchKeyword.length > 0;
    const hasActiveSearch = draft.length > 0 || searchKeyword.length > 0;

    useEffect(() => {
        if (showSearchInput) {
            inputRef.current?.focus();
        }
    }, [showSearchInput]);

    const handleToggleSearch = () => {
        if (showSearchInput && !hasActiveSearch) {
            setSearchExpanded(false);
            return;
        }
        setSearchExpanded(true);
    };

    const handleSearchChange = (value: string) => {
        setDraftDebounced(value);
        if (value) {
            setSearchExpanded(true);
        }
    };

    const handleSearchClear = () => {
        clearDraft();
        setSearchExpanded(false);
    };

    const handleSearchBlur = () => {
        flushPending();
        if (!draft && !searchKeyword) {
            setSearchExpanded(false);
        }
    };

    const handleExport = () => {
        setFormatModalOpen(true);
    };

    const handleExportConfirm = async () => {
        setFormatModalOpen(false);
        await exportResponseTable(exportData, exportFilename, exportFormat);
    };

    const filteredColumnKeys = columnKeys.filter((key) =>
        key.toLowerCase().includes(columnSearch.trim().toLowerCase()),
    );
    const allColumnsSelected =
        columnKeys.length > 0 && visibleColumnKeys.length === columnKeys.length;

    const columnPicker =
        columnKeys.length > 0 && onVisibleColumnKeysChange ? (
            <div className="response-column-picker">
                <div className="response-column-picker-actions">
                    <Button
                        type="link"
                        size="small"
                        onClick={() =>
                            onVisibleColumnKeysChange(allColumnsSelected ? [] : columnKeys)
                        }
                    >
                        {allColumnsSelected ? '取消全选' : '全选'}
                    </Button>
                </div>
                <Input
                    allowClear
                    size="sm"
                    value={columnSearch}
                    onChange={(event) => setColumnSearch(event.target.value)}
                    placeholder="搜索列名"
                    className="response-column-picker-search"
                />
                <div className="response-column-picker-list">
                    {filteredColumnKeys.map((key) => (
                        <Checkbox
                            key={key}
                            checked={visibleColumnKeys.includes(key)}
                            onChange={(event) => {
                                const next = event.target.checked
                                    ? [...visibleColumnKeys, key]
                                    : visibleColumnKeys.filter((item) => item !== key);
                                onVisibleColumnKeysChange(next);
                            }}
                        >
                            {key}
                        </Checkbox>
                    ))}
                    {filteredColumnKeys.length === 0 && (
                        <span className="response-column-picker-empty">未找到列</span>
                    )}
                </div>
            </div>
        ) : null;

    return (
        <div className="response-table-tools">
            {showSearchInput && (
                <ResponseTableSearchInput
                    inputRef={inputRef}
                    disabled={disabled}
                    draft={draft}
                    onSearchChange={handleSearchChange}
                    onSearchClear={handleSearchClear}
                    onSearchBlur={handleSearchBlur}
                    onCommit={commitNow}
                />
            )}
            <Tooltip title="搜索数据">
                <Button
                    type="text"
                    size="small"
                    icon={<SearchOutlined />}
                    aria-label="搜索数据"
                    className={`response-table-tools-btn ${hasActiveSearch ? 'response-table-tools-btn-active' : ''}`}
                    disabled={disabled}
                    onClick={handleToggleSearch}
                />
            </Tooltip>
            {traceAvailable && onViewTrace ? (
                <Tooltip title="查看 SQL Trace 详情">
                    <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        aria-label="查看 SQL Trace 详情"
                        className="response-table-tools-btn"
                        onClick={onViewTrace}
                    />
                </Tooltip>
            ) : null}
            {columnPicker ? (
                <Popover
                    trigger="click"
                    placement="bottomRight"
                    content={columnPicker}
                    title="显示列"
                >
                    <Tooltip title="选择显示列">
                        <Button
                            type="text"
                            size="small"
                            className="response-table-tools-btn"
                            aria-label="选择显示列"
                        >
                            列
                        </Button>
                    </Tooltip>
                </Popover>
            ) : null}
            <Tooltip title="导出">
                <Button
                    type="text"
                    size="small"
                    icon={<ExportOutlined />}
                    aria-label="导出"
                    className="response-table-tools-btn"
                    disabled={disabled}
                    onClick={handleExport}
                />
            </Tooltip>
            <Tooltip title={fullscreenActive ? '退出全屏' : '全屏查看'}>
                <Button
                    type="text"
                    size="small"
                    icon={fullscreenActive ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                    aria-label={fullscreenActive ? '退出全屏' : '全屏查看'}
                    className="response-table-tools-btn"
                    disabled={disabled}
                    onClick={onFullscreen}
                />
            </Tooltip>
            <Modal
                open={formatModalOpen}
                title="选择导出格式"
                okText="导出"
                cancelText="取消"
                width={380}
                onOk={handleExportConfirm}
                onCancel={() => setFormatModalOpen(false)}
            >
                <Radio.Group
                    value={exportFormat}
                    onChange={(event) => setExportFormat(event.target.value)}
                >
                    <Space direction="vertical">
                        <Radio value="csv">CSV 文件（逗号分隔）</Radio>
                        <Radio value="text">纯文本（对齐表格）</Radio>
                    </Space>
                </Radio.Group>
            </Modal>
        </div>
    );
}
