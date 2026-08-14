export type PathEnvVariant = 'dev' | 'test' | 'prod' | 'default';

export function getPathEnvVariant(environmentName: string): PathEnvVariant {
    const name = environmentName.trim().toLowerCase();
    if (!name) return 'default';

    if (/prod|生产|正式|线上/.test(name)) return 'prod';
    if (/test|测试|uat|sit|预发|仿真/.test(name)) return 'test';
    if (/dev|开发|本地|default/.test(name)) return 'dev';

    return 'default';
}

export function getPathEnvShortLabel(environmentName: string): string {
    const variant = getPathEnvVariant(environmentName);
    if (variant === 'prod') return 'PROD';
    if (variant === 'test') return 'TEST';
    if (variant === 'dev') return 'DEV';
    return environmentName.trim().slice(0, 8).toUpperCase() || 'ENV';
}
