import { memo } from 'react';
import { Input } from 'antd';
import { PARAM_TEXT_PLACEHOLDER } from '../../utils/workspace/paramText';

interface ParamTextEditProps {
    value: string;
    error?: string | null;
    onChange: (value: string) => void;
}

function ParamTextEdit({ value, error, onChange }: ParamTextEditProps) {
    return (
        <div className="param-text-edit">
            <Input.TextArea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={PARAM_TEXT_PLACEHOLDER}
                spellCheck={false}
                className={`param-text-textarea${error ? ' param-text-textarea-error' : ''}`}
                autoSize={{ minRows: 8, maxRows: 24 }}
            />
            <div className="param-text-hint">
                每行一个参数，格式 <code>key=value</code> 或 <code>key:value</code>；禁用参数以{' '}
                <code>#</code> 开头；也支持 <code>key:value,key:value</code>
            </div>
            {error ? <div className="param-text-error">{error}</div> : null}
        </div>
    );
}

export default memo(ParamTextEdit);
