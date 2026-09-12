import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { useAppEnv } from '@/store/useAppEnv';
import { AUTOMATION_DSL_TYPES } from '../constants/automationDsl';

export default function AutomationScriptEditor({
    value,
    onChange,
    highlightedLine,
}: {
    value: string;
    onChange: (value: string) => void;
    highlightedLine?: number;
}) {
    const { env } = useAppEnv();
    const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor>();
    const onMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monaco.languages.typescript.javascriptDefaults.addExtraLib(
            AUTOMATION_DSL_TYPES,
            'file:///automation-dsl.d.ts',
        );
    };

    useEffect(() => {
        if (!highlightedLine || !editorRef.current) return;
        editorRef.current.revealLineInCenter(highlightedLine);
        editorRef.current.setPosition({ lineNumber: highlightedLine, column: 1 });
        editorRef.current.focus();
    }, [highlightedLine]);

    return (
        <Editor
            theme={env.darkMode ? 'vs-dark' : 'vs'}
            language="javascript"
            value={value}
            onChange={(next) => onChange(next ?? '')}
            onMount={onMount}
            options={{
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                fontSize: 13,
                lineHeight: 22,
                fontLigatures: true,
                renderLineHighlight: 'all',
                folding: true,
                guides: { indentation: true },
                minimap: { enabled: false },
                padding: { top: 12, bottom: 12 },
                scrollBeyondLastLine: false,
                automaticLayout: true,
            }}
        />
    );
}
