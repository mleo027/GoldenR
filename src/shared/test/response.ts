export interface ResponseData {
    code: string | number;
    message: string;
    level?: string | number;
    data: Record<string, unknown>[];
    calledAt?: number;
    stats?: {
        timecost: number;
        rows: number;
    };
}
