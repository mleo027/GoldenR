import type { ParamItem, ProjectData, TabData } from '../../types/workspace';
import { createEmptyCase } from '../../constants/workspace';
import { createParamItem } from '../workspace/paramItem';
import {
    DEFAULT_KCBP_QUEUE,
    DEFAULT_KCBP_TIMEOUT,
    parseKcbpAddress,
    serializeKcbpAddress,
} from '../kcbp/kcbpAddress';

export interface KuabImportReqField {
    tag_dest?: string;
    type?: string;
    default_val?: string;
}

export interface KuabImportRecord {
    msgtype_src?: string;
    msgtype_dest?: string;
    remark?: string;
    req?: KuabImportReqField[];
}

export function resolveKuabMsgtype(record: KuabImportRecord): string {
    const src = String(record.msgtype_src ?? '').trim();
    if (src) {
        const dotIndex = src.indexOf('.');
        if (dotIndex > 0) {
            return src.slice(dotIndex + 1).trim();
        }
        return src;
    }
    return String(record.msgtype_dest ?? '').trim();
}

export function getProjectHostTemplate(project: ProjectData): string {
    for (const caseItem of project.cases) {
        const { host } = parseKcbpAddress(caseItem.address);
        if (host) return host;
    }
    return '';
}

function mapReqToParams(req: KuabImportReqField[] | undefined): ParamItem[] {
    if (!req?.length) return [];

    const params: ParamItem[] = [];
    for (const item of req) {
        const name = String(item.tag_dest ?? '').trim();
        if (!name) continue;
        params.push(createParamItem(name, String(item.default_val ?? '').trim()));
    }
    return params;
}

export function createCaseFromKuabRecord(
    record: KuabImportRecord,
    hostTemplate: string,
    index: number,
): TabData | null {
    const msgtype = resolveKuabMsgtype(record);
    if (!msgtype) return null;

    const remark = String(record.remark ?? '').trim();
    const base = createEmptyCase(index + 1);

    return {
        ...base,
        name: remark || `接口 ${index + 1}`,
        protocol: 'KCBP',
        address: serializeKcbpAddress({
            host: hostTemplate,
            msgtype,
            queue: DEFAULT_KCBP_QUEUE,
            timeout: DEFAULT_KCBP_TIMEOUT,
        }),
        params: mapReqToParams(record.req),
    };
}

export function parseKuabImportJson(data: unknown, hostTemplate = ''): TabData[] {
    const records = normalizeKuabRecords(data);
    const cases: TabData[] = [];

    records.forEach((record, index) => {
        const caseItem = createCaseFromKuabRecord(record, hostTemplate, index);
        if (caseItem) cases.push(caseItem);
    });

    return cases;
}

function normalizeKuabRecords(data: unknown): KuabImportRecord[] {
    if (Array.isArray(data)) {
        return data as KuabImportRecord[];
    }
    if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
        return (data as { data: KuabImportRecord[] }).data;
    }
    return [];
}
