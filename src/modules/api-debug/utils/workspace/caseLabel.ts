import type { TabData } from '../../types/workspace';
import {
    matchesCaseSearchQuery,
    matchesProjectSearchQuery,
    parseCaseSearchQuery,
} from './caseSearch';

export function parseMsgtypeFromAddress(address: string): string {
    const trimmed = address.trim();
    if (!trimmed) return '';

    const slashIndex = trimmed.indexOf('/');
    if (slashIndex === -1) return '';

    return trimmed
        .slice(slashIndex + 1)
        .split('?')[0]
        .trim();
}

/** @deprecated use parseMsgtypeFromAddress */
export const parseFuncIdFromAddress = parseMsgtypeFromAddress;

const FUNC_ID_PARAM_KEYS = new Set(['funcid', 'g_funcid']);

export function resolveMsgtypeFromParams(params: TabData['params']): string {
    const valuesByKey = new Map<string, string>();

    for (const param of params) {
        if (param.type === 'disabled') continue;

        const key = param.name.trim().toLowerCase();
        if (!FUNC_ID_PARAM_KEYS.has(key) || valuesByKey.has(key)) continue;
        valuesByKey.set(key, param.value.trim());
    }

    return valuesByKey.get('g_funcid') || valuesByKey.get('funcid') || '';
}

export function getDefaultCaseName(index: number): string {
    return `接口 ${index + 1}`;
}

function resolveCaseMsgtype(tab: TabData): string {
    const fromAddress = parseMsgtypeFromAddress(tab.address);
    if (fromAddress) return fromAddress;
    return resolveMsgtypeFromParams(tab.params);
}

export function getCaseMsgtype(tab: TabData): string {
    return resolveCaseMsgtype(tab);
}

function compareMsgtypeValue(left: string, right: string): number {
    const aNum = Number(left);
    const bNum = Number(right);
    if (left && right && !Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return aNum - bNum;
    }
    return left.localeCompare(right, 'zh-CN', { numeric: true });
}

/** 收藏优先，其次按 msgtype 排序 */
export function compareCasesByMsgtype(left: TabData, right: TabData): number {
    const leftFavorite = left.favorite ? 1 : 0;
    const rightFavorite = right.favorite ? 1 : 0;
    if (leftFavorite !== rightFavorite) return rightFavorite - leftFavorite;

    const msgtypeCompare = compareMsgtypeValue(getCaseMsgtype(left), getCaseMsgtype(right));
    if (msgtypeCompare !== 0) return msgtypeCompare;

    return left.name.localeCompare(right.name, 'zh-CN', { numeric: true });
}

export function sortCasesByMsgtype(cases: TabData[]): TabData[] {
    return [...cases].sort(compareCasesByMsgtype);
}

function getFuncIdParam(params: TabData['params']): string {
    return resolveMsgtypeFromParams(params);
}

/** 仅当 favorite / name / msgtype 相关字段变化时需要重新排序 */
export function shouldResortCasesForUpdate(
    updates: Partial<TabData>,
    currentCase: TabData,
): boolean {
    if ('favorite' in updates && updates.favorite !== currentCase.favorite) {
        return true;
    }
    if ('name' in updates && updates.name !== currentCase.name) {
        return true;
    }
    if ('address' in updates && updates.address !== currentCase.address) {
        return true;
    }
    if ('params' in updates && updates.params) {
        const addressMsgtype = parseMsgtypeFromAddress(currentCase.address);
        if (!addressMsgtype) {
            return getFuncIdParam(updates.params) !== getFuncIdParam(currentCase.params);
        }
    }
    return false;
}

export function resolveCaseIndexById(cases: TabData[], caseId: string): number {
    const index = cases.findIndex((item) => item.id === caseId);
    return index >= 0 ? index : 0;
}

/** 展示用标题：Msgtype + 用户命名的接口名，如 150511:查询最大可委托数 */
export function getCaseLabel(tab: TabData, index: number): string {
    const msgtype = resolveCaseMsgtype(tab);
    const name = tab.name.trim() || getDefaultCaseName(index);

    if (!msgtype) return name;

    const prefix = `${msgtype}:`;
    if (name.startsWith(prefix)) return name;

    return `${msgtype}:${name}`;
}

/** 拆分展示：功能号 + 接口名 */
export function getCaseDisplayParts(
    tab: TabData,
    index: number,
): { msgtype: string; name: string } {
    const msgtype = resolveCaseMsgtype(tab);
    const rawName = tab.name.trim() || getDefaultCaseName(index);

    if (!msgtype) {
        return { msgtype: '', name: rawName };
    }

    const prefix = `${msgtype}:`;
    const name = rawName.startsWith(prefix) ? rawName.slice(prefix.length) : rawName;

    return { msgtype, name };
}

export function getCaseSearchText(tab: TabData, index: number): string {
    return [
        tab.name,
        tab.address,
        tab.protocol,
        getCaseLabel(tab, index),
        parseMsgtypeFromAddress(tab.address),
        tab.params.find((p) => p.name.trim() === 'g_funcid')?.value,
        ...tab.params.flatMap((param) => [param.name, param.value]),
    ]
        .filter((part) => part != null && String(part).trim())
        .join(' ')
        .toLowerCase();
}

export function matchesCaseSearch(tab: TabData, index: number, keyword: string): boolean {
    return matchesCaseSearchQuery(tab, index, parseCaseSearchQuery(keyword));
}

export function matchesProjectSearch(
    projectName: string,
    cases: TabData[],
    keyword: string,
): boolean {
    return matchesProjectSearchQuery(projectName, cases, keyword);
}
