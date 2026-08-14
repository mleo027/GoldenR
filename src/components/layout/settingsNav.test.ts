import { describe, expect, it } from 'vitest';
import {
    buildSettingsNavGroups,
    filterSettingsNavGroups,
    matchesSettingsSearch,
    type SettingsNavItem,
} from './settingsNav';
import type { ModuleSettingsSection, PlatformSettingsSection } from '../../platform/registry/types';

const platformSections: PlatformSettingsSection[] = [
    {
        key: 'appearance',
        label: '外观',
        icon: null,
        category: 'general',
        searchKeywords: ['深色'],
        placement: 'main',
        Panel: () => null,
    },
];

const moduleSections: ModuleSettingsSection[] = [
    {
        key: 'api-request',
        label: '请求',
        icon: null,
        Panel: () => null,
        category: 'core',
        searchKeywords: ['KCXP'],
    },
    {
        key: 'api-rules',
        label: '提示规则',
        icon: null,
        Panel: () => null,
        category: 'general',
        searchKeywords: ['入参'],
    },
];

describe('buildSettingsNavGroups', () => {
    it('groups platform and module items by category', () => {
        const groups = buildSettingsNavGroups(platformSections, moduleSections);
        expect(groups.map((group) => group.key)).toEqual(['general', 'core']);
        expect(groups[0]?.items.map((item) => item.key)).toEqual(['appearance', 'api-rules']);
        expect(groups[1]?.items.map((item) => item.key)).toEqual(['api-request']);
    });

    it('ignores footer platform sections in main nav', () => {
        const footerOnly: PlatformSettingsSection[] = [
            {
                key: 'about',
                label: '关于',
                icon: null,
                category: 'general',
                searchKeywords: ['版本'],
                placement: 'footer',
                Panel: () => null,
            },
        ];
        const groups = buildSettingsNavGroups(footerOnly, []);
        expect(groups).toEqual([]);
    });
});

describe('matchesSettingsSearch', () => {
    it('matches label and keywords case-insensitively', () => {
        const item: SettingsNavItem = {
            key: 'api-request',
            label: '请求',
            icon: null,
            searchKeywords: ['KCXP'],
        };
        expect(matchesSettingsSearch(item, 'kcxp')).toBe(true);
        expect(matchesSettingsSearch(item, '请求')).toBe(true);
        expect(matchesSettingsSearch(item, '数据库')).toBe(false);
    });
});

describe('filterSettingsNavGroups', () => {
    it('hides groups with no matching items', () => {
        const groups = buildSettingsNavGroups(platformSections, moduleSections);
        const filtered = filterSettingsNavGroups(groups, '请求');
        expect(filtered).toHaveLength(1);
        expect(filtered[0]?.key).toBe('core');
    });
});
