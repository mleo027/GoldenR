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
            return defaultWidth;
        },
        [columnWidths],
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
