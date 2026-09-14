import type { AppEnv } from '@/types';

export const DEFAULT_APP_ENV: AppEnv = {
    autoSave: true,
    darkMode: false,
    accentColor: undefined,
    sidebarVisible: true,
    // 当前唯一注册的默认模块；从持久化配置加载时仍会由 registry 校正。
    activeModuleId: 'api-debug',
};
