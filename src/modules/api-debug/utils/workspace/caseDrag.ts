export const CASE_DRAG_MIME = 'application/x-golden-api-case';

export interface CaseDragPayload {
    fromProjectIndex: number;
    fromCaseIndex: number;
    caseId: string;
}

export function writeCaseDragData(dataTransfer: DataTransfer, payload: CaseDragPayload): void {
    dataTransfer.effectAllowed = 'move';
    dataTransfer.setData(CASE_DRAG_MIME, JSON.stringify(payload));
    dataTransfer.setData('text/plain', payload.caseId);
}

export function readCaseDragData(dataTransfer: DataTransfer): CaseDragPayload | null {
    const raw = dataTransfer.getData(CASE_DRAG_MIME);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as CaseDragPayload;
        if (
            typeof parsed.fromProjectIndex === 'number' &&
            typeof parsed.fromCaseIndex === 'number' &&
            typeof parsed.caseId === 'string'
        ) {
            return parsed;
        }
    } catch {
        return null;
    }

    return null;
}

export function isCaseDragEvent(dataTransfer: DataTransfer | null): boolean {
    if (!dataTransfer) return false;
    return Array.from(dataTransfer.types).includes(CASE_DRAG_MIME);
}
