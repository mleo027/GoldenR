import { Tag } from 'antd';
import { parseRuleFields } from '../../utils/suggest/paramSuggestResolve';
import { Input } from '../../../../components/ui/primitives';

interface ParamSuggestFieldTagsProps {
    value?: string;
    editable: boolean;
    onChange?: (value: string) => void;
}

export default function ParamSuggestFieldTags({
    value = '',
    editable,
    onChange,
}: ParamSuggestFieldTagsProps) {
    if (editable) {
        return (
            <Input
                value={value}
                placeholder="operid 或 operid, auditoperid"
                onChange={(event) => onChange?.(event.target.value)}
            />
        );
    }

    const fields = parseRuleFields(value);
    return (
        <>
            <input
                type="hidden"
                value={value}
                onChange={(event) => onChange?.(event.target.value)}
            />
            {fields.length === 0 ? (
                <Tag>未指定</Tag>
            ) : (
                <div className="param-suggest-field-tags flex flex-wrap gap-1">
                    {fields.map((field) => (
                        <Tag key={field} className="param-suggest-field-tag">
                            {field}
                        </Tag>
                    ))}
                </div>
            )}
        </>
    );
}
