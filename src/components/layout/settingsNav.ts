import type {
    ModuleSettingsSection,
    PlatformSettingsSection,
    SettingsNavCategory,
} from '../../platform/registry/types';

export interface SettingsNavItem {
    key: string;
    label: string;
    icon: PlatformSettingsSection['icon'];
    searchKeywords: string[];
}

export interface SettingsNavGroup {
    key: SettingsNavCategory;
    label: string;
    items: SettingsNavItem[];
}

const CATEGORY_ORDER: SettingsNavCategory[] = ['general', 'core', 'integration'];

const CATEGORY_LABELS: Record<SettingsNavCategory, string> = {
    general: '常规',
    core: '核心配置',
    integration: '集成与扩展',
};

function toNavItem(section: {
    key: string;
    label: string;
    icon: PlatformSettingsSection['icon'];
    searchKeywords: string[];
}): SettingsNavItem {
    return {
        key: section.key,
        label: section.label,
        icon: section.icon,
        searchKeywords: section.searchKeywords,
    };
}

export function matchesSettingsSearch(item: SettingsNavItem, query: string): boolean {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;
    const haystack = [item.label, ...item.searchKeywords].join(' ').toLowerCase();
    return haystack.includes(normalized);
}

export function buildSettingsNavGroups(
    platformSections: PlatformSettingsSection[],
    moduleSections: ModuleSettingsSection[],
): SettingsNavGroup[] {
    const buckets = new Map<SettingsNavCategory, SettingsNavItem[]>(
        CATEGORY_ORDER.map((category) => [category, []]),
    );

    for (const section of platformSections) {
        if (section.placement !== 'main') continue;
        buckets.get(section.category)?.push(toNavItem(section));
    }

    for (const section of moduleSections) {
        buckets.get(section.category)?.push(toNavItem(section));
    }

    return CATEGORY_ORDER.flatMap((category) => {
        const items = buckets.get(category) ?? [];
        if (items.length === 0) return [];
        return [{ key: category, label: CATEGORY_LABELS[category], items }];
    });
}

export function filterSettingsNavGroups(
    groups: SettingsNavGroup[],
    query: string,
): SettingsNavGroup[] {
    const normalized = query.trim();
    if (!normalized) return groups;
    return groups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => matchesSettingsSearch(item, normalized)),
        }))
        .filter((group) => group.items.length > 0);
}

export function toSettingsNavItem(section: {
    key: string;
    label: string;
    icon: PlatformSettingsSection['icon'];
    searchKeywords: string[];
}): SettingsNavItem {
    return toNavItem(section);
}
