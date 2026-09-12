import type { McpAuditEntry, McpSettings } from '../../src/shared/mcp/types';
import type { ElectronAppContext } from '../app/context';
import { MAX_AUDIT_ENTRIES } from './audit';

/**
 * MCP 开关与审计的持久化。
 *
 * 存在 `app_preferences` 的 KV 里，因此**不需要改 schema**。读取路径一律按不可信
 * 输入处理：库里可能是旧版本写的、或被手改过的内容。
 */
export const DEFAULT_MCP_SETTINGS: McpSettings = { enabled: false };

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function readMcpSettings(ctx: ElectronAppContext): McpSettings {
    const raw = ctx.configRepository.readMcpSettings();
    return isRecord(raw) && typeof raw.enabled === 'boolean'
        ? { enabled: raw.enabled }
        : { ...DEFAULT_MCP_SETTINGS };
}

export function writeMcpSettings(ctx: ElectronAppContext, input: unknown): McpSettings {
    if (!isRecord(input) || typeof input.enabled !== 'boolean') {
        throw new Error('MCP 设置不合法：enabled 必须是布尔值');
    }
    const settings: McpSettings = { enabled: input.enabled };
    ctx.configRepository.writeMcpSettings(settings);
    return settings;
}

function isAuditEntry(value: unknown): value is McpAuditEntry {
    if (!isRecord(value)) return false;
    return (
        typeof value.at === 'number' &&
        typeof value.namespace === 'string' &&
        typeof value.tool === 'string' &&
        typeof value.argsSummary === 'string' &&
        typeof value.ok === 'boolean' &&
        typeof value.durationMs === 'number'
    );
}

export function readMcpAudit(ctx: ElectronAppContext): McpAuditEntry[] {
    const raw = ctx.configRepository.readMcpAudit();
    if (!isRecord(raw) || !Array.isArray(raw.entries)) return [];
    // 单条损坏不应丢掉整份审计。
    return raw.entries.filter(isAuditEntry).slice(0, MAX_AUDIT_ENTRIES);
}

export function writeMcpAudit(ctx: ElectronAppContext, entries: McpAuditEntry[]): void {
    ctx.configRepository.writeMcpAudit({ entries: entries.slice(0, MAX_AUDIT_ENTRIES) });
}
