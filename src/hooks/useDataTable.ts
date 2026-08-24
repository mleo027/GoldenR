import { useCallback, useEffect, useMemo, useState } from 'react';
import { compareValues, filterRowsByKeyword, type SortOrder } from '../utils/table';
import { PERFORMANCE_THRESHOLDS } from '../constants/ui';

export interface SortInfo {
    field?: string;
    order?: SortOrder;
}

export interface UseDataTableOptions {
    data: Record<string, unknown>[];
    searchKeyword?: string;
    defaultPageSize?: number;
    resetKey?: unknown;
}

const DEFAULT_PAGE_SIZE = 20;

/** 字符宽度估算：中文约 14px，英文约 8px */
function estimateCharWidth(char: string): number {
    // 中文、全角字符宽度约 14px
    if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(char)) {
        return 14;
    }
    // 英文、数字、标点约 8px
    return 8;
}

/** 计算字符串的估算像素宽度 */
function estimateTextWidth(text: string): number {
    if (!text) return 0;
    let width = 0;
    for (const char of text) {
        width += estimateCharWidth(char);
    }
    return width;
}

export function useDataTable({
    data,
    searchKeyword = '',
    defaultPageSize = DEFAULT_PAGE_SIZE,
    resetKey,
}: UseDataTableOptions) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(defaultPageSize);
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const [sortInfo, setSortInfo] = useState<SortInfo>({});

    const columnKeys = useMemo(() => (data.length > 0 ? Object.keys(data[0]) : []), [data]);

    const isLargeDataset = data.length >= PERFORMANCE_THRESHOLDS.largeResponseRows;

    /** 计算每列根据内容自适应的最大宽度（120px - 200px） */
    const columnMaxWidths = useMemo(() => {
        const widths: Record<string, number> = {};
        const MIN_WIDTH = 120;
        const MAX_WIDTH = 200;
        const PADDING = 24; // 单元格内边距

        for (const key of columnKeys) {
            let maxWidth = 0;
            for (const row of data) {
                const value = row[key];
                const text = value == null ? '' : String(value);
                const textWidth = estimateTextWidth(text);
                if (textWidth > maxWidth) {
                    maxWidth = textWidth;
                }
            }
            // 限制在 120px - 200px 之间
            widths[key] = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, maxWidth + PADDING));
        }
        return widths;
    }, [data, columnKeys]);

    const filteredData = useMemo(
        () => filterRowsByKeyword(data, searchKeyword),
        [data, searchKeyword],
    );

    useEffect(() => {
        setPage(1);
        setColumnWidths({});
        setSortInfo({});
    }, [resetKey]);

    useEffect(() => {
        setPage(1);
    }, [searchKeyword]);

    const sortedData = useMemo(() => {
        if (!sortInfo.field || !sortInfo.order) return filteredData;

        return [...filteredData].sort((left, right) =>
            compareValues(left[sortInfo.field!], right[sortInfo.field!], sortInfo.order!),
        );
    }, [filteredData, sortInfo]);

    const paginatedData = useMemo(() => {
        const start = (page - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, page, pageSize]);

    const getColumnWidth = useCallback(
        (key: string, defaultWidth: number, msgWidth?: number) => {
            if (columnWidths[key]) return columnWidths[key];
            if (msgWidth != null && key === 'msg') return msgWidth;
            // 根据内容自适应宽度
            return columnMaxWidths[key] ?? defaultWidth;
        },
        [columnWidths, columnMaxWidths],
    );

    const handleColumnResize = useCallback((key: string, width: number) => {
        setColumnWidths((prev) => ({ ...prev, [key]: width }));
    }, []);

    const handleSortChange = useCallback(
        (field: string | undefined, order: SortOrder | undefined) => {
            if (!field || !order) {
                setSortInfo({});
                return;
            }
            setSortInfo({ field, order });
            setPage(1);
        },
        [],
    );

    const handlePageChange = useCallback(
        (nextPage: number, nextPageSize?: number) => {
            setPage(nextPage);
            if (nextPageSize != null && nextPageSize !== pageSize) {
                setPageSize(nextPageSize);
                setPage(1);
            }
        },
        [pageSize],
    );

    const getGlobalRowIndex = useCallback(
        (localIndex: number) => (page - 1) * pageSize + localIndex + 1,
        [page, pageSize],
    );

    return {
        page,
        pageSize,
        columnKeys,
        columnWidths,
        sortInfo,
        filteredData,
        sortedData,
        paginatedData,
        isLargeDataset,
        getColumnWidth,
        handleColumnResize,
        handleSortChange,
        handlePageChange,
        getGlobalRowIndex,
    };
}
