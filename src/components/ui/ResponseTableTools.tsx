import { useEffect, useRef, useState, type RefObject } from 'react';
import { Button, Input, Modal, Tooltip, message } from 'antd';
import type { InputRef } from 'antd';
import {
    ExportOutlined,
    FullscreenExitOutlined,
    FullscreenOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import { UI_DEBOUNCE_MS, PERFORMANCE_THRESHOLDS } from '../../constants/ui';
import { useDebouncedDraft } from '../../hooks/useDebouncedDraft';
import { exportTableToCsv } from '../../utils/exportTable';

interface ResponseTableToolsProps {
    disabled?: boolean;
    searchKeyword: string;
    onSearchKeywordChange: (value: string) => void;
    onFullscreen: () => void;
    fullscreenActive?: boolean;
    exportData?: Record<string, unknown>[];
    exportFilename?: string;
}

function ExportSuccessDialog({ filePath }: { filePath: string }) {
    Modal.success({
        title: '导出成功',
        centered: true,
        mousePosition: null,
        content: (
            <div className="export-success-modal">
                <p className="export-success-desc">CSV 文件已保存至：</p>
                <p className="export-success-path">{filePath}</p>
            </div>
        ),
        okText: '知道了',
        width: 520,
    });
}

async function exportResponseTable(
    exportData: Record<string, unknown>[],
    exportFilename: string,
): Promise<void> {
    if (exportData.length >= PERFORMANCE_THRESHOLDS.largeExportRows) {
        message.warning(
            `将导出 ${exportData.length} 行数据，文件可能较大，导出过程可能略有延迟`,
            3,
        );
    }

    const result = await exportTableToCsv(exportData, exportFilename);
    if (result.saved) {
        ExportSuccessDialog({ filePath: result.filePath });
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
            size="small"
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
}: ResponseTableToolsProps) {
    const inputRef = useRef<InputRef>(null);
    const [searchExpanded, setSearchExpanded] = useState(false);

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

    const handleExport = async () => {
        await exportResponseTable(exportData, exportFilename);
    };

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
            <Tooltip title="导出 CSV">
                <Button
                    type="text"
                    size="small"
                    icon={<ExportOutlined />}
                    aria-label="导出 CSV"
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
        </div>
    );
}
