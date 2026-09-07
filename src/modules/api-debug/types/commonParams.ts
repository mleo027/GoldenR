import type { ParamItem } from './workspace';

/** 一套命名的公共参数集（全局配置，供项目挂载）。 */
export interface CommonParamSet {
    id: string;
    name: string;
    params: ParamItem[];
}

/** common-params.json 文件结构。 */
export interface CommonParamSetFile {
    sets: CommonParamSet[];
}
