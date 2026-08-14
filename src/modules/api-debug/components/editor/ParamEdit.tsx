import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { Table, Button, Checkbox, Input } from 'antd';
import { PlusOutlined, DeleteOutlined, FormOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ParamItem } from '../../types/workspace';
import { isParamEnabled, createParamItem } from '../../utils/workspace/paramItem';
import ResizableHeaderCell from '../../../../components/ui/ResizableHeaderCell';
import PanelEmptyState from '../../../../components/ui/PanelEmptyState';
import ParamSuggestInput from './ParamSuggestInput';
import ParamFileHint from './ParamFileHint';

interface ParamEditProps {
    params: ParamItem[];
    onChange: (params: ParamItem[]) => void;
}

interface ParamRow extends ParamItem {
    key: string;
}

const CHECK_COL_WIDTH = 40;
const ACTION_COL_WIDTH = 40;
const FIXED_COL_WIDTH = CHECK_COL_WIDTH + ACTION_COL_WIDTH;
const MIN_KEY_WIDTH = 72;
const KEY_WIDTH_RATIO = 0.3;

function ParamEdit({ params, onChange }: ParamEditProps) {
    const tableWrapRef = useRef<HTMLDivElement>(null);
    const paramsRef = useRef(params);
    paramsRef.current = params;
    const [tableWidth, setTableWidth] = useState(0);
    const [keyWidth, setKeyWidth] = useState<number | null>(null);

    const rows: ParamRow[] = useMemo(
        () =>
            params.map((p, i) => ({
                ...p,
                key: String(i),
            })),
        [params],
    );

    useEffect(() => {
        const el = tableWrapRef.current;
        if (!el) return;

        const updateWidth = () => {
            const width = el.clientWidth;
            setTableWidth(width);

            if (width > FIXED_COL_WIDTH) {
                const nextKeyWidth = Math.floor((width - FIXED_COL_WIDTH) * KEY_WIDTH_RATIO);
                setKeyWidth((prev) =>
                    prev == null ? nextKeyWidth : Math.min(prev, width - FIXED_COL_WIDTH - 1),
                );
            }
        };

        updateWidth();
        const observer = new ResizeObserver(updateWidth);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const availableWidth = Math.max(0, tableWidth - FIXED_COL_WIDTH);
    const resolvedKeyWidth = Math.min(
        keyWidth ?? Math.floor(availableWidth * KEY_WIDTH_RATIO),
        availableWidth,
    );
    const valueWidth = Math.max(0, availableWidth - resolvedKeyWidth);

    const handleKeyResize = useCallback(
        (width: number) => {
            const maxKeyWidth = Math.max(MIN_KEY_WIDTH, availableWidth - 1);
            setKeyWidth(Math.max(MIN_KEY_WIDTH, Math.min(width, maxKeyWidth)));
        },
        [availableWidth],
    );

    const handleAdd = useCallback(() => {
        onChange([...paramsRef.current, createParamItem('')]);
    }, [onChange]);

    const handleRemove = useCallback(
        (index: number) => {
            onChange(paramsRef.current.filter((_, i) => i !== index));
        },
        [onChange],
    );

    const handleChange = useCallback(
        (index: number, field: keyof ParamItem, value: string) => {
            onChange(paramsRef.current.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
        },
        [onChange],
    );

    const columns: ColumnsType<ParamRow> = useMemo(
        () => [
            {
                title: '',
                width: CHECK_COL_WIDTH,
                render: (_: unknown, record: ParamRow) => {
                    const rowIndex = Number(record.key);
                    return (
                        <Checkbox
                            checked={isParamEnabled(record.type)}
                            onChange={(e) =>
                                handleChange(
                                    rowIndex,
                                    'type',
                                    e.target.checked ? 'string' : 'disabled',
                                )
                            }
                            onClick={(e) => e.stopPropagation()}
                            className="param-checkbox"
                        />
                    );
                },
            },
            {
                title: 'Key',
                dataIndex: 'name',
                width: resolvedKeyWidth,
                onHeaderCell: () => ({
                    width: resolvedKeyWidth,
                    minWidth: MIN_KEY_WIDTH,
                    onResize: handleKeyResize,
                }),
                render: (text: string, _: ParamRow, index: number) => (
                    <Input
                        value={text}
                        placeholder="参数名"
                        variant="borderless"
                        size="small"
                        className="param-input param-key-input"
                        onChange={(e) => handleChange(index, 'name', e.target.value)}
                    />
                ),
            },
            {
                title: 'Value',
                dataIndex: 'value',
                width: valueWidth,
                render: (text: string, record: ParamRow, index: number) => (
                    <div className="param-value-cell">
                        <div className="param-value-input">
                            <ParamSuggestInput
                                fieldName={record.name}
                                value={text}
                                params={paramsRef.current}
                                disabled={record.type === 'disabled'}
                                placeholder=""
                                onChange={(next) => handleChange(index, 'value', next)}
                            />
                        </div>
                        <ParamFileHint value={text} disabled={record.type === 'disabled'} />
                    </div>
                ),
            },
            {
                title: '',
                key: 'action',
                width: ACTION_COL_WIDTH,
                render: (_: unknown, record: ParamRow) => (
                    <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemove(parseInt(record.key))}
                        className="param-delete-btn"
                    />
                ),
            },
        ],
        [handleChange, handleKeyResize, handleRemove, resolvedKeyWidth, valueWidth],
    );

    return (
        <div className="param-edit flex flex-col py-2">
            {rows.length > 0 ? (
                <>
                    <div ref={tableWrapRef} className="param-table-wrap">
                        <Table
                            columns={columns}
                            dataSource={rows}
                            size="small"
                            pagination={false}
                            tableLayout="fixed"
                            className="param-table"
                            rowClassName={(_, index) =>
                                `param-row group ${index % 2 === 0 ? 'param-row-even' : 'param-row-odd'}`
                            }
                            components={{
                                header: {
                                    cell: ResizableHeaderCell,
                                },
                            }}
                        />
                    </div>
                    <Button
                        type="dashed"
                        block
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={handleAdd}
                        className="param-add-dashed-btn mt-2 mx-2.5"
                    >
                        添加参数
                    </Button>
                </>
            ) : (
                <div className="param-empty-panel flex-1 min-h-[160px]">
                    <div className="param-empty-header">
                        <span className="param-empty-header-check" />
                        <span>Key</span>
                        <span>Value</span>
                    </div>
                    <div className="param-empty-body">
                        <PanelEmptyState
                            icon={<FormOutlined />}
                            title="尚未配置入参"
                            description="添加 KCBP 请求字段；二进制文件请填写 @file: 绝对路径"
                            action={
                                <Button
                                    type="primary"
                                    size="small"
                                    icon={<PlusOutlined />}
                                    onClick={handleAdd}
                                >
                                    添加参数
                                </Button>
                            }
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default memo(ParamEdit);
