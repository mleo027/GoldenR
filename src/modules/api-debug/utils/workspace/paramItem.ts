import type { ParamFieldType, ParamItem } from '../../types/workspace';

const PARAM_FIELD_TYPES: ParamFieldType[] = ['string', 'file', 'disabled'];

export function isParamEnabled(type: ParamFieldType | string | undefined): boolean {
    return type !== 'disabled';
}

/** 规范化入参 type：KUAB 的 SQL 类型等非标准值一律视为已启用的 string */
export function normalizeParamItem(param: ParamItem): ParamItem {
    const name = String(param.name ?? '');
    const value = String(param.value ?? '');

    if (param.type === 'file') {
        return { name, value, type: 'file' };
    }
    if (param.type === 'disabled') {
        return { name, value, type: 'disabled' };
    }
    return { name, value, type: 'string' };
}

export function normalizeParamList(params: ParamItem[]): ParamItem[] {
    return params.map(normalizeParamItem);
}

export function isValidParamFieldType(value: unknown): value is ParamFieldType {
    return typeof value === 'string' && PARAM_FIELD_TYPES.includes(value as ParamFieldType);
}

/** 新建 / 导入入参：默认勾选启用 */
export function createParamItem(name: string, value = ''): ParamItem {
    return { name, value, type: 'string' };
}
