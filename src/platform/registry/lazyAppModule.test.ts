import { describe, expect, it, vi } from 'vitest';
import type { AppModuleDefinition } from './types';
import { createLazyAppModule, ensureAppModuleLoaded, preloadAppModule } from './lazyAppModule';

function createMockDefinition(id: string): AppModuleDefinition {
    return {
        id,
        label: `Module ${id}`,
        icon: null,
        order: 1,
        RootProviders: ({ children }) => children,
        Layout: () => null,
        settingsSections: [
            {
                key: `${id}-settings`,
                label: 'Settings',
                icon: null,
                Panel: () => null,
                category: 'core',
                searchKeywords: ['settings'],
            },
        ],
        flushPersistedState: vi.fn(),
    };
}

describe('lazyAppModule', () => {
    it('createLazyAppModule does not call loader until ensureLoaded', async () => {
        const load = vi.fn(async () => createMockDefinition('lazy-a'));
        const shell = createLazyAppModule({
            id: 'lazy-a',
            label: 'Lazy A',
            icon: null,
            order: 1,
            load,
        });

        expect(load).not.toHaveBeenCalled();
        await (
            shell as AppModuleDefinition & { ensureLoaded: () => Promise<AppModuleDefinition> }
        ).ensureLoaded();
        expect(load).toHaveBeenCalledTimes(1);
        await (
            shell as AppModuleDefinition & { ensureLoaded: () => Promise<AppModuleDefinition> }
        ).ensureLoaded();
        expect(load).toHaveBeenCalledTimes(1);
    });

    it('ensureAppModuleLoaded deduplicates concurrent loads by id', async () => {
        const load = vi.fn(async () => createMockDefinition('lazy-b'));
        const loader = () => load();

        await Promise.all([
            ensureAppModuleLoaded('lazy-b', loader),
            ensureAppModuleLoaded('lazy-b', loader),
        ]);

        expect(load).toHaveBeenCalledTimes(1);
    });

    it('preloadAppModule patches settingsSections after load', async () => {
        const definition = createMockDefinition('lazy-c');
        const shell = createLazyAppModule({
            id: 'lazy-c',
            label: 'Lazy C',
            icon: null,
            order: 1,
            load: async () => definition,
        });

        expect(shell.settingsSections).toBeUndefined();
        preloadAppModule(shell);
        await (
            shell as AppModuleDefinition & { ensureLoaded: () => Promise<AppModuleDefinition> }
        ).ensureLoaded();
        expect(shell.settingsSections).toEqual(definition.settingsSections);
    });

    it('flushPersistedState triggers load then calls module flush', async () => {
        const flushPersistedState = vi.fn();
        const shell = createLazyAppModule({
            id: 'lazy-d',
            label: 'Lazy D',
            icon: null,
            order: 1,
            load: async () => ({
                ...createMockDefinition('lazy-d'),
                flushPersistedState,
            }),
        });

        void shell.flushPersistedState?.();
        await vi.waitFor(() => expect(flushPersistedState).toHaveBeenCalledTimes(1));
    });
});
