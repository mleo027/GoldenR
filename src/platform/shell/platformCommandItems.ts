import type { AppModuleDefinition, AppModuleGroup } from '../registry/types';

export type PlatformCommandAction =
    | { kind: 'module'; moduleId: string; label: string; group?: AppModuleGroup }
    | { kind: 'open-settings'; label: string }
    | { kind: 'toggle-dark-mode'; label: string };

export const PLATFORM_COMMAND_GROUP_LABEL: Record<AppModuleGroup, string> = {
    dev: '开发工具',
    quality: '质量与构建',
    data: '数据与文件',
};

export function buildPlatformCommandActions(
    modules: AppModuleDefinition[],
): PlatformCommandAction[] {
    const moduleActions: PlatformCommandAction[] = modules.map((module) => ({
        kind: 'module',
        moduleId: module.id,
        label: module.label,
        group: module.group,
    }));

    return [
        ...moduleActions,
        { kind: 'open-settings', label: '打开设置' },
        { kind: 'toggle-dark-mode', label: '切换深色模式' },
    ];
}

export function filterPlatformCommandActions(
    actions: PlatformCommandAction[],
    query: string,
    modules: AppModuleDefinition[],
): PlatformCommandAction[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return actions;

    const moduleKeywords = new Map(
        modules.map((module) => [module.id, module.searchKeywords ?? []]),
    );

    return actions.filter((action) => {
        if (action.label.toLowerCase().includes(trimmed)) return true;
        if (action.kind !== 'module') return false;
        const keywords = moduleKeywords.get(action.moduleId) ?? [];
        return keywords.some((keyword) => keyword.toLowerCase().includes(trimmed));
    });
}

export function modKeyLabel(): string {
    if (typeof navigator === 'undefined') return 'Ctrl';
    return /Mac|iPhone|iPad/i.test(navigator.platform) ? '⌘' : 'Ctrl';
}
