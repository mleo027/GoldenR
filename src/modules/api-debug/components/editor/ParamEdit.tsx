import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Table, Button } from 'antd';
import { PlusOutlined, FormOutlined } from '@ant-design/icons';
import type { ParamItem } from '../../types/workspace';
import { createParamItem } from '../../utils/workspace/paramItem';
import ResizableHeaderCell from '../../../../components/ui/ResizableHeaderCell';
import PanelEmptyState from '../../../../components/ui/PanelEmptyState';
import { createParamTableColumns } from './paramTableColumns';

interface ParamEditProps {
    params: ParamItem[];
    onChange: (params: ParamItem[]) => void;
}
const CHECK_COL_WIDTH = 40;
const ACTION_COL_WIDTH = 40;
const FIXED_COL_WIDTH = CHECK_COL_WIDTH + ACTION_COL_WIDTH;
const MIN_KEY_WIDTH = 72;
const KEY_WIDTH_RATIO = 0.3;

function ParamTable({ params, onChange }: ParamEditProps) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const paramsRef = useRef(params);
    paramsRef.current = params;
    const [tableWidth, setTableWidth] = useState(0);
    const [keyWidth, setKeyWidth] = useState<number | null>(null);
    const rows = useMemo(
        () => params.map((param, index) => ({ ...param, key: String(index) })),
        [params],
    );

    useEffect(() => {
        const element = wrapRef.current;
        if (!element) return;
        const updateWidth = () => {
            const width = element.clientWidth;
            setTableWidth(width);
            if (width > FIXED_COL_WIDTH) {
                const next = Math.floor((width - FIXED_COL_WIDTH) * KEY_WIDTH_RATIO);
                setKeyWidth((previous) =>
                    previous == null ? next : Math.min(previous, width - FIXED_COL_WIDTH - 1),
                );
            }
        };
        updateWidth();
        const observer = new ResizeObserver(updateWidth);
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const availableWidth = Math.max(0, tableWidth - FIXED_COL_WIDTH);
    const resolvedKeyWidth = Math.min(
        keyWidth ?? Math.floor(availableWidth * KEY_WIDTH_RATIO),
        availableWidth,
    );
    const valueWidth = Math.max(0, availableWidth - resolvedKeyWidth);
    const handleChange = useCallback(
        (index: number, field: keyof ParamItem, value: string) => {
            onChange(
                paramsRef.current.map((param, itemIndex) =>
                    itemIndex === index ? { ...param, [field]: value } : param,
                ),
            );
        },
        [onChange],
    );
    const handleRemove = useCallback(
        (index: number) => {
            onChange(paramsRef.current.filter((_, itemIndex) => itemIndex !== index));
        },
        [onChange],
    );
    const handleKeyResize = useCallback(
        (width: number) => {
            const max = Math.max(MIN_KEY_WIDTH, availableWidth - 1);
            setKeyWidth(Math.max(MIN_KEY_WIDTH, Math.min(width, max)));
        },
        [availableWidth],
    );

    const columns = useMemo(
        () =>
            createParamTableColumns({
                params: rows,
                keyWidth: resolvedKeyWidth,
                valueWidth,
                minKeyWidth: MIN_KEY_WIDTH,
                onChange: handleChange,
                onResize: handleKeyResize,
                onRemove: handleRemove,
            }),
        [handleChange, handleKeyResize, handleRemove, resolvedKeyWidth, rows, valueWidth],
    );

    return (
        <div ref={wrapRef} className="param-table-wrap">
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
                components={{ header: { cell: ResizableHeaderCell } }}
            />
        </div>
    );
}

function ParamEmptyState({ onAdd }: { onAdd: () => void }) {
    return (
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
                        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={onAdd}>
                            添加参数
                        </Button>
                    }
                />
            </div>
        </div>
    );
}

function ParamEdit({ params, onChange }: ParamEditProps) {
    const paramsRef = useRef(params);
    paramsRef.current = params;
    const handleAdd = useCallback(
        () => onChange([...paramsRef.current, createParamItem('')]),
        [onChange],
    );
    return (
        <div className="param-edit flex flex-col py-2">
            {params.length > 0 ? (
                <>
                    <ParamTable params={params} onChange={onChange} />
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
                <ParamEmptyState onAdd={handleAdd} />
            )}
        </div>
    );
}

export default memo(ParamEdit);
