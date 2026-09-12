import type * as Monaco from 'monaco-editor';

/**
 * 接口自动化脚本编辑器（Monaco）主题。
 *
 * 与 api-debug 的 CodeMirror 主题同属「编辑器主题」：颜色必须是固定字面量，
 * 无法走 CSS 变量，因此集中在本文件维护，文件名沿用仓库既有约定。
 */

export const AUTOMATION_EDITOR_THEME_LIGHT = 'golden-automation-light';
export const AUTOMATION_EDITOR_THEME_DARK = 'golden-automation-dark';

/** 只依赖 defineTheme，避免与 @monaco-editor/react 的类型强耦合。 */
type ThemeHost = {
    editor: {
        defineTheme(name: string, theme: Monaco.editor.IStandaloneThemeData): void;
    };
};

/** [Monaco token 类型, 前景色, 字体风格] */
type TokenRule = [name: string, foreground: string, fontStyle?: string];

const toMonacoRules = (rules: TokenRule[]): Monaco.editor.ITokenThemeRule[] =>
    rules.map(([name, foreground, fontStyle]) =>
        fontStyle ? { token: name, foreground, fontStyle } : { token: name, foreground },
    );

// method 覆盖测试 DSL 的核心方法：t.step / t.expect / t.api.call
const LIGHT_RULES: TokenRule[] = [
    ['comment', '94a3b8', 'italic'],
    ['string', '059669'],
    ['number', '2563eb'],
    ['keyword', '8b5cf6'],
    ['type', '2563eb'],
    ['class', '2563eb'],
    ['interface', '2563eb'],
    ['namespace', '2563eb'],
    ['enum', '2563eb'],
    ['method', '8b5cf6'],
    ['function', '8b5cf6'],
];

const DARK_RULES: TokenRule[] = [
    ['comment', '6b7280', 'italic'],
    ['string', '3fb950'],
    ['number', '79c0ff'],
    ['keyword', 'c084fc'],
    ['type', '79c0ff'],
    ['class', '79c0ff'],
    ['interface', '79c0ff'],
    ['namespace', '79c0ff'],
    ['enum', '79c0ff'],
    ['method', 'c084fc'],
    ['function', 'c084fc'],
];

export function defineAutomationEditorThemes(monaco: ThemeHost): void {
    monaco.editor.defineTheme(AUTOMATION_EDITOR_THEME_LIGHT, {
        base: 'vs',
        inherit: true,
        rules: toMonacoRules(LIGHT_RULES),
        colors: {
            // 行号压暗，与代码正文拉开层级
            'editorLineNumber.foreground': '#9ca3af',
            'editorLineNumber.activeForeground': '#6b7280',
        },
    });
    monaco.editor.defineTheme(AUTOMATION_EDITOR_THEME_DARK, {
        base: 'vs-dark',
        inherit: true,
        rules: toMonacoRules(DARK_RULES),
        colors: {
            'editorLineNumber.foreground': '#4b5563',
            'editorLineNumber.activeForeground': '#9ca3af',
        },
    });
}
