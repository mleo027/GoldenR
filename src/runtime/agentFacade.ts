import { requireElectronAPI } from '@/lib/electron';

/**
 * Agent 的渲染进程门面。
 *
 * 与其它 runtime facade 一致：渲染层只能经这里访问 Electron 桥，
 * 不直接引用全局桥对象。
 */
export const agentRuntime = {
    status: () => requireElectronAPI().agent.status(),
    start: () => requireElectronAPI().agent.start(),
    stop: () => requireElectronAPI().agent.stop(),
    send: (request: Parameters<ReturnType<typeof requireElectronAPI>['agent']['send']>[0]) =>
        requireElectronAPI().agent.send(request),
    cancel: (runId: string) => requireElectronAPI().agent.cancel(runId),
    submitToolResult: (
        runId: string,
        result: Parameters<ReturnType<typeof requireElectronAPI>['agent']['submitToolResult']>[1],
    ) => requireElectronAPI().agent.submitToolResult(runId, result),
    onEvent: (callback: Parameters<ReturnType<typeof requireElectronAPI>['agent']['onEvent']>[0]) =>
        requireElectronAPI().agent.onEvent(callback),
    readGatewayConfig: () => requireElectronAPI().agent.readGatewayConfig(),
    writeGatewayConfig: (
        input: Parameters<ReturnType<typeof requireElectronAPI>['agent']['writeGatewayConfig']>[0],
    ) => requireElectronAPI().agent.writeGatewayConfig(input),
};
