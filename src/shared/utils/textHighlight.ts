export interface TextHighlightPart {
    text: string;
    highlight: boolean;
}

export function splitTextHighlight(text: string, queryTerm: string): TextHighlightPart[] {
    const term = queryTerm.trim();
    if (!term || !text) {
        return [{ text, highlight: false }];
    }

    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    const parts: TextHighlightPart[] = [];
    let start = 0;

    while (start < text.length) {
        const index = lowerText.indexOf(lowerTerm, start);
        if (index < 0) {
            parts.push({ text: text.slice(start), highlight: false });
            break;
        }
        if (index > start) {
            parts.push({ text: text.slice(start, index), highlight: false });
        }
        parts.push({ text: text.slice(index, index + term.length), highlight: true });
        start = index + term.length;
    }

    return parts.length > 0 ? parts : [{ text, highlight: false }];
}
