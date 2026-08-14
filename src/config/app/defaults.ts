import type { AppEnv } from '@/types';
import { getDefaultModuleId } from '@/platform/registry/helpers';

export const DEFAULT_APP_ENV: AppEnv = {
    compactMode: false,
    showRowIndex: true,
    autoSave: true,
    darkMode: false,
    sidebarVisible: true,
    get activeModuleId() {
        return getDefaultModuleId();
    },
};
