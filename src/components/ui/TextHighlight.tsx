import { memo, useMemo } from 'react';
import { splitTextHighlight } from '../../shared/utils/textHighlight';

interface TextHighlightProps {
    text: string;
    queryTerm: string;
    className?: string;
}

function TextHighlight({ text, queryTerm, className }: TextHighlightProps) {
    const parts = useMemo(() => splitTextHighlight(text, queryTerm), [queryTerm, text]);

    if (!queryTerm.trim()) {
        return <span className={className}>{text}</span>;
    }

    return (
        <span className={className}>
            {parts.map((part, index) =>
                part.highlight ? (
                    <mark key={index} className="ui-search-mark">
                        {part.text}
                    </mark>
                ) : (
                    <span key={index}>{part.text}</span>
                ),
            )}
        </span>
    );
}

export default memo(TextHighlight);
