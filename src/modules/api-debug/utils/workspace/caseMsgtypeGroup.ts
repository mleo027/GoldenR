import type { VisibleCaseItem } from '../../hooks/useVisibleProjects';
import { getMsgtypeGroupLabel, getMsgtypeGroupTitle } from '../../constants/msgtypeGroupLabels';
import { getCaseMsgtype } from './caseLabel';

export const CASE_MSGTYPE_GROUP_THRESHOLD = 30;
export const CASE_MSGTYPE_GROUP_DIGITS = 4;

export interface CaseMsgtypeGroup {
    key: string;
    label: string;
    title: string;
    cases: VisibleCaseItem[];
}

export function getMsgtypeGroupKey(msgtype: string, digits = CASE_MSGTYPE_GROUP_DIGITS): string {
    const numeric = msgtype.replace(/\D/g, '');
    if (numeric.length >= digits) {
        return numeric.slice(0, digits);
    }
    const trimmed = msgtype.trim();
    if (trimmed) return trimmed;
    return 'other';
}

export function groupCasesByMsgtypePrefix(
    cases: VisibleCaseItem[],
    digits = CASE_MSGTYPE_GROUP_DIGITS,
): CaseMsgtypeGroup[] {
    const buckets = new Map<string, VisibleCaseItem[]>();

    for (const item of cases) {
        const key = getMsgtypeGroupKey(getCaseMsgtype(item.caseItem), digits);
        const group = buckets.get(key) ?? [];
        group.push(item);
        buckets.set(key, group);
    }

    return [...buckets.entries()]
        .sort(([left], [right]) => left.localeCompare(right, 'zh-CN', { numeric: true }))
        .map(([key, groupCases]) => ({
            key,
            label: getMsgtypeGroupLabel(key),
            title: getMsgtypeGroupTitle(key),
            cases: groupCases,
        }));
}

export function shouldGroupCasesByMsgtype(caseCount: number, searchKeyword: string): boolean {
    return !searchKeyword.trim() && caseCount >= CASE_MSGTYPE_GROUP_THRESHOLD;
}

export function buildCaseGroupStorageKey(projectIndex: number, groupKey: string): string {
    return `${projectIndex}:${groupKey}`;
}

export function resolveActiveCaseGroupKey(
    projectIndex: number,
    activeCaseIndex: number,
    cases: VisibleCaseItem[],
): string | null {
    const active = cases.find((item) => item.caseIndex === activeCaseIndex);
    if (!active) return null;
    const groupKey = groupCasesByMsgtypePrefix([active])[0]?.key;
    if (!groupKey) return null;
    return buildCaseGroupStorageKey(projectIndex, groupKey);
}
