/**
 * 参数列表结构相等比较（共享纯函数）。
 *
 * 使用结构化最小类型，避免 shared 依赖业务模块的 ParamItem 定义；
 * hooks 与 api-debug utils 均可复用以消除跨层依赖。
 */
export interface ComparableParam {
    name: string;
    value: string;
    type: string;
}

export function paramsEqual(left: ComparableParam[], right: ComparableParam[]): boolean {
    if (left.length !== right.length) return false;
    return left.every(
        (item, index) =>
            item.name === right[index].name &&
            item.value === right[index].value &&
            item.type === right[index].type,
    );
}
