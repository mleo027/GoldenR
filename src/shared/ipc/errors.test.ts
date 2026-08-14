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
