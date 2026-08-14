import type { TestVariableMap } from '../types';
import { interpolateTemplate } from './interpolate';
import { mergeVariableScopes } from './resolveScope';

export interface VarsScriptApi {
    get: (name: string) => unknown;
    all: () => Record<string, unknown>;
    interpolate: (template: string) => string;
    /** 运行时临时覆盖（仅当前 Run，优先级最高） */
    set: (name: string, value: unknown) => void;
}

export function createVarsApi(baseLayers: TestVariableMap[]): VarsScriptApi {
    const runtimeOverrides: TestVariableMap = {};

    const snapshot = (): TestVariableMap => mergeVariableScopes([...baseLayers, runtimeOverrides]);

    return {
        get(name: string) {
            const map = snapshot();
            return map[name];
        },
        all() {
            return { ...snapshot() };
        },
        interpolate(template: string) {
            return interpolateTemplate(template, snapshot());
        },
        set(name: string, value: unknown) {
            runtimeOverrides[name] = value as TestVariableMap[string];
        },
    };
}

export function createNoopVarsApi(): VarsScriptApi {
    return {
        get: () => undefined,
        all: () => ({}),
        interpolate: (template: string) => template,
        set: () => {},
    };
}
