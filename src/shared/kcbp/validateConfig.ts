import type { KcbpRuntimeConfig } from './types';

export function validateKcbpRuntimeConfig(config: KcbpRuntimeConfig): string[] {
    const errors: string[] = [];
    if (!config.executable.trim()) {
        errors.push('请配置 KCBP 可执行文件路径');
    }
    if (!config.workingDir.trim()) {
        errors.push('请配置 KCBP 工作目录');
    }
    return errors;
}
