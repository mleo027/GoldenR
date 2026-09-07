import { createIpcErrorPayload, serializeIpcError } from '../../src/shared/ipc/errors';
import { assertTrustedRenderer } from './security';

type IpcHandler<TArgs extends unknown[], TResult> = (...args: TArgs) => TResult | Promise<TResult>;

export function withIpcError<TArgs extends unknown[], TResult>(
    handler: IpcHandler<TArgs, TResult>,
): (...args: TArgs) => Promise<TResult> {
    return async (...args: TArgs) => {
        try {
            assertTrustedRenderer(args[0] as Parameters<typeof assertTrustedRenderer>[0]);
            return await handler(...args);
        } catch (error) {
            throw serializeIpcError(createIpcErrorPayload(error));
        }
    };
}

export function withIpcEvent<TArgs extends unknown[]>(
    handler: (...args: TArgs) => void,
): (...args: TArgs) => void {
    return (...args) => {
        try {
            assertTrustedRenderer(args[0] as Parameters<typeof assertTrustedRenderer>[0]);
            handler(...args);
        } catch (error) {
            console.error(serializeIpcError(createIpcErrorPayload(error)));
        }
    };
}
