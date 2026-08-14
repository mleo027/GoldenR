import type { TestVariableMap, TestVariableValue } from '../types';

const VAR_PATTERN = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

export function stringifyVariableValue(value: TestVariableValue | undefined): string {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

export function interpolateTemplate(template: string, variables: TestVariableMap): string {
    return template.replace(VAR_PATTERN, (_match, name: string) => {
        if (!(name in variables)) {
            throw new Error(`变量未定义: ${name}`);
        }
        return stringifyVariableValue(variables[name]);
    });
}

export function extractVariableNames(template: string): string[] {
    const names = new Set<string>();
    for (const match of template.matchAll(VAR_PATTERN)) {
        if (match[1]) names.add(match[1]);
    }
    return [...names];
}
