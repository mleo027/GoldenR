/** 全局应用环境（主题、布局、当前模块等），独立于各子应用业务数据 */
export interface AppEnv {
    compactMode: boolean;
    showRowIndex: boolean;
    autoSave: boolean;
    darkMode: boolean;
    /** 用户自定义强调色；未设置时按明暗模式使用默认色 */
    accentColor?: string;
    activeModuleId: string;
    /** 模块侧栏是否展开 */
    sidebarVisible: boolean;
}

/** @deprecated 使用 AppEnv */
export type AppPreferences = AppEnv;
