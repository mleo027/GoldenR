/** 全局应用环境（主题、布局、当前模块等），独立于各子应用业务数据 */
export interface AppEnv {
    compactMode: boolean;
    showRowIndex: boolean;
    autoSave: boolean;
    darkMode: boolean;
    activeModuleId: string;
    /** 模块侧栏是否展开 */
    sidebarVisible: boolean;
}

/** @deprecated 使用 AppEnv */
export type AppPreferences = AppEnv;
