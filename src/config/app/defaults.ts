import type { AppEnv } from '@/types';
import { getDefaultModuleId } from '@/platform/registry/helpers';

export const DEFAULT_APP_ENV: AppEnv = {
    autoSave: true,
    darkMode: false,
    accentColor: undefined,
    sidebarVisible: true,
    get activeModuleId() {
        return getDefaultModuleId();
    },
};
