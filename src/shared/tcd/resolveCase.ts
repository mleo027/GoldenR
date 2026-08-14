import type { TcdCaseRef, TcdCaseTab, TcdProjectSnapshot } from './types';

export interface TcdCaseIndex {
    byId: Map<string, TcdCaseTab>;
    byMsgtype: Map<string, TcdCaseTab[]>;
}

export function buildCaseIndex(projects: TcdProjectSnapshot[]): TcdCaseIndex {
    const byId = new Map<string, TcdCaseTab>();
    const byMsgtype = new Map<string, TcdCaseTab[]>();

    for (const project of projects) {
        for (const caseItem of project.cases) {
            byId.set(caseItem.id, caseItem);
            const msgtype = extractMsgtype(caseItem);
            if (!msgtype) continue;
            const list = byMsgtype.get(msgtype) ?? [];
            list.push(caseItem);
            byMsgtype.set(msgtype, list);
        }
    }

    return { byId, byMsgtype };
}

function extractMsgtype(tab: TcdCaseTab): string {
    const trimmed = tab.address.trim();
    const slashIndex = trimmed.indexOf('/');
    if (slashIndex !== -1) {
        return trimmed
            .slice(slashIndex + 1)
            .split('?')[0]
            .trim();
    }
    const fromParam = tab.params.find((param) => param.name.trim() === 'g_funcid')?.value.trim();
    return fromParam || tab.name.trim();
}

export function resolveCaseRef(ref: string, index: TcdCaseIndex): TcdCaseTab {
    const trimmed = ref.trim();
    if (!trimmed) {
        throw new Error('flow.runCase 引用不能为空');
    }

    const byId = index.byId.get(trimmed);
    if (byId) return byId;

    const byMsgtype = index.byMsgtype.get(trimmed);
    if (!byMsgtype?.length) {
        throw new Error(`未找到用例：${trimmed}（支持 caseId 或 msgtype）`);
    }
    if (byMsgtype.length > 1) {
        throw new Error(`msgtype "${trimmed}" 对应 ${byMsgtype.length} 个用例，请使用 caseId 区分`);
    }

    return byMsgtype[0];
}

export function toCaseRef(tab: TcdCaseTab, label?: string): TcdCaseRef {
    return {
        caseId: tab.id,
        label: label ?? tab.name,
        msgtype: extractMsgtype(tab),
    };
}

export function cloneCaseTab(tab: TcdCaseTab): TcdCaseTab {
    return {
        ...tab,
        params: tab.params.map((item) => ({ ...item })),
        runInput: tab.runInput ? { ...tab.runInput } : undefined,
    };
}
