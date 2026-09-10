import type { ConfigRepository } from '../../database/repositories/configRepository';
import type { KuabProfile } from '../../../src/shared/kcbp/types';

let repository: ConfigRepository | null = null;
let cached: KuabProfile[] | null = null;

const defaultProfile: KuabProfile = {
    id: 'default', name: 'Default', serverName: 'KCBP01', username: 'KCXP00', password: '888888',
    configName: 'KCBPCli.json',
};

function normalize(value: unknown): KuabProfile[] {
    const raw = value && typeof value === 'object' ? (value as { profiles?: unknown }).profiles : [];
    const profiles = Array.isArray(raw) ? raw : [];
    const result = profiles.map((item, index) => {
        const p = item && typeof item === 'object' ? item as Record<string, unknown> : {};
        return {
            id: String(p.id ?? `profile-${index}`).trim(), name: String(p.name ?? p.id ?? `Profile ${index + 1}`),
            serverName: String(p.serverName ?? defaultProfile.serverName), username: String(p.username ?? ''),
            password: String(p.password ?? ''), configDir: p.configDir ? String(p.configDir) : undefined,
            configName: p.configName ? String(p.configName) : defaultProfile.configName,
            logDir: p.logDir ? String(p.logDir) : undefined, wantTran: p.wantTran ? String(p.wantTran) : undefined,
        } satisfies KuabProfile;
    }).filter((p) => p.id);
    return result.some((p) => p.id === 'default') ? result : [defaultProfile, ...result];
}

export function setKuabProfileRepository(next: ConfigRepository): void { repository = next; cached = null; }
export async function loadKuabProfiles(): Promise<KuabProfile[]> {
    if (!cached) cached = normalize(repository?.read('kuab.profiles.json'));
    return cached;
}
export async function saveKuabProfiles(profiles: KuabProfile[]): Promise<KuabProfile[]> {
    if (!repository) throw new Error('Database has not been initialized');
    cached = normalize({ profiles }); repository.write('kuab.profiles.json', { profiles: cached }); return cached;
}
export async function resolveKuabProfile(id = 'default'): Promise<KuabProfile> {
    return (await loadKuabProfiles()).find((p) => p.id === id) ?? defaultProfile;
}
