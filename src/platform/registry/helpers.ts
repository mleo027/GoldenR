import { APP_MODULES } from './app-modules';
import type { AppModuleDefinition } from './types';

export function getDefaultModuleId(): string {
    const [first] = APP_MODULES;
    if (!first) {
        throw new Error('APP_MODULES is empty; at least one module must be registered.');
    }
    return first.id;
}

export function isRegisteredModuleId(id: string): boolean {
    return APP_MODULES.some((module) => module.id === id);
}

export function resolveActiveModuleId(id?: string): string {
    const trimmed = id?.trim();
    if (trimmed && isRegisteredModuleId(trimmed)) {
        return trimmed;
    }
    return getDefaultModuleId();
}

export function getModuleById(id: string): AppModuleDefinition | undefined {
    return APP_MODULES.find((module) => module.id === id);
}
