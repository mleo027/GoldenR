import type { ConfigRepository } from '../../database/repositories/configRepository';
import { createDefaultKcbpRuntimeConfig } from '../../../src/config/kcbp/defaults';
import type { KcbpRuntimeConfig } from '../../../src/shared/kcbp/types';

let repository: ConfigRepository | null = null;
let cachedConfig: KcbpRuntimeConfig | null = null;

export function setKcbpRuntimeConfigRepository(next: ConfigRepository): void {
    repository = next;
    cachedConfig = null;
}
function normalizeStringArray(value: unknown): string[] {
    return Array.isArray(value)
        ? value
              .map(String)
              .map((item) => item.trim())
              .filter(Boolean)
        : [];
}
export function normalizeKcbpRuntimeConfig(
    partial?: Partial<KcbpRuntimeConfig>,
): KcbpRuntimeConfig {
    const defaults = createDefaultKcbpRuntimeConfig();
    return {
        executable: String(partial?.executable ?? defaults.executable).trim(),
        workingDir: String(partial?.workingDir ?? defaults.workingDir).trim(),
        args: normalizeStringArray(partial?.args),
    };
}
export async function loadKcbpRuntimeConfig(): Promise<KcbpRuntimeConfig> {
    if (cachedConfig) return cachedConfig;
    cachedConfig = normalizeKcbpRuntimeConfig(
        repository?.readKcbpRuntimeConfig() as Partial<KcbpRuntimeConfig> | undefined,
    );
    return cachedConfig;
}
export async function saveKcbpRuntimeConfig(config: KcbpRuntimeConfig): Promise<KcbpRuntimeConfig> {
    if (!repository) throw new Error('Database has not been initialized');
    cachedConfig = normalizeKcbpRuntimeConfig(config);
    repository.writeKcbpRuntimeConfig(cachedConfig);
    return cachedConfig;
}
export function invalidateKcbpRuntimeConfigCache(): void {
    cachedConfig = null;
}
