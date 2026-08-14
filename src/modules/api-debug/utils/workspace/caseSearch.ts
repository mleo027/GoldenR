import type { TabData } from '../../types/workspace';
import { getCaseMsgtype, getCaseSearchText } from './caseLabel';

export type CaseSearchMode = 'contains' | 'msgtype-prefix' | 'project-only';

export interface ParsedCaseSearchQuery {
    raw: string;
    mode: CaseSearchMode;
    term: string;
}

export type { TextHighlightPart } from '@/shared/utils/textHighlight';
export { splitTextHighlight } from '@/shared/utils/textHighlight';

export function parseCaseSearchQuery(keyword: string): ParsedCaseSearchQuery {
    const raw = keyword.trim();
    if (!raw) {
        return { raw: '', mode: 'contains', term: '' };
    }

    if (raw.endsWith('*')) {
        const term = raw.slice(0, -1).trim().toLowerCase();
        if (term && /^\d+$/.test(term)) {
            return { raw, mode: 'msgtype-prefix', term };
        }
    }

    const projectPrefix = raw.match(/^(?:项目|project)\s*[:：]\s*(.+)$/i);
    if (projectPrefix) {
        return {
            raw,
            mode: 'project-only',
            term: projectPrefix[1].trim().toLowerCase(),
        };
    }

    return { raw, mode: 'contains', term: raw.toLowerCase() };
}

export function matchesCaseSearchQuery(
    tab: TabData,
    index: number,
    query: ParsedCaseSearchQuery,
): boolean {
    if (!query.term) return true;

    if (query.mode === 'msgtype-prefix') {
        return getCaseMsgtype(tab).toLowerCase().startsWith(query.term);
    }

    return getCaseSearchText(tab, index).includes(query.term);
}

export function matchesProjectSearchQuery(
    projectName: string,
    cases: TabData[],
    keyword: string,
): boolean {
    const query = parseCaseSearchQuery(keyword);
    if (!query.term) return true;

    if (query.mode === 'project-only') {
        return projectName.toLowerCase().includes(query.term);
    }

    if (projectName.toLowerCase().includes(query.term)) {
        return true;
    }

    return cases.some((caseItem, index) => matchesCaseSearchQuery(caseItem, index, query));
}

export function getCaseSearchHighlightTerm(query: ParsedCaseSearchQuery): string {
    if (!query.term) return '';
    if (query.mode === 'project-only') return '';
    return query.term;
}

export function isCaseSearchActive(keyword: string): boolean {
    return keyword.trim().length > 0;
}
