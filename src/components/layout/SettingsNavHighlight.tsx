import { splitTextHighlight } from '@/shared/utils/textHighlight';

interface SettingsNavHighlightProps {
    text: string;
    query: string;
}

export default function SettingsNavHighlight({ text, query }: SettingsNavHighlightProps) {
    const parts = splitTextHighlight(text, query);
    return (
        <>
            {parts.map((part, index) =>
                part.highlight ? (
                    <mark key={index} className="settings-nav-highlight">
                        {part.text}
                    </mark>
                ) : (
                    <span key={index}>{part.text}</span>
                ),
            )}
        </>
    );
}
