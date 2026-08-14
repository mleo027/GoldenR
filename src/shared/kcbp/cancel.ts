export const KCBP_CANCELLED_MESSAGE = 'CALL_CANCELLED';

/** IPC 成功返回的取消标记，避免 ipcMain.handle reject 触发 Electron 错误日志 */
export const KCBP_IPC_CANCELLED_RESULT = {
    __kcbpCancelled: true as const,
};

export function isKcbpIpcCancelledResult(
    value: unknown,
): value is typeof KCBP_IPC_CANCELLED_RESULT {
    return (
        typeof value === 'object' &&
        value !== null &&
        '__kcbpCancelled' in value &&
        (value as { __kcbpCancelled?: boolean }).__kcbpCancelled === true
    );
}

export function isKcbpCancelled(error: unknown): boolean {
    return error instanceof Error && error.message === KCBP_CANCELLED_MESSAGE;
}
