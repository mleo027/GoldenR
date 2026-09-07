export interface TabData {
    id: string;
    name: string;
    protocol: string;
    address: string;
    params: ParamItem[];
    script?: string;
    /** TCD 运行参数默认值（持久化于 project.json） */
    runInput?: Record<string, unknown>;
    /** @deprecated 迁移用 */
    requestScript?: string;
    /** @deprecated 迁移用 */
    responseScript?: string;
    favorite?: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface ProjectData {
    id: string;
    name: string;
    cases: TabData[];
    /** 设置使用的公共参数集 id（undefined = 未设置） */
    commonParamSetId?: string;
    createdAt: number;
    updatedAt: number;
}

/** project.json：持久化接口名称、地址与入参 */
export interface PersistedCaseRecord {
    name?: string;
    address: string;
    params: ParamItem[];
    script?: string;
    runInput?: Record<string, unknown>;
    requestScript?: string;
    responseScript?: string;
    favorite?: boolean;
}

export interface PersistedProjectRecord {
    id?: string;
    name: string;
    cases: PersistedCaseRecord[];
    /** 设置使用的公共参数集 id（undefined = 未设置） */
    commonParamSetId?: string;
}

export interface ProjectFileData {
    projects: PersistedProjectRecord[];
}

export type EditorMode = 'ui' | 'script';

/** settings.json：工作区导航状态 */
export interface AppSettings {
    activeProjectIndex: number;
    activeCaseIndex: number;
    expandedProjectIds: string[];
    /** 顶部页签中打开的接口 id 列表（按打开顺序） */
    openCaseIds?: string[];
}

export interface PersistedWorkspace {
    projects: ProjectData[];
    activeProjectIndex: number;
    activeCaseIndex: number;
    expandedProjectIds: string[];
    openCaseIds: string[];
}

export type ParamFieldType = 'string' | 'file' | 'disabled';

export interface ParamItem {
    name: string;
    value: string;
    type: ParamFieldType;
}

export type { ResponseData } from '@/shared/test/response';
