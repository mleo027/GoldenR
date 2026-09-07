import type { CommonParamSet } from '../../types/commonParams';
import type { ParamItem } from '../../types/workspace';

/**
 * 合并公共参数与 case 参数：公共在前、case 在后，同名时 case 覆盖。
 * 纯函数，不修改入参数组。
 */
export function mergeCommonParams(
    common: readonly ParamItem[],
    caseParams: readonly ParamItem[],
): ParamItem[] {
    const caseNames = new Set(caseParams.map((param) => param.name));
    const effectiveCommon = common.filter((param) => !caseNames.has(param.name));
    return [...effectiveCommon, ...caseParams];
}

/** 剔除与公共参数同名且同值的行（用于载入历史时避免公共参数复制进 case）。 */
export function stripMountedCommonParams(
    params: readonly ParamItem[],
    common: readonly ParamItem[],
): ParamItem[] {
    if (common.length === 0) return [...params];
    const commonKeys = new Set(common.map((param) => `${param.name}\u0000${param.value}`));
    return params.filter((param) => !commonKeys.has(`${param.name}\u0000${param.value}`));
}

/** 按挂载 id 解析公共参数；id 为空或集合不存在时返回空数组（未挂载零开销）。 */
export function resolveCommonParamsById(
    sets: readonly CommonParamSet[],
    setId: string | undefined,
): ParamItem[] {
    if (!setId) return [];
    return sets.find((set) => set.id === setId)?.params ?? [];
}
