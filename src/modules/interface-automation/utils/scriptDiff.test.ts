import { describe, expect, it } from 'vitest';
import { diffScriptLines, summarizeDiff } from './scriptDiff';

describe('scriptDiff', () => {
    it('标记被替换的行为一删一增', () => {
        const lines = diffScriptLines('a\nb\nc', 'a\nx\nc');
        expect(lines.filter((line) => line.kind === 'removed').map((line) => line.text)).toEqual([
            'b',
        ]);
        expect(lines.filter((line) => line.kind === 'added').map((line) => line.text)).toEqual([
            'x',
        ]);
        expect(lines.filter((line) => line.kind === 'context').map((line) => line.text)).toEqual([
            'a',
            'c',
        ]);
    });

    it('内容相同时全部为上下文行', () => {
        const lines = diffScriptLines('a\nb', 'a\nb');
        expect(lines.every((line) => line.kind === 'context')).toBe(true);
        expect(summarizeDiff(lines)).toEqual({ added: 0, removed: 0 });
    });

    it('从空内容新建时全部为新增', () => {
        const lines = diffScriptLines('', 'a\nb');
        expect(summarizeDiff(lines)).toEqual({ added: 2, removed: 0 });
    });

    it('末尾新增行也会被标记', () => {
        const lines = diffScriptLines('a', 'a\nb\nc');
        expect(summarizeDiff(lines)).toEqual({ added: 2, removed: 0 });
    });

    it('CRLF 与 LF 视为同一内容', () => {
        const lines = diffScriptLines('a\r\nb', 'a\nb');
        expect(summarizeDiff(lines)).toEqual({ added: 0, removed: 0 });
    });
});
