export type IpcErrorCode =
    | 'INVALID_ARGUMENT'
    | 'INVALID_CONFIG_FILE'
    | 'BATCH_TOO_LARGE'
    | 'INTERNAL_ERROR';

export interface IpcErrorPayload {
    code: IpcErrorCode;
    message: string;
}

export const IPC_ERROR_PREFIX = 'IPC_ERROR:';

export class IpcError extends Error {
    readonly code: IpcErrorCode;

    constructor(code: IpcErrorCode, message: string) {
        super(message);
        this.name = 'IpcError';
        this.code = code;
    }
}

export function invalidIpcArgument(message: string): IpcError {
    return new IpcError('INVALID_ARGUMENT', message);
}

export function createIpcErrorPayload(
    error: unknown,
    fallbackMessage = 'IPC call failed',
): IpcErrorPayload {
    if (error instanceof IpcError) {
        return { code: error.code, message: error.message };
    }
    const parsed = parseIpcError(error);
    if (parsed) return parsed;
    return {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : String(error ?? fallbackMessage),
    };
}

export function serializeIpcError(payload: IpcErrorPayload): Error {
    return new Error(`${IPC_ERROR_PREFIX}${JSON.stringify(payload)}`);
}

export function parseIpcError(error: unknown): IpcErrorPayload | null {
    if (!(error instanceof Error) || !error.message.startsWith(IPC_ERROR_PREFIX)) {
        return null;
    }
    try {
        const payload = JSON.parse(error.message.slice(IPC_ERROR_PREFIX.length)) as unknown;
        if (
            payload &&
            typeof payload === 'object' &&
            typeof (payload as IpcErrorPayload).code === 'string' &&
            typeof (payload as IpcErrorPayload).message === 'string'
        ) {
            return payload as IpcErrorPayload;
        }
    } catch {
        return null;
    }
    return null;
}
