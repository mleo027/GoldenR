import { describe, expect, it } from 'vitest';
import { IpcError, createIpcErrorPayload, parseIpcError, serializeIpcError } from './errors';

describe('IPC error protocol', () => {
    it('serializes and parses a typed error payload', () => {
        const serialized = serializeIpcError({ code: 'INVALID_ARGUMENT', message: 'bad request' });
        expect(parseIpcError(serialized)).toEqual({
            code: 'INVALID_ARGUMENT',
            message: 'bad request',
        });
    });

    it('parses a typed payload wrapped by ipcRenderer.invoke', () => {
        const wrapped = new Error(
            `Error invoking remote method 'readJsonFile': Error: IPC_ERROR:${JSON.stringify({
                code: 'INVALID_ARGUMENT',
                message: 'bad request',
            })} (wrapped)`,
        );

        expect(parseIpcError(wrapped)).toEqual({
            code: 'INVALID_ARGUMENT',
            message: 'bad request',
        });
    });

    it('stops at the matching closing brace when message text contains braces', () => {
        const wrapped = new Error(
            `IPC_ERROR:${JSON.stringify({
                code: 'INVALID_ARGUMENT',
                message: 'missing } brace',
            })} (wrapped)`,
        );

        expect(parseIpcError(wrapped)).toEqual({
            code: 'INVALID_ARGUMENT',
            message: 'missing } brace',
        });
    });

    it('parses the JSON payload before arbitrary trailing text', () => {
        const wrapped = new Error(
            `IPC_ERROR:${JSON.stringify({
                code: 'INVALID_ARGUMENT',
                message: 'ok',
            })} more error details`,
        );

        expect(parseIpcError(wrapped)).toEqual({
            code: 'INVALID_ARGUMENT',
            message: 'ok',
        });
    });

    it('returns null for malformed or non-typed payloads', () => {
        expect(
            parseIpcError(new Error('IPC_ERROR:{code:"INVALID_ARGUMENT",message:1}')),
        ).toBeNull();
        expect(parseIpcError(new Error('IPC_ERROR:{not-json}'))).toBeNull();
        expect(parseIpcError(new Error('IPC_ERROR:'))).toBeNull();
        expect(parseIpcError('IPC_ERROR:{}')).toBeNull();
    });

    it('preserves IpcError code and message', () => {
        expect(createIpcErrorPayload(new IpcError('INVALID_CONFIG_FILE', 'unknown file'))).toEqual({
            code: 'INVALID_CONFIG_FILE',
            message: 'unknown file',
        });
    });

    it('falls back to an internal error for unknown failures', () => {
        expect(createIpcErrorPayload('boom')).toEqual({
            code: 'INTERNAL_ERROR',
            message: 'boom',
        });
    });
});
