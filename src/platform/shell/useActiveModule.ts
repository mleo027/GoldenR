import { useMemo } from 'react';
import { useAppEnv } from '../../store/useAppEnv';
import type { AppModuleDefinition } from '../registry/types';

export function useActiveModule(modules: AppModuleDefinition[]): AppModuleDefinition | undefined {
    const { env } = useAppEnv();
    return useMemo(
        () => modules.find((module) => module.id === env.activeModuleId) ?? modules[0],
        [env.activeModuleId, modules],
    );
}
