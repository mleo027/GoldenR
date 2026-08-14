import type { KcxpEnvironment } from '../../types/kcxp';
import { DEFAULT_KCXP_ENVIRONMENT_ID, DEFAULT_KCXP_ENVIRONMENTS } from '../../constants/kcxpEnv';
import { parseKcbpAddress, serializeKcbpAddress } from '../kcbp/kcbpAddress';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function createKcxpEnvironmentId(): string {
    return generateId();
}

export function createKcxpEnvironment(
    name: string,
    partial?: Partial<KcxpEnvironment>,
): KcxpEnvironment {
    const template = DEFAULT_KCXP_ENVIRONMENTS[0];
    return {
        id: createKcxpEnvironmentId(),
        name,
        host: partial?.host ?? template.host,
        queue: partial?.queue ?? template.queue,
        timeout: partial?.timeout ?? template.timeout,
    };
}

export function isKcxpEnvironment(value: unknown): value is KcxpEnvironment {
    if (!value || typeof value !== 'object') return false;
    const env = value as Partial<KcxpEnvironment>;
    return (
        typeof env.id === 'string' &&
        typeof env.name === 'string' &&
        typeof env.host === 'string' &&
        typeof env.queue === 'string' &&
        typeof env.timeout === 'string'
    );
}

export function normalizeKcxpEnvironments(value: unknown): KcxpEnvironment[] {
    if (!Array.isArray(value)) return [...DEFAULT_KCXP_ENVIRONMENTS];
    const valid = value.filter(isKcxpEnvironment);
    return valid.length > 0 ? valid : [...DEFAULT_KCXP_ENVIRONMENTS];
}

export function resolveActiveKcxpEnvironmentId(
    environments: KcxpEnvironment[],
    activeId: string | undefined,
): string {
    if (activeId && environments.some((item) => item.id === activeId)) {
        return activeId;
    }
    return environments[0]?.id ?? DEFAULT_KCXP_ENVIRONMENT_ID;
}

export function getActiveKcxpEnvironment(
    environments: KcxpEnvironment[],
    activeId: string,
): KcxpEnvironment {
    return (
        environments.find((item) => item.id === activeId) ??
        environments[0] ??
        DEFAULT_KCXP_ENVIRONMENTS[0]
    );
}

export function applyKcxpEnvironmentToAddress(
    address: string,
    environment: KcxpEnvironment,
): string {
    const parts = parseKcbpAddress(address);
    return serializeKcbpAddress({
        ...parts,
        host: environment.host,
        queue: environment.queue,
        timeout: environment.timeout,
    });
}

export function buildAddressFromKcxpEnvironment(
    environment: KcxpEnvironment,
    msgtype = '',
): string {
    return serializeKcbpAddress({
        host: environment.host,
        msgtype,
        queue: environment.queue,
        timeout: environment.timeout,
    });
}
