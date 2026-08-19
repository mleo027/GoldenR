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

function findJsonEnd(message: string, jsonStart: number): number {
    let depth = 0;
    let inString = false;
    let escaped = false;
    let jsonEnd = -1;
    for (let index = jsonStart; index < message.length; index += 1) {
        const char = message[index];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === '"') {
                inString = false;
            }
        } else if (char === '"') {
            inString = true;
        } else if (char === '{') {
            depth += 1;
        } else if (char === '}') {
            depth -= 1;
            if (depth === 0) {
                jsonEnd = index;
                break;
            }
        }
    }
    return jsonEnd;
}

function isIpcErrorPayload(value: unknown): value is IpcErrorPayload {
    return Boolean(
        value &&
        typeof value === 'object' &&
        typeof (value as IpcErrorPayload).code === 'string' &&
        typeof (value as IpcErrorPayload).message === 'string',
    );
}

export function parseIpcError(error: unknown): IpcErrorPayload | null {
    if (!(error instanceof Error)) return null;

    const prefixIndex = error.message.indexOf(IPC_ERROR_PREFIX);
    if (prefixIndex === -1) return null;

    const jsonStart = error.message.indexOf('{', prefixIndex + IPC_ERROR_PREFIX.length);
    if (jsonStart === -1) return null;

    const jsonEnd = findJsonEnd(error.message, jsonStart);
    if (jsonEnd === -1) return null;

    try {
        const payload = JSON.parse(error.message.slice(jsonStart, jsonEnd + 1)) as unknown;
        return isIpcErrorPayload(payload) ? payload : null;
    } catch {
        return null;
    }
}
