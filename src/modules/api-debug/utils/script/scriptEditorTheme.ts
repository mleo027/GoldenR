import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

const lightEditorTheme = EditorView.theme(
    {
        '&': {
            color: '#24292f',
            backgroundColor: '#fafafa',
        },
        '.cm-content': {
            caretColor: 'var(--color-primary)',
        },
        '.cm-cursor, .cm-dropCursor': {
            borderLeftColor: 'var(--color-primary)',
        },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
            backgroundColor: 'var(--color-primary-muted) !important',
        },
        '.cm-gutters': {
            backgroundColor: '#fafafa',
            color: '#d1d5db',
            border: 'none',
        },
        '.cm-lineNumbers .cm-gutterElement': {
            color: '#d1d5db',
            minWidth: '36px',
            padding: '0 10px 0 6px',
            fontSize: '11px',
        },
        '.cm-activeLineGutter': {
            backgroundColor: 'transparent',
            color: '#9ca3af',
            fontWeight: '500',
        },
        '.cm-activeLine': {
            backgroundColor: 'rgba(243, 244, 246, 0.65)',
        },
        '.cm-foldPlaceholder': {
            backgroundColor: 'transparent',
            border: 'none',
            color: '#9ca3af',
        },
    },
    { dark: false },
);

const darkEditorTheme = EditorView.theme(
    {
        '&': {
            color: '#e6e6ef',
            backgroundColor: '#111111',
        },
        '.cm-content': {
            caretColor: 'var(--color-primary)',
        },
        '.cm-cursor, .cm-dropCursor': {
            borderLeftColor: 'var(--color-primary)',
        },
        '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
            backgroundColor: 'var(--color-primary-muted) !important',
        },
        '.cm-gutters': {
            backgroundColor: '#111111',
            color: '#404040',
            border: 'none',
        },
        '.cm-lineNumbers .cm-gutterElement': {
            color: '#404040',
            minWidth: '36px',
            padding: '0 10px 0 6px',
            fontSize: '11px',
        },
        '.cm-activeLineGutter': {
            backgroundColor: 'transparent',
            color: '#6b6b7a',
            fontWeight: '500',
        },
        '.cm-activeLine': {
            backgroundColor: 'rgba(26, 26, 26, 0.85)',
        },
        '.cm-foldPlaceholder': {
            backgroundColor: 'transparent',
            border: 'none',
            color: '#6b6b7a',
        },
    },
    { dark: true },
);

const lightHighlight = HighlightStyle.define([
    { tag: t.keyword, color: '#cf222e' },
    { tag: [t.name, t.deleted, t.character, t.macroName], color: '#24292f' },
    { tag: [t.propertyName], color: '#0550ae' },
    { tag: [t.function(t.variableName), t.labelName], color: 'var(--color-primary)' },
    { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#0550ae' },
    { tag: [t.definition(t.name), t.separator], color: '#24292f' },
    {
        tag: [
            t.typeName,
            t.className,
            t.number,
            t.changed,
            t.annotation,
            t.modifier,
            t.self,
            t.namespace,
        ],
        color: '#953800',
    },
    { tag: [t.operator, t.operatorKeyword], color: '#cf222e' },
    { tag: [t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#0a3069' },
    { tag: [t.meta, t.comment], color: '#6e7781', fontStyle: 'italic' },
    { tag: t.strong, fontWeight: 'bold' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strikethrough, textDecoration: 'line-through' },
    { tag: t.link, color: '#0550ae', textDecoration: 'underline' },
    { tag: t.heading, fontWeight: 'bold', color: '#cf222e' },
    { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#0550ae' },
    { tag: [t.processingInstruction, t.string, t.inserted], color: '#0a3069' },
    { tag: t.invalid, color: '#ffffff', backgroundColor: '#cf222e' },
]);

const darkHighlight = HighlightStyle.define([
    { tag: t.keyword, color: '#ff7b72' },
    { tag: [t.name, t.deleted, t.character, t.macroName], color: '#e6e6ef' },
    { tag: [t.propertyName], color: '#79c0ff' },
    { tag: [t.function(t.variableName), t.labelName], color: 'var(--color-primary)' },
    { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#79c0ff' },
    { tag: [t.definition(t.name), t.separator], color: '#e6e6ef' },
    {
        tag: [
            t.typeName,
            t.className,
            t.number,
            t.changed,
            t.annotation,
            t.modifier,
            t.self,
            t.namespace,
        ],
        color: '#ffa657',
    },
    { tag: [t.operator, t.operatorKeyword], color: '#ff7b72' },
    { tag: [t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: '#a5d6ff' },
    { tag: [t.meta, t.comment], color: '#8b949e', fontStyle: 'italic' },
    { tag: t.strong, fontWeight: 'bold' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strikethrough, textDecoration: 'line-through' },
    { tag: t.link, color: '#79c0ff', textDecoration: 'underline' },
    { tag: t.heading, fontWeight: 'bold', color: '#ff7b72' },
    { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#79c0ff' },
    { tag: [t.processingInstruction, t.string, t.inserted], color: '#a5d6ff' },
    { tag: t.invalid, color: '#ffffff', backgroundColor: '#f85149' },
]);

export function createScriptEditorTheme(darkMode: boolean) {
    if (darkMode) {
        return [darkEditorTheme, syntaxHighlighting(darkHighlight)];
    }
    return [lightEditorTheme, syntaxHighlighting(lightHighlight)];
}
