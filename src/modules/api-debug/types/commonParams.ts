import type { ParamItem } from './workspace';

/** 一套命名的公共参数集（全局配置，供项目设置使用）。 */
export interface CommonParamSet {
    id: string;
    name: string;
    params: ParamItem[];
}

/** common_param_sets/common_params 表的传输结构。 */
export interface CommonParamSetFile {
    sets: CommonParamSet[];
}
