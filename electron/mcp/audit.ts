import type { McpAuditEntry } from '../../src/shared/mcp/types';

/** 审计上限：只保留最近若干条，避免无限增长。 */
export const MAX_AUDIT_ENTRIES = 200;

/**
 * 参数摘要——**只记录参数名，绝不记录取值**。
 *
 * `write_scenario` 的参数里可能是一整段用户脚本，落明文等于把用户代码写进日志；
 * 而"传了哪些参数"对排查问题已经够用。
 */
export function summarizeArgs(args: Record<string, unknown> | undefined): string {
    const keys = Object.keys(args ?? {}).sort();
    return keys.length === 0 ? '(无参数)' : keys.join(', ');
}

/** 主进程不认识模块，只认识工具名前缀里的命名空间（如 `automation_`）。 */
export function namespaceOf(toolName: string): string {
    const index = toolName.indexOf('_');
    return index > 0 ? toolName.slice(0, index) : toolName;
}

/**
 * 近期调用审计。
 *
 * 持久化通过注入的 `persist` 完成，因此这一层不依赖数据库，可直接单测。
 */
export class McpAuditLog {
    private entries: McpAuditEntry[] = [];
    private readonly persist: (entries: McpAuditEntry[]) => void;

    constructor(persist: (entries: McpAuditEntry[]) => void) {
        this.persist = persist;
    }

    /** 启动时载入历史记录。 */
    hydrate(entries: McpAuditEntry[]): void {
        this.entries = entries.slice(0, MAX_AUDIT_ENTRIES);
    }

    record(entry: McpAuditEntry): void {
        this.entries = [entry, ...this.entries].slice(0, MAX_AUDIT_ENTRIES);
        this.persist(this.entries);
    }

    /** 最新的在前。 */
    list(): McpAuditEntry[] {
        return [...this.entries];
    }

    get size(): number {
        return this.entries.length;
    }
}
