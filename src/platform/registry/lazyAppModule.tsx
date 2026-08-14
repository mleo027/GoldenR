import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import ModuleLayoutSkeleton from '@/components/ui/ModuleLayoutSkeleton';
import type { AppModuleDefinition, AppModuleGroup } from './types';

type LazyModuleLoader = () => Promise<AppModuleDefinition>;

const moduleLoadCache = new Map<string, Promise<AppModuleDefinition>>();

function patchLoadedModuleShell(shell: AppModuleDefinition, definition: AppModuleDefinition): void {
    Object.defineProperty(shell, 'settingsSections', {
        get: () => definition.settingsSections,
        enumerable: true,
        configurable: true,
    });
    shell.flushPersistedState = () => definition.flushPersistedState?.();
}

export function ensureAppModuleLoaded(
    id: string,
    load: LazyModuleLoader,
    shell?: AppModuleDefinition,
): Promise<AppModuleDefinition> {
    let pending = moduleLoadCache.get(id);
    if (!pending) {
        pending = load().then((definition) => {
            if (shell) {
                patchLoadedModuleShell(shell, definition);
            }
            return definition;
        });
        moduleLoadCache.set(id, pending);
    } else if (shell) {
        void pending.then((definition) => patchLoadedModuleShell(shell, definition));
    }
    return pending;
}

export interface LazyAppModuleMeta {
    id: string;
    label: string;
    icon: ReactNode;
    order: number;
    load: LazyModuleLoader;
    group?: AppModuleGroup;
    searchKeywords?: string[];
    /** full = 无侧栏模块骨架 */
    skeletonVariant?: 'sidebar-main' | 'full';
}

function useLoadedModuleDefinition(id: string, load: LazyModuleLoader): AppModuleDefinition | null {
    const [definition, setDefinition] = useState<AppModuleDefinition | null>(null);

    useEffect(() => {
        let cancelled = false;
        void ensureAppModuleLoaded(id, load).then((loaded) => {
            if (!cancelled) setDefinition(loaded);
        });
        return () => {
            cancelled = true;
        };
    }, [id, load]);

    return definition;
}

function createLazyModuleComponent<P extends object>(
    id: string,
    load: LazyModuleLoader,
    pick: (definition: AppModuleDefinition) => ComponentType<P> | undefined,
    options: {
        skeletonVariant?: 'sidebar-main' | 'full';
        animateContent?: boolean;
        showSkeleton?: boolean;
    } = {},
): ComponentType<P> {
    const {
        skeletonVariant = 'sidebar-main',
        animateContent = false,
        showSkeleton = true,
    } = options;

    function LazyModuleComponent(props: P) {
        const definition = useLoadedModuleDefinition(id, load);
        if (!definition) {
            return showSkeleton ? <ModuleLayoutSkeleton variant={skeletonVariant} /> : null;
        }
        const Component = pick(definition);
        if (!Component) return null;
        const content = <Component {...props} />;
        if (!animateContent) return content;
        return (
            <div className="module-content-enter flex flex-1 min-h-0 min-w-0 flex-col">
                {content}
            </div>
        );
    }
    LazyModuleComponent.displayName = `LazyModule(${id})`;
    return LazyModuleComponent;
}

export function createLazyAppModule(meta: LazyAppModuleMeta): AppModuleDefinition {
    const {
        id,
        label,
        icon,
        order,
        load,
        group,
        searchKeywords,
        skeletonVariant = 'sidebar-main',
    } = meta;
    const shell: AppModuleDefinition & { ensureLoaded: () => Promise<AppModuleDefinition> } = {
        id,
        label,
        icon,
        order,
        group,
        searchKeywords,
        ensureLoaded: () => ensureAppModuleLoaded(id, load, shell),
        RootProviders: createLazyModuleComponent(
            id,
            load,
            (definition) => definition.RootProviders,
            { skeletonVariant, showSkeleton: true, animateContent: false },
        ),
        Layout: createLazyModuleComponent(id, load, (definition) => definition.Layout, {
            skeletonVariant,
            showSkeleton: false,
            animateContent: true,
        }),
        BreadcrumbSync: createLazyModuleComponent(
            id,
            load,
            (definition) => definition.BreadcrumbSync,
            { showSkeleton: false },
        ),
        TitleBarSlot: createLazyModuleComponent(id, load, (definition) => definition.TitleBarSlot, {
            showSkeleton: false,
        }),
        StatusBar: createLazyModuleComponent(id, load, (definition) => definition.StatusBar, {
            showSkeleton: false,
        }),
        settingsSections: undefined,
        flushPersistedState: async () => {
            const definition = await ensureAppModuleLoaded(id, load, shell);
            await definition.flushPersistedState?.();
        },
    };

    return shell;
}

export function preloadAppModule(definition: AppModuleDefinition): void {
    const lazy = definition as AppModuleDefinition & {
        ensureLoaded?: () => Promise<AppModuleDefinition>;
    };
    void lazy.ensureLoaded?.().then((loaded) => {
        patchLoadedModuleShell(definition, loaded);
    });
}
