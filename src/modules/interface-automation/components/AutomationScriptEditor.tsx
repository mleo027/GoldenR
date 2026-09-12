import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { EditorView } from '@codemirror/view';

export default function AutomationScriptEditor({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    const extensions = useMemo(
        () => [
            javascript(),
            EditorView.lineWrapping,
            EditorView.theme({
                '&': { height: '100%', backgroundColor: 'var(--color-bg-elevated)' },
                '.cm-content': { fontFamily: 'var(--font-family-mono)' },
                '.cm-gutters': {
                    backgroundColor: 'var(--color-bg-container)',
                    color: 'var(--color-text-tertiary)',
                    border: 'none',
                },
            }),
        ],
        [],
    );
    return (
        <CodeMirror
            value={value}
            height="100%"
            extensions={extensions}
            onChange={onChange}
            basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
        />
    );
}
