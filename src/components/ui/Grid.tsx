import {
    useEffect,
    useMemo,
    useRef,
    useState,
    useCallback,
    memo,
    lazy,
    Suspense,
    type ReactNode,
    type RefObject,
} from 'react';
import { Table, Tooltip, Pagination, message } from 'antd';
import { InboxOutlined, SendOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import ResizableHeaderCell from './ResizableHeaderCell';
import PanelEmptyState from './PanelEmptyState';
import ResponseTableSkeleton from './ResponseTableSkeleton';
import { useDataTable } from '../../hooks/useDataTable';
import type { SortOrder } from '../../utils/table';
import { PERFORMANCE_THRESHOLDS } from '../../constants/ui';
import { ControlCharText } from '../../utils/ControlCharText';

const RowDetailModal = lazy(() => import('./RowDetailModal'));

interface RowDetailState {
    rowIndex: number;
    record: Record<string, unknown>;
}

interface GridData {
    key: string;
    [key: string]: string | number | boolean | undefined;
}

const DEFAULT_COL_WIDTH = 120;
const MSG_COL_WIDTH = 280;
const ROW_INDEX_WIDTH = 56;
const TABLE_HEADER_HEIGHT = 40;

function isEmptyCellValue(value: unknown): boolean {
    return value == null || value === '';
}

function isNumericColumnKey(key: string): boolean {
    const lower = key.toLowerCase();
    return (
        lower.includes('id') ||
        lower.includes('num') ||
        lower.includes('qty') ||
        lower.includes('amt') ||
        lower.includes('price') ||
        lower.includes('rate') ||
        lower.endsWith('flag') ||
        lower === 'brhid'
    );
}

function formatCellText(value: unknown): string {
    if (isEmptyCellValue(value)) return '';
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

const responseEmpty = (
    <PanelEmptyState
        className="response-empty"
        icon={<InboxOutlined />}
        title="等待响应数据"
        description={
            <>
                <SendOutlined className="response-empty-hint-icon" />
                配置地址与入参后点击 Run，结果将显示在此处
            </>
        }
    />
);

const searchEmptyState = (
    <PanelEmptyState
        className="response-empty response-search-empty"
        icon={<InboxOutlined />}
        title="无匹配结果"
        description="尝试调整搜索关键词"
    />
);

function buildGridColumns({
    columnKeys,
    showRowIndex,
    getColumnWidth,
    sortInfo,
    handleColumnResize,
    getGlobalRowIndex,
}: {
    columnKeys: string[];
    showRowIndex: boolean;
    getColumnWidth: (key: string, fallback: number, msgWidth: number) => number;
    sortInfo: { field?: string; order?: SortOrder };
    handleColumnResize: (key: string, width: number) => void;
    getGlobalRowIndex: (index: number) => number;
}): ColumnsType<GridData> {
    const dataColumns: ColumnsType<GridData> = columnKeys.map((key) => ({
        title: (
            <Tooltip title={key} placement="topLeft">
                <span className="response-header-text">{key}</span>
            </Tooltip>
        ),
        dataIndex: key,
        key,
        width: getColumnWidth(key, DEFAULT_COL_WIDTH, MSG_COL_WIDTH),
        ellipsis: { showTitle: false },
        sorter: { compare: () => 0 },
        sortOrder: sortInfo.field === key ? sortInfo.order : null,
        showSorterTooltip: { title: '点击排序' },
        className: isNumericColumnKey(key) ? 'response-cell-numeric' : 'response-cell-text-col',
        onHeaderCell: () => ({
            width: getColumnWidth(key, DEFAULT_COL_WIDTH, MSG_COL_WIDTH),
            onResize: (width: number) => handleColumnResize(key, width),
        }),
        render: (value: unknown) => {
            if (isEmptyCellValue(value)) {
                return <span className="cell-placeholder">—</span>;
            }
            const text = formatCellText(value);
            return <ControlCharText className="response-cell-text" text={text} />;
        },
    }));

    if (!showRowIndex) {
        return dataColumns;
    }

    return [
        {
            title: '#',
            key: '__rowIndex',
            width: ROW_INDEX_WIDTH,
            fixed: 'left',
            align: 'center',
            className: 'response-row-index',
            render: (_: unknown, __: GridData, index: number) => (
                <span className="text-[var(--color-text-muted)] text-xs tabular-nums">
                    {getGlobalRowIndex(index)}
                </span>
            ),
        },
        ...dataColumns,
    ];
}

function GridDataTable({
    columns,
    dataSource,
    loading,
    tableScrollX,
    scrollY,
    tableEmptyText,
    onChange,
    onRowDoubleClick,
}: {
    columns: ColumnsType<GridData>;
    dataSource: GridData[];
    loading: boolean;
    tableScrollX?: number;
    scrollY: number;
    tableEmptyText: ReactNode;
    onChange: (
        pagination: TablePaginationConfig,
        filters: Record<string, unknown>,
        sorter: SorterResult<GridData> | SorterResult<GridData>[],
    ) => void;
    onRowDoubleClick: (record: GridData, index?: number) => void;
}) {
    return (
        <Table
            columns={columns}
            dataSource={dataSource}
            size="small"
            tableLayout="fixed"
            virtual
            pagination={false}
            loading={{
                spinning: loading,
                indicator: <ResponseTableSkeleton />,
            }}
            scroll={{ x: tableScrollX, y: scrollY }}
            locale={{ emptyText: tableEmptyText }}
            className="response-table"
            showSorterTooltip
            onChange={onChange}
            onRow={(record, index) => ({
                onDoubleClick: () => onRowDoubleClick(record, index),
            })}
            rowClassName={(_, index) =>
                `response-table-row ${index % 2 === 0 ? 'response-row-even' : 'response-row-odd'}`
            }
            components={{
                header: {
                    cell: ResizableHeaderCell,
                },
            }}
        />
    );
}

function GridPagination({
    page,
    pageSize,
    total,
    dataLength,
    searchKeyword,
    isLargeDataset,
    onPageChange,
}: {
    page: number;
    pageSize: number;
    total: number;
    dataLength: number;
    searchKeyword: string;
    isLargeDataset: boolean;
    onPageChange: (page: number, pageSize: number) => void;
}) {
    return (
        <Pagination
            current={page}
            pageSize={pageSize}
            total={total}
            showSizeChanger
            size="small"
            pageSizeOptions={[10, 20, 50, 100]}
            className="response-pagination"
            itemRender={(_pageNum, type, original) => {
                if (type === 'prev') {
                    return (
                        <button type="button" className="response-pagination-nav">
                            <LeftOutlined />
                        </button>
                    );
                }
                if (type === 'next') {
                    return (
                        <button type="button" className="response-pagination-nav">
                            <RightOutlined />
                        </button>
                    );
                }
                return original;
            }}
            showTotal={(totalCount) => {
                const keyword = searchKeyword.trim();
                const largeHint = isLargeDataset ? ' · 大表模式' : '';
                if (keyword && totalCount !== dataLength) {
                    return `共 ${totalCount} 条（筛选自 ${dataLength} 条）${largeHint}`;
                }
                return `共 ${totalCount} 条${largeHint}`;
            }}
            onChange={onPageChange}
        />
    );
}

function useGridLayout(
    tableAreaRef: RefObject<HTMLDivElement>,
    dataLength: number,
    sortedDataLength: number,
) {
    const [scrollY, setScrollY] = useState(300);
    const [tableAreaWidth, setTableAreaWidth] = useState(0);

    useEffect(() => {
        const tableArea = tableAreaRef.current;
        if (!tableArea) return;

        const updateLayout = () => {
            setTableAreaWidth(tableArea.clientWidth);
            const header = tableArea.querySelector('.ant-table-header');
            const headerHeight = header?.getBoundingClientRect().height ?? TABLE_HEADER_HEIGHT;
            setScrollY(Math.max(100, tableArea.clientHeight - headerHeight - 4));
        };

        updateLayout();
        const observer = new ResizeObserver(updateLayout);
        observer.observe(tableArea);
        return () => observer.disconnect();
    }, [dataLength, sortedDataLength, tableAreaRef]);

    return { scrollY, tableAreaWidth };
}

function useGridTableHandlers({
    isLargeDataset,
    sortedDataLength,
    handleSortChange,
    getGlobalRowIndex,
    setRowDetail,
}: {
    isLargeDataset: boolean;
    sortedDataLength: number;
    handleSortChange: (field?: string, order?: SortOrder) => void;
    getGlobalRowIndex: (index: number) => number;
    setRowDetail: (detail: RowDetailState | null) => void;
}) {
    const handleTableChange = useCallback(
        (
            _pagination: TablePaginationConfig,
            _filters: Record<string, unknown>,
            sorter: SorterResult<GridData> | SorterResult<GridData>[],
        ) => {
            const single = Array.isArray(sorter) ? sorter[0] : sorter;
            const field = single?.field ? String(single.field) : undefined;
            const order = single?.order as SortOrder | undefined;

            if (
                isLargeDataset &&
                order &&
                sortedDataLength >= PERFORMANCE_THRESHOLDS.largeResponseRows
            ) {
                message.info(
                    `当前数据超过 ${PERFORMANCE_THRESHOLDS.largeResponseRows} 行，排序将扫描全部筛选结果，可能略有延迟`,
                    3,
                );
            }

            handleSortChange(field, order);
        },
        [handleSortChange, isLargeDataset, sortedDataLength],
    );

    const handleRowDoubleClick = useCallback(
        (record: GridData, index?: number) => {
            const rest = Object.fromEntries(
                Object.entries(record).filter(([field]) => field !== 'key'),
            );
            setRowDetail({
                rowIndex: getGlobalRowIndex(index ?? 0),
                record: rest,
            });
        },
        [getGlobalRowIndex, setRowDetail],
    );

    return { handleTableChange, handleRowDoubleClick };
}

interface GridProps {
    data?: Record<string, unknown>[];
    searchKeyword?: string;
    showRowIndex?: boolean;
    loading?: boolean;
    footerStart?: ReactNode;
}

export default memo(function Grid({
    data = [],
    searchKeyword = '',
    showRowIndex = true,
    loading = false,
    footerStart,
}: GridProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const tableAreaRef = useRef<HTMLDivElement>(null);
    const [rowDetail, setRowDetail] = useState<RowDetailState | null>(null);

    const {
        page,
        pageSize,
        columnKeys,
        sortInfo,
        sortedData,
        paginatedData,
        isLargeDataset,
        getColumnWidth,
        handleColumnResize,
        handleSortChange,
        handlePageChange,
        getGlobalRowIndex,
    } = useDataTable({
        data,
        searchKeyword,
        resetKey: data,
    });

    useEffect(() => {
        setRowDetail(null);
    }, [data]);

    const { scrollY, tableAreaWidth } = useGridLayout(tableAreaRef, data.length, sortedData.length);

    const contentWidth = useMemo(() => {
        const indexWidth = showRowIndex ? ROW_INDEX_WIDTH : 0;
        return (
            indexWidth +
            columnKeys.reduce(
                (sum, key) => sum + getColumnWidth(key, DEFAULT_COL_WIDTH, MSG_COL_WIDTH),
                0,
            )
        );
    }, [columnKeys, getColumnWidth, showRowIndex]);

    const needsHorizontalScroll = tableAreaWidth > 0 && contentWidth > tableAreaWidth;

    const tableScrollX = contentWidth > 0 ? contentWidth : undefined;

    const columns = useMemo(
        () =>
            buildGridColumns({
                columnKeys,
                showRowIndex,
                getColumnWidth,
                sortInfo,
                handleColumnResize,
                getGlobalRowIndex,
            }),
        [columnKeys, getColumnWidth, getGlobalRowIndex, handleColumnResize, showRowIndex, sortInfo],
    );

    const dataSource: GridData[] = useMemo(
        () =>
            paginatedData.map((item, index) => ({
                key: String((page - 1) * pageSize + index),
                ...item,
            })),
        [paginatedData, page, pageSize],
    );

    const { handleTableChange, handleRowDoubleClick } = useGridTableHandlers({
        isLargeDataset,
        sortedDataLength: sortedData.length,
        handleSortChange,
        getGlobalRowIndex,
        setRowDetail,
    });

    if (data.length === 0 && loading) {
        return (
            <div ref={containerRef} className="response-table-wrapper ui-scroll h-full min-w-0">
                <div className="response-table-area response-table-skeleton-wrap">
                    <ResponseTableSkeleton />
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div ref={containerRef} className="response-table-wrapper ui-scroll h-full min-w-0">
                <div className="response-table-area response-table-empty">{responseEmpty}</div>
            </div>
        );
    }

    const tableEmptyText = searchKeyword.trim() ? searchEmptyState : responseEmpty;

    return (
        <div ref={containerRef} className="response-table-wrapper ui-scroll h-full min-w-0">
            <div
                ref={tableAreaRef}
                className={`response-table-area${needsHorizontalScroll ? ' response-table-area--scroll-x' : ''}`}
            >
                <GridDataTable
                    columns={columns}
                    dataSource={dataSource}
                    loading={loading}
                    tableScrollX={tableScrollX}
                    scrollY={scrollY}
                    tableEmptyText={tableEmptyText}
                    onChange={handleTableChange}
                    onRowDoubleClick={handleRowDoubleClick}
                />
            </div>
            <div className="response-footer">
                {footerStart != null && <div className="response-footer-meta">{footerStart}</div>}
                <div className="response-footer-pagination">
                    <GridPagination
                        page={page}
                        pageSize={pageSize}
                        total={sortedData.length}
                        dataLength={data.length}
                        searchKeyword={searchKeyword}
                        isLargeDataset={isLargeDataset}
                        onPageChange={handlePageChange}
                    />
                </div>
            </div>
            <Suspense fallback={null}>
                <RowDetailModal
                    open={rowDetail != null}
                    rowIndex={rowDetail?.rowIndex}
                    record={rowDetail?.record}
                    onClose={() => setRowDetail(null)}
                />
            </Suspense>
        </div>
    );
});
