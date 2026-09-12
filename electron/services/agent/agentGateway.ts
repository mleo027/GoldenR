import { safeStorage } from 'electron';
import type {
    AgentGatewayConfig,
    AgentGatewayConfigInput,
} from '../../../src/shared/agent/gateway';
import type { ElectronAppContext } from '../../ipc/types';

/**
 * Agent 模型网关配置的读写。
 *
 * 密钥使用 Electron safeStorage 加密后存入 SQLite 的 app_preferences，
 * 渲染进程只能读到 `hasApiKey` 布尔值。
 * 若当前平台不支持加密（部分 Linux 桌面环境），退化为带标记的明文存储，
 * 并在返回的配置里如实反映，避免"以为加密了其实没有"。
 */

interface StoredGatewayConfig {
    baseUrl?: string;
    model?: string;
    /** safeStorage 加密后的 base64。 */
    secret?: string;
    /** 加密不可用时为 true，表示 secret 是明文 base64。 */
    secretPlain?: boolean;
}

function readStored(ctx: ElectronAppContext): StoredGatewayConfig {
    const value = ctx.configRepository.readAgentGatewayConfig();
    if (!value || typeof value !== 'object') return {};
    return value as StoredGatewayConfig;
}

export function readAgentGatewayConfig(ctx: ElectronAppContext): AgentGatewayConfig {
    const stored = readStored(ctx);
    return {
        baseUrl: typeof stored.baseUrl === 'string' ? stored.baseUrl : '',
        model: typeof stored.model === 'string' ? stored.model : '',
        hasApiKey: Boolean(stored.secret),
    };
}

function encryptSecret(apiKey: string): Pick<StoredGatewayConfig, 'secret' | 'secretPlain'> {
    const buffer = Buffer.from(apiKey, 'utf8');
    if (safeStorage.isEncryptionAvailable()) {
        return { secret: safeStorage.encryptString(apiKey).toString('base64'), secretPlain: false };
    }
    return { secret: buffer.toString('base64'), secretPlain: true };
}

/** 解密出调用网关所需的密钥；未配置时返回空字符串。 */
export function resolveAgentGatewayKey(ctx: ElectronAppContext): string {
    const stored = readStored(ctx);
    if (!stored.secret) return '';
    try {
        const buffer = Buffer.from(stored.secret, 'base64');
        if (stored.secretPlain) return buffer.toString('utf8');
        return safeStorage.decryptString(buffer);
    } catch {
        return '';
    }
}

export function writeAgentGatewayConfig(
    ctx: ElectronAppContext,
    input: AgentGatewayConfigInput,
): AgentGatewayConfig {
    const stored = readStored(ctx);
    const next: StoredGatewayConfig = {
        baseUrl: input.baseUrl.trim(),
        model: input.model.trim(),
        secret: stored.secret,
        secretPlain: stored.secretPlain,
    };

    // 省略或空字符串表示保持原密钥不变，便于只改地址或模型。
    if (typeof input.apiKey === 'string' && input.apiKey.length > 0) {
        Object.assign(next, encryptSecret(input.apiKey));
    }

    ctx.configRepository.writeAgentGatewayConfig(next);
    return readAgentGatewayConfig(ctx);
}
