import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { EditorView } from '@codemirror/view';
import { Button } from 'antd';
import { FormatPainterOutlined } from '@ant-design/icons';
import { formatSqlPreview } from '../../utils/suggest/paramSuggestSql';
import { useAppEnv } from '../../../../store/useAppEnv';

interface ParamSuggestSqlEditorProps {
    value?: string;
    onChange?: (value: string) => void;
}

export default function ParamSuggestSqlEditor({
    value = '',
    onChange,
}: ParamSuggestSqlEditorProps) {
    const { env } = useAppEnv();
    const extensions = useMemo(() => [sql(), EditorView.lineWrapping], []);

    const handleFormat = () => {
        const formatted = formatSqlPreview(value);
        if (formatted) onChange?.(formatted);
    };

    return (
        <div className="param-suggest-sql-editor">
            <div className="param-suggest-sql-editor-toolbar">
                <Button
                    type="text"
                    size="small"
                    icon={<FormatPainterOutlined />}
                    onClick={handleFormat}
                >
                    格式化
                </Button>
            </div>
            <CodeMirror
                value={value}
                height="160px"
                theme={env.darkMode ? 'dark' : 'light'}
                extensions={extensions}
                className="param-suggest-sql-codemirror"
                onChange={(nextValue) => onChange?.(nextValue)}
                basicSetup={{
                    lineNumbers: true,
                    foldGutter: false,
                    highlightActiveLine: true,
                }}
            />
        </div>
    );
}
