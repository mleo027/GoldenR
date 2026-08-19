import { Button, Checkbox, Input } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ParamItem } from '../../types/workspace';
import { isParamEnabled } from '../../utils/workspace/paramItem';
import ParamFileHint from './ParamFileHint';
import ParamSuggestInput from './ParamSuggestInput';

export interface ParamTableRow extends ParamItem {
    key: string;
}

export function createParamTableColumns({
    params,
    keyWidth,
    valueWidth,
    minKeyWidth,
    onChange,
    onResize,
    onRemove,
}: {
    params: ParamTableRow[];
    keyWidth: number;
    valueWidth: number;
    minKeyWidth: number;
    onChange: (index: number, field: keyof ParamItem, value: string) => void;
    onResize: (width: number) => void;
    onRemove: (index: number) => void;
}): ColumnsType<ParamTableRow> {
    return [
        {
            title: '',
            width: 40,
            render: (_value: unknown, record: ParamTableRow) => {
                const index = Number(record.key);
                return (
                    <Checkbox
                        checked={isParamEnabled(record.type)}
                        className="param-checkbox"
                        onChange={(event) =>
                            onChange(index, 'type', event.target.checked ? 'string' : 'disabled')
                        }
                        onClick={(event) => event.stopPropagation()}
                    />
                );
            },
        },
        {
            title: 'Key',
            dataIndex: 'name',
            width: keyWidth,
            onHeaderCell: () => ({ width: keyWidth, minWidth: minKeyWidth, onResize }),
            render: (text: string, _record: ParamTableRow, index: number) => (
                <Input
                    value={text}
                    variant="borderless"
                    size="small"
                    className="param-input param-key-input"
                    onChange={(event) => onChange(index, 'name', event.target.value)}
                />
            ),
        },
        {
            title: 'Value',
            dataIndex: 'value',
            width: valueWidth,
            render: (text: string, record: ParamTableRow, index: number) => (
                <div className="param-value-cell">
                    <div className="param-value-input">
                        <ParamSuggestInput
                            fieldName={record.name}
                            value={text}
                            params={params}
                            disabled={record.type === 'disabled'}
                            placeholder=""
                            onChange={(value) => onChange(index, 'value', value)}
                        />
                    </div>
                    <div>
                        <ParamFileHint value={text} disabled={record.type === 'disabled'} />
                    </div>
                </div>
            ),
        },
        {
            title: '',
            key: 'action',
            width: 40,
            render: (_value: unknown, record: ParamTableRow) => (
                <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => onRemove(Number(record.key))}
                    className="param-delete-btn"
                />
            ),
        },
    ];
}
