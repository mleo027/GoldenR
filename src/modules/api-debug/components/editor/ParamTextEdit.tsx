import { memo, type ClipboardEvent } from 'react';
import {} from 'antd';
import { PARAM_TEXT_PLACEHOLDER } from '../../utils/workspace/paramText';
import { decodeSohMarkers, formatControlCharsForTitle } from '../../../../utils/controlCharDisplay';
import { TextArea } from '../../../../components/ui/primitives';

interface ParamTextEditProps {
    value: string;
    error?: string | null;
    onChange: (value: string) => void;
}

function ParamTextEdit({ value, error, onChange }: ParamTextEditProps) {
    const handleCopy = (event: ClipboardEvent<HTMLTextAreaElement>) => {
        const target = event.currentTarget;
        const selected = target.value.slice(target.selectionStart ?? 0, target.selectionEnd ?? 0);
        const raw = decodeSohMarkers(selected);
        if (raw === selected) return;

        if (navigator.clipboard) {
            event.preventDefault();
            void navigator.clipboard.writeText(raw).catch(() => undefined);
        }
    };

    return (
        <div className="param-text-edit">
            <TextArea
                value={formatControlCharsForTitle(value)}
                onChange={(e) => onChange(decodeSohMarkers(e.target.value))}
                placeholder={PARAM_TEXT_PLACEHOLDER}
                spellCheck={false}
                className={`param-text-textarea${error ? ' param-text-textarea-error' : ''}`}
                autoSize={{ minRows: 8, maxRows: 24 }}
                onCopy={handleCopy}
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
