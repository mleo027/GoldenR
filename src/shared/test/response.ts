export interface ResponseData {
    code: string | number;
    message: string;
    data: Record<string, unknown>[];
    calledAt?: number;
    stats?: {
        timecost: number;
        rows: number;
    };
}
