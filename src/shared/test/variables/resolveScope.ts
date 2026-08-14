import type { TestRunContext, TestVariableMap } from '../types';
import type { TcdCaseParam } from '@/shared/tcd/types';

export function paramsToVariableMap(params: TcdCaseParam[]): TestVariableMap {
    const map: TestVariableMap = {};
    for (const param of params) {
        const name = param.name.trim();
        if (!name || param.type === 'disabled') continue;
        map[name] = param.value;
    }
    return map;
}

export function mergeVariableScopes(layers: TestVariableMap[]): TestVariableMap {
    const merged: TestVariableMap = {};
    for (const layer of layers) {
        for (const [key, value] of Object.entries(layer)) {
            if (value !== undefined) {
                merged[key] = value;
            }
        }
    }
    return merged;
}

export function buildMergedVariables(context: TestRunContext): TestVariableMap {
    return mergeVariableScopes([
        context.globalVariables ?? {},
        context.environmentVariables ?? {},
        context.suiteVariables ?? {},
        context.caseVariables ?? {},
    ]);
}
