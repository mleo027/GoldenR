import { useState } from 'react';
import { Button, Table, Typography } from 'antd';
import type { DbSuggestOption } from '../../types/paramSuggest';

const PREVIEW_LIMIT = 50;

interface ParamSuggestOptionsPreviewProps {
    options: DbSuggestOption[];
    defaultExpanded?: boolean;
}

export default function ParamSuggestOptionsPreview({
    options,
    defaultExpanded = true,
}: ParamSuggestOptionsPreviewProps) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    if (options.length === 0) return null;

    const previewRows = options.slice(0, PREVIEW_LIMIT);

    return (
        <div className="param-suggest-options-preview">
            <div className="flex items-center justify-between gap-2 mb-1">
                <Typography.Text strong className="text-xs">
                    返回结果（{options.length} 条）
                </Typography.Text>
                <Button
                    type="link"
                    size="small"
                    className="px-0 h-auto"
                    onClick={() => setExpanded((value) => !value)}
                >
                    {expanded ? '收起' : '展开'}
                </Button>
            </div>
            {expanded ? (
                <>
                    <Table
                        size="small"
                        pagination={false}
                        className="param-suggest-options-table"
                        dataSource={previewRows.map((item, index) => ({
                            key: `${item.value}-${index}`,
                            value: item.value,
                            label: item.label,
                        }))}
                        columns={[
                            { title: 'value', dataIndex: 'value', ellipsis: true },
                            { title: 'label', dataIndex: 'label', ellipsis: true },
                        ]}
                        scroll={{ y: 200 }}
                    />
                    {options.length > PREVIEW_LIMIT ? (
                        <Typography.Text type="secondary" className="text-xs mt-1 block">
                            仅展示前 {PREVIEW_LIMIT} 条，共 {options.length} 条
                        </Typography.Text>
                    ) : null}
                </>
            ) : null}
        </div>
    );
}
