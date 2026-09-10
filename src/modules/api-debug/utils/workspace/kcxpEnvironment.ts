import type { KcxpEnvironment, KcxpProtocol } from '../../types/kcxp';
import { DEFAULT_KCXP_ENVIRONMENT_ID, DEFAULT_KCXP_ENVIRONMENTS } from '../../constants/kcxpEnv';
import { parseKcbpAddress, serializeKcbpAddress, type KcbpAddressParts } from '../kcbp/kcbpAddress';
import { DEFAULT_DB_CONFIG } from '../../constants/paramSuggest';

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function createKcxpEnvironmentId(): string {
    return generateId();
}

export function createKcxpEnvironment(
    name: string,
    partial?: Partial<KcxpEnvironment>,
): KcxpEnvironment {
    const template = DEFAULT_KCXP_ENVIRONMENTS[0];
    const protocol = partial?.protocol ?? 'KCBP';
    return {
        id: createKcxpEnvironmentId(),
        name,
        protocol,
        host: partial?.host ?? template.host,
        queue: partial?.queue ?? template.queue,
        timeout: partial?.timeout ?? template.timeout,
        service: partial?.service,
        nodeId: partial?.nodeId,
        clientSessionId: partial?.clientSessionId ?? (protocol === 'KGBP' ? '@custid' : undefined),
        kuabConfigId: partial?.kuabConfigId ?? (protocol === 'KUAB' ? 'default' : undefined),
        database: { ...DEFAULT_DB_CONFIG, ...partial?.database },
    };
}

export function resolveKcxpProtocol(environment: KcxpEnvironment): KcxpProtocol {
    return environment.protocol ?? 'KCBP';
}

export function isKcxpEnvironment(value: unknown): value is KcxpEnvironment {
    if (!value || typeof value !== 'object') return false;
    const env = value as Partial<KcxpEnvironment>;
    return (
        typeof env.id === 'string' &&
        typeof env.name === 'string' &&
        typeof env.host === 'string' &&
        typeof env.queue === 'string' &&
        typeof env.timeout === 'string' &&
        Boolean(env.database)
    );
}

export function normalizeKcxpEnvironments(value: unknown): KcxpEnvironment[] {
    if (!Array.isArray(value)) return [...DEFAULT_KCXP_ENVIRONMENTS];
    const valid = value
        .filter(isKcxpEnvironment)
        .map((environment) =>
            environment.protocol === 'KGBP' && !environment.clientSessionId?.trim()
                ? { ...environment, clientSessionId: '@custid' }
                : environment.protocol === 'KUAB' && !environment.kuabConfigId?.trim()
                  ? { ...environment, kuabConfigId: 'default' }
                  : environment,
        );
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

export const KGBP_REQUIRED_FIELDS_MESSAGE =
    'KGBP 环境 ServiceName/NodeId 未配置，请在 设置→请求→环境配置 中完善';

const INTEGER_PATTERN = /^-?\d+$/;

/**
 * 校验解析后的地址是否具备 KGBP 必填字段（ServiceName、NodeId）。
 * NodeId 须为纯整数字符串（native 端按整数读取）。
 */
export function findMissingKgbpRequiredFields(
    parts: Pick<KcbpAddressParts, 'service' | 'nodeId'>,
): string[] {
    const missing: string[] = [];
    if (!parts.service?.trim()) {
        missing.push('ServiceName');
    }
    if (!parts.nodeId?.trim() || !INTEGER_PATTERN.test(parts.nodeId.trim())) {
        missing.push('NodeId');
    }
    return missing;
}

export function isKgbpAddressReady(parts: Pick<KcbpAddressParts, 'service' | 'nodeId'>): boolean {
    return findMissingKgbpRequiredFields(parts).length === 0;
}

function setQueryParam(params: URLSearchParams, key: string, value: string | undefined): void {
    const trimmed = value?.trim();
    if (trimmed) {
        params.set(key, trimmed);
    }
}

export function applyKcxpEnvironmentToAddress(
    address: string,
    environment: KcxpEnvironment,
): string {
    const parts = parseKcbpAddress(address);

    if (resolveKcxpProtocol(environment) === 'KGBP') {
        const params = new URLSearchParams();
        setQueryParam(params, 'service', environment.service);
        setQueryParam(params, 'nodeid', environment.nodeId);
        setQueryParam(params, 'clientsessionid', environment.clientSessionId || '@custid');
        setQueryParam(params, 'requesttimeout', environment.timeout);

        const host = environment.host.trim();
        const msgtype = parts.msgtype;
        const result = msgtype ? `${host}/${msgtype}` : host;
        const query = params.toString();
        return query ? `${result}?${query}` : result;
    }

    // 切回 KCBP 时剥离 KGBP 专属键，避免残留到请求地址
    return serializeKcbpAddress({
        ...parts,
        host: environment.host,
        queue: environment.queue,
        timeout: environment.timeout,
        service: undefined,
        nodeId: undefined,
        clientSessionId: undefined,
        kuabConfigId:
            resolveKcxpProtocol(environment) === 'KUAB' ? environment.kuabConfigId : undefined,
    });
}

export function buildAddressFromKcxpEnvironment(
    environment: KcxpEnvironment,
    msgtype = '',
): string {
    return applyKcxpEnvironmentToAddress(msgtype ? `/${msgtype}` : '', environment);
}
