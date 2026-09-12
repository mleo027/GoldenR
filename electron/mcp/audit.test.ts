import { describe, expect, it, vi } from 'vitest';
import type { McpAuditEntry } from '../../src/shared/mcp/types';
import { MAX_AUDIT_ENTRIES, McpAuditLog, namespaceOf, summarizeArgs } from './audit';

const entry = (at: number): McpAuditEntry => ({
    at,
    namespace: 'automation',
    tool: 'automation_list_scenarios',
    argsSummary: '(无参数)',
    ok: true,
    durationMs: 1,
});

describe('summarizeArgs', () => {
    it('只输出参数名，按字典序，绝不带取值', () => {
        const summary = summarizeArgs({ script: 'SELECT 1', name: '场景' });
        expect(summary).toBe('name, script');
        expect(summary).not.toContain('SELECT 1');
    });

    it('无参数时给出可读占位', () => {
        expect(summarizeArgs({})).toBe('(无参数)');
        expect(summarizeArgs(undefined)).toBe('(无参数)');
    });
});

describe('namespaceOf', () => {
    it('取工具名的命名空间前缀', () => {
        expect(namespaceOf('automation_run_scenario')).toBe('automation');
        expect(namespaceOf('apidebug_call_case')).toBe('apidebug');
    });

    it('没有分隔符时原样返回，不抛错', () => {
        expect(namespaceOf('noseparator')).toBe('noseparator');
        expect(namespaceOf('_leading')).toBe('_leading');
    });
});

describe('McpAuditLog', () => {
    it('最新的在前，且每次记录都持久化', () => {
        const persist = vi.fn();
        const log = new McpAuditLog(persist);

        log.record(entry(1));
        log.record(entry(2));

        expect(log.list().map((item) => item.at)).toEqual([2, 1]);
        expect(persist).toHaveBeenCalledTimes(2);
        expect(persist).toHaveBeenLastCalledWith([entry(2), entry(1)]);
    });

    it('超出上限时丢弃最旧的', () => {
        const log = new McpAuditLog(() => undefined);
        for (let index = 0; index < MAX_AUDIT_ENTRIES + 5; index += 1) log.record(entry(index));

        expect(log.size).toBe(MAX_AUDIT_ENTRIES);
        expect(log.list()[0].at).toBe(MAX_AUDIT_ENTRIES + 4);
        expect(log.list().at(-1)?.at).toBe(5);
    });

    it('hydrate 读回历史，并同样受上限约束', () => {
        const log = new McpAuditLog(() => undefined);
        log.hydrate([entry(1), entry(2)]);

        expect(log.list().map((item) => item.at)).toEqual([1, 2]);
    });

    it('list 返回副本，外部改动不影响内部状态', () => {
        const log = new McpAuditLog(() => undefined);
        log.record(entry(1));

        log.list().push(entry(99));

        expect(log.size).toBe(1);
    });
});
