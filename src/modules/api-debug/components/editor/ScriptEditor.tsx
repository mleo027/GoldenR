import { useMemo, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { EditorView, keymap } from '@codemirror/view';
import { useAppEnv } from '../../../../store/useAppEnv';
import { createScriptEditorTheme } from '../../utils/script/scriptEditorTheme';

interface ScriptEditorProps {
    value?: string;
    onChange?: (value: string) => void;
    readOnly?: boolean;
    placeholder?: string;
    minHeight?: string;
    className?: string;
    onFormat?: () => void;
}

export default function ScriptEditor({
    value = '',
    onChange,
    readOnly = false,
    placeholder,
    minHeight = '160px',
    className = '',
    onFormat,
}: ScriptEditorProps) {
    const { env } = useAppEnv();
    const handleFormat = useCallback(() => {
        onFormat?.();
    }, [onFormat]);

    const extensions = useMemo(
        () => [
            javascript(),
            EditorView.lineWrapping,
            ...createScriptEditorTheme(env.darkMode),
            ...(readOnly ? [EditorView.editable.of(false)] : []),
            ...(onFormat && !readOnly
                ? [
                      keymap.of([
                          {
                              key: 'Mod-Shift-f',
                              preventDefault: true,
                              run: () => {
                                  handleFormat();
                                  return true;
                              },
                          },
                      ]),
                  ]
                : []),
        ],
        [handleFormat, onFormat, readOnly, env.darkMode],
    );

    const height = minHeight === '100%' ? undefined : minHeight;

    return (
        <div
            className={`api-script-editor ${className}`.trim()}
            style={minHeight === '100%' ? { height: '100%', minHeight: '240px' } : undefined}
        >
            <CodeMirror
                value={value}
                height={height}
                extensions={extensions}
                className="api-script-codemirror"
                placeholder={placeholder}
                onChange={(nextValue) => onChange?.(nextValue)}
                basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    highlightActiveLine: !readOnly,
                }}
            />
        </div>
    );
}
