import { createIpcErrorPayload, serializeIpcError } from '../../src/shared/ipc/errors';

type IpcHandler<TArgs extends unknown[], TResult> = (...args: TArgs) => TResult | Promise<TResult>;

export function withIpcError<TArgs extends unknown[], TResult>(
    handler: IpcHandler<TArgs, TResult>,
): (...args: TArgs) => Promise<TResult> {
    return async (...args: TArgs) => {
        try {
            return await handler(...args);
        } catch (error) {
            throw serializeIpcError(createIpcErrorPayload(error));
        }
    };
}
