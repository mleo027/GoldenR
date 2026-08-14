import { describe, expect, it } from 'vitest';
import { buildPlatformCommandActions, filterPlatformCommandActions } from './platformCommandItems';
import type { AppModuleDefinition } from '../registry/types';

const TEST_MODULES: AppModuleDefinition[] = [
    {
        id: 'api-debug',
        label: 'API 调试',
        icon: null,
        order: 10,
        group: 'dev',
        searchKeywords: ['kcbp', '接口'],
        RootProviders: () => null,
        Layout: () => null,
    },
];

describe('platformCommandPalette', () => {
    it('builds module actions plus platform commands', () => {
        const actions = buildPlatformCommandActions(TEST_MODULES);
        expect(
            actions.some((item) => item.kind === 'module' && item.moduleId === 'api-debug'),
        ).toBe(true);
        expect(actions.some((item) => item.kind === 'open-settings')).toBe(true);
    });

    it('filters by label and module keywords', () => {
        const actions = buildPlatformCommandActions(TEST_MODULES);
        expect(filterPlatformCommandActions(actions, 'kcbp', TEST_MODULES)).toEqual([
            expect.objectContaining({ kind: 'module', moduleId: 'api-debug' }),
        ]);
        expect(filterPlatformCommandActions(actions, '设置', TEST_MODULES)).toEqual([
            expect.objectContaining({ kind: 'open-settings' }),
        ]);
    });

    it('returns all actions for blank query', () => {
        const actions = buildPlatformCommandActions(TEST_MODULES);
        expect(filterPlatformCommandActions(actions, '   ', TEST_MODULES)).toEqual(actions);
    });
});
