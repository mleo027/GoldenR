import { createDefaultKcbpRuntimeConfig } from '@/config/kcbp/defaults';
import type { KcbpRuntimeConfig } from './types';

function splitLines(value: string | string[] | undefined): string[] {
    if (Array.isArray(value)) {
        return value.map((line) => String(line).trim()).filter(Boolean);
    }
    return String(value ?? '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}

export interface KcbpRuntimeConfigFormValues extends KcbpRuntimeConfig {
    argsText?: string;
}

export function buildKcbpRuntimeConfigFromFormValues(
    values: Partial<KcbpRuntimeConfigFormValues>,
): KcbpRuntimeConfig {
    const defaults = createDefaultKcbpRuntimeConfig();
    return {
        executable: String(values.executable ?? defaults.executable).trim(),
        workingDir: String(values.workingDir ?? defaults.workingDir).trim(),
        args:
            values.argsText != null ? splitLines(values.argsText) : (values.args ?? defaults.args),
    };
}

export function kcbpRuntimeConfigToFormValues(
    config: KcbpRuntimeConfig,
): KcbpRuntimeConfigFormValues {
    return {
        ...config,
        argsText: config.args.join('\n'),
    };
}
