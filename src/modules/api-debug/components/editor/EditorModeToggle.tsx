import type { ReactNode } from 'react';
import { CodeOutlined, TableOutlined } from '@ant-design/icons';
import { useEditorModeActions } from '../../hooks/useEditorModeActions';
import type { EditorMode } from '../../types/workspace';

interface EditorModeToggleProps {
    /** 仅显示图标，隐藏文字 */
    compact?: boolean;
}

export default function EditorModeToggle({ compact = false }: EditorModeToggleProps) {
    const { editorMode, switchEditorMode } = useEditorModeActions();

    const segmentClass = compact ? ' editor-mode-segment--icon-only' : '';

    const segments: { mode: EditorMode; icon: ReactNode; label: string; title: string }[] = [
        { mode: 'ui', icon: <TableOutlined />, label: '表单', title: '表单' },
        { mode: 'script', icon: <CodeOutlined />, label: '代码', title: '代码' },
    ];

    return (
        <div
            className={`editor-mode-segmented${compact ? ' editor-mode-segmented--compact' : ''}`}
            role="group"
            aria-label="编辑器模式"
        >
            {segments.map(({ mode, icon, label, title }) => (
                <button
                    key={mode}
                    type="button"
                    className={`editor-mode-segment${segmentClass}${
                        editorMode === mode ? ' editor-mode-segment-active' : ''
                    }`}
                    aria-pressed={editorMode === mode}
                    title={title}
                    onClick={() => switchEditorMode(mode)}
                >
                    {icon}
                    <span>{label}</span>
                </button>
            ))}
        </div>
    );
}
