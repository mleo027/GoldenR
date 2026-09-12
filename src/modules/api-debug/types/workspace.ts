export interface TabData {
    id: string;
    folderId?: string;
    name: string;
    protocol: string;
    address: string;
    params: ParamItem[];
    script?: string;
    /** TCD 运行参数默认值（持久化于 cases.run_input_json） */
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
    folders?: CaseFolder[];
    /** 设置使用的公共参数集 id（undefined = 未设置） */
    commonParamSetId?: string;
    createdAt: number;
    updatedAt: number;
}

export interface CaseFolder {
    id: string;
    name: string;
    parentId?: string;
    position: number;
    createdAt: number;
    updatedAt: number;
}

/** projects/cases 表的持久化接口记录 */
export interface PersistedCaseRecord {
    id?: string;
    folderId?: string;
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
    folders?: CaseFolder[];
    /** 设置使用的公共参数集 id（undefined = 未设置） */
    commonParamSetId?: string;
}

export interface ProjectFileData {
    projects: PersistedProjectRecord[];
}

export type EditorMode = 'ui' | 'script';

/** workspace_state 表的工作区导航状态 */
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
