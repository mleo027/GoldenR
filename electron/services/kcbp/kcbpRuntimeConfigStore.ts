import fs from 'fs/promises';
import path from 'path';
import { KCBP_ENV_FILE, TRACECODE_ENV_FILE } from '../../../src/config/files';
import { createDefaultKcbpRuntimeConfig } from '../../../src/config/kcbp/defaults';
import type { KcbpRuntimeConfig } from '../../../src/shared/kcbp/types';

const LEGACY_TRACECODE_KCBP_BACKUP_FILE = 'tracecode.kcbp.legacy-migrated.json';

let userDataDir = '';
let cachedConfig: KcbpRuntimeConfig | null = null;

interface LegacyTracecodeKcbpFields {
    kcbpExecutable?: unknown;
    kcbpWorkingDir?: unknown;
    kcbpArgs?: unknown;
}

export function setKcbpRuntimeConfigUserDataDir(dir: string): void {
    userDataDir = dir;
}

function configPath(): string {
    return path.join(userDataDir, KCBP_ENV_FILE);
}

function tracecodeConfigPath(): string {
    return path.join(userDataDir, TRACECODE_ENV_FILE);
}

function legacyBackupPath(): string {
    return path.join(userDataDir, LEGACY_TRACECODE_KCBP_BACKUP_FILE);
}

function normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((item) => String(item).trim()).filter(Boolean);
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

function legacyFieldsToConfig(partial: LegacyTracecodeKcbpFields): KcbpRuntimeConfig | null {
    const executable = String(partial.kcbpExecutable ?? '').trim();
    const workingDir = String(partial.kcbpWorkingDir ?? '').trim();
    const args = normalizeStringArray(partial.kcbpArgs);
    if (!executable && !workingDir && args.length === 0) {
        return null;
    }
    return normalizeKcbpRuntimeConfig({ executable, workingDir, args });
}

async function stripLegacyKcbpFieldsFromTracecodeEnv(): Promise<void> {
    try {
        const raw = await fs.readFile(tracecodeConfigPath(), 'utf8');
        const parsed = JSON.parse(raw) as LegacyTracecodeKcbpFields & Record<string, unknown>;
        if (
            parsed.kcbpExecutable == null &&
            parsed.kcbpWorkingDir == null &&
            parsed.kcbpArgs == null
        ) {
            return;
        }
        delete parsed.kcbpExecutable;
        delete parsed.kcbpWorkingDir;
        delete parsed.kcbpArgs;
        await fs.writeFile(tracecodeConfigPath(), `${JSON.stringify(parsed)}\n`, 'utf8');
    } catch {
        // tracecode.env.json may not exist yet
    }
}

async function backupLegacyTracecodeKcbpFields(raw: string): Promise<void> {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    await fs.writeFile(legacyBackupPath(), `${JSON.stringify(parsed)}\n`, 'utf8');
}

async function migrateFromTracecodeEnv(): Promise<KcbpRuntimeConfig | null> {
    try {
        const raw = await fs.readFile(tracecodeConfigPath(), 'utf8');
        const migrated = legacyFieldsToConfig(JSON.parse(raw) as LegacyTracecodeKcbpFields);
        if (!migrated) {
            return null;
        }
        await fs.mkdir(userDataDir, { recursive: true });
        await backupLegacyTracecodeKcbpFields(raw);
        await fs.writeFile(configPath(), `${JSON.stringify(migrated)}\n`, 'utf8');
        cachedConfig = migrated;
        await stripLegacyKcbpFieldsFromTracecodeEnv();
        return migrated;
    } catch {
        return null;
    }
}

export async function loadKcbpRuntimeConfig(): Promise<KcbpRuntimeConfig> {
    if (cachedConfig) {
        return cachedConfig;
    }

    try {
        const raw = await fs.readFile(configPath(), 'utf8');
        cachedConfig = normalizeKcbpRuntimeConfig(JSON.parse(raw) as Partial<KcbpRuntimeConfig>);
        return cachedConfig;
    } catch {
        const migrated = await migrateFromTracecodeEnv();
        if (migrated) {
            return migrated;
        }
        cachedConfig = normalizeKcbpRuntimeConfig();
        return cachedConfig;
    }
}

export async function saveKcbpRuntimeConfig(config: KcbpRuntimeConfig): Promise<KcbpRuntimeConfig> {
    const normalized = normalizeKcbpRuntimeConfig(config);
    await fs.mkdir(userDataDir, { recursive: true });
    await fs.writeFile(configPath(), `${JSON.stringify(normalized)}\n`, 'utf8');
    cachedConfig = normalized;
    return normalized;
}

export function invalidateKcbpRuntimeConfigCache(): void {
    cachedConfig = null;
}
