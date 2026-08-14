/** 子应用模块契约：Layout、Provider、设置分区、持久化 flush 等挂载点定义 */
import type { ComponentType, ReactNode } from 'react';

export type SettingsNavCategory = 'general' | 'core' | 'integration';

export type SettingsPanelLayout = 'default' | 'wide';

export type PlatformSettingsPlacement = 'main' | 'footer';

/** 平台级设置分区（外观、关于等） */
export interface PlatformSettingsSection {
    key: string;
    label: string;
    icon: ReactNode;
    category: SettingsNavCategory;
    searchKeywords: string[];
    placement: PlatformSettingsPlacement;
    Panel: ComponentType;
}

export interface ModuleSettingsSection {
    key: string;
    label: string;
    icon: ReactNode;
    Panel: ComponentType;
    moduleId?: string;
    /** 侧边栏分组：常规 / 核心配置 / 集成与扩展 */
    category: SettingsNavCategory;
    /** 设置搜索匹配关键词 */
    searchKeywords: string[];
    /** 内容区布局；宽面板用于双栏工作区（如提示规则） */
    layout?: SettingsPanelLayout;
}

export type AppModuleGroup = 'dev' | 'quality' | 'data';

export interface AppModuleDefinition {
    id: string;
    label: string;
    icon: ReactNode;
    order: number;
    /** 命令面板分组 */
    group?: AppModuleGroup;
    /** 命令面板搜索关键词 */
    searchKeywords?: string[];
    RootProviders: ComponentType<{ children: React.ReactNode }>;
    Layout: ComponentType;
    BreadcrumbSync?: ComponentType;
    /** 渲染到平台 TitleBar 中央插槽（须在 RootProviders 子树内挂载） */
    TitleBarSlot?: ComponentType;
    StatusBar?: ComponentType;
    settingsSections?: ModuleSettingsSection[];
    flushPersistedState?: () => void;
}
