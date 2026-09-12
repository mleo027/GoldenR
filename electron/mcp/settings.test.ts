import { describe, expect, it, vi } from 'vitest';
import type { ElectronAppContext } from '../app/context';
import { MAX_AUDIT_ENTRIES } from './audit';
import {
    DEFAULT_MCP_SETTINGS,
    readMcpAudit,
    readMcpSettings,
    writeMcpAudit,
    writeMcpSettings,
} from './settings';

function makeCtx(seed: Record<string, unknown> = {}) {
    const onDisk = new Map<string, unknown>(Object.entries(seed));
    const ctx = {
        configRepository: {
            readMcpSettings: () => onDisk.get('mcpSettings') ?? null,
            writeMcpSettings: vi.fn((value: unknown) => void onDisk.set('mcpSettings', value)),
            readMcpAudit: () => onDisk.get('mcpAudit') ?? null,
            writeMcpAudit: vi.fn((value: unknown) => void onDisk.set('mcpAudit', value)),
        },
    } as unknown as ElectronAppContext;
    return { ctx, onDisk };
}

const validEntry = {
    at: 1,
    namespace: 'automation',
    tool: 'automation_a',
    argsSummary: '(无参数)',
    ok: true,
    durationMs: 2,
};

describe('MCP 设置的读取', () => {
    it('没有记录时默认关闭——开启必须是一次显式动作', () => {
        const { ctx } = makeCtx();
        expect(readMcpSettings(ctx)).toEqual(DEFAULT_MCP_SETTINGS);
        expect(DEFAULT_MCP_SETTINGS.enabled).toBe(false);
    });

    it('库里内容不合规时回落到默认值，而不是抛错', () => {
        for (const bad of [{ enabled: 'yes' }, { other: 1 }, 'nonsense', null]) {
            const { ctx } = makeCtx({ mcpSettings: bad });
            expect(readMcpSettings(ctx)).toEqual({ enabled: false });
        }
    });

    it('只取 enabled 一个字段，多余字段被丢弃', () => {
        const { ctx } = makeCtx({ mcpSettings: { enabled: true, extra: 'x' } });
        expect(readMcpSettings(ctx)).toEqual({ enabled: true });
    });
});

describe('MCP 设置的写入', () => {
    it('写入合法值并返回规范化结果', () => {
        const { ctx, onDisk } = makeCtx();
        expect(writeMcpSettings(ctx, { enabled: true })).toEqual({ enabled: true });
        expect(onDisk.get('mcpSettings')).toEqual({ enabled: true });
    });

    it('拒绝非布尔值与非对象', () => {
        const { ctx } = makeCtx();
        for (const bad of [{ enabled: 1 }, { enabled: 'true' }, {}, null, 'x']) {
            expect(() => writeMcpSettings(ctx, bad)).toThrowError(/enabled/);
        }
    });
});

describe('MCP 审计的读写', () => {
    it('没有记录时为空数组', () => {
        expect(readMcpAudit(makeCtx().ctx)).toEqual([]);
    });

    it('丢弃损坏的单条，保留其余', () => {
        const { ctx } = makeCtx({
            mcpAudit: { entries: [validEntry, { nope: true }, { ...validEntry, ok: 'yes' }] },
        });
        expect(readMcpAudit(ctx)).toEqual([validEntry]);
    });

    it('结构不对时整体回落到空，而不是抛错', () => {
        for (const bad of [{ entries: 'x' }, [], 'nonsense']) {
            expect(readMcpAudit(makeCtx({ mcpAudit: bad }).ctx)).toEqual([]);
        }
    });

    it('写入时截断到上限', () => {
        const { ctx, onDisk } = makeCtx();
        const many = Array.from({ length: MAX_AUDIT_ENTRIES + 10 }, (_item, index) => ({
            ...validEntry,
            at: index,
        }));

        writeMcpAudit(ctx, many);

        expect((onDisk.get('mcpAudit') as { entries: unknown[] }).entries).toHaveLength(
            MAX_AUDIT_ENTRIES,
        );
    });
});
