import { app, BrowserWindow, ipcMain } from 'electron';
import type { AgentGatewayConfigInput } from '../../src/shared/agent/gateway';
import type {
    AgentCreateRunRequest,
    AgentToolResultRequest,
} from '../../src/shared/agent/protocol';
import { invalidIpcArgument } from '../../src/shared/ipc/errors';
import { readAgentGatewayConfig, writeAgentGatewayConfig } from '../services/agent/agentGateway';
import { AgentService } from '../services/agent/agentService';
import { withIpcError } from './errors';
import type { ElectronAppContext } from './types';

let service: AgentService | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function optionalString(value: unknown): value is string | undefined {
    return value === undefined || typeof value === 'string';
}

function isCreateRunRequest(value: unknown): value is AgentCreateRunRequest {
    return (
        isRecord(value) &&
        typeof value.instruction === 'string' &&
        Boolean(value.instruction.trim()) &&
        optionalString(value.scenarioId) &&
        optionalString(value.projectId) &&
        optionalString(value.folderId)
    );
}

function isToolResult(value: unknown): value is AgentToolResultRequest {
    return isRecord(value) && typeof value.toolCallId === 'string' && typeof value.ok === 'boolean';
}

function isGatewayInput(value: unknown): value is AgentGatewayConfigInput {
    return (
        isRecord(value) &&
        typeof value.baseUrl === 'string' &&
        typeof value.model === 'string' &&
        optionalString(value.apiKey)
    );
}

/** 广播 sidecar 事件；本应用只有一个主窗口，直接广播即可。 */
function broadcast(payload: unknown): void {
    for (const window of BrowserWindow.getAllWindows()) {
        window.webContents.send('agent:event', payload);
    }
}

export function registerAgentIpc(ctx: ElectronAppContext): void {
    service = new AgentService(ctx);
    service.setEventSink(broadcast);

    ipcMain.handle(
        'agent:status',
        withIpcError(() => service?.getStatus() ?? { state: 'stopped' }),
    );
    ipcMain.handle(
        'agent:start',
        withIpcError(() => service?.start() ?? { state: 'stopped' }),
    );
    ipcMain.handle(
        'agent:stop',
        withIpcError(() => {
            service?.stop();
        }),
    );
    ipcMain.handle(
        'agent:send',
        withIpcError((_event, value: unknown) => {
            if (!isCreateRunRequest(value)) throw invalidIpcArgument('Invalid agent run request');
            return service!.send(value);
        }),
    );
    ipcMain.handle(
        'agent:cancel',
        withIpcError((_event, runId: unknown) => {
            if (typeof runId !== 'string' || !runId) throw invalidIpcArgument('Invalid run id');
            return service!.cancel(runId);
        }),
    );
    ipcMain.handle(
        'agent:toolResult',
        withIpcError((_event, runId: unknown, result: unknown) => {
            if (typeof runId !== 'string' || !runId) throw invalidIpcArgument('Invalid run id');
            if (!isToolResult(result)) throw invalidIpcArgument('Invalid tool result');
            return service!.submitToolResult(runId, result);
        }),
    );
    ipcMain.handle(
        'agent:readGatewayConfig',
        withIpcError(() => readAgentGatewayConfig(ctx)),
    );
    ipcMain.handle(
        'agent:writeGatewayConfig',
        withIpcError((_event, value: unknown) => {
            if (!isGatewayInput(value)) throw invalidIpcArgument('Invalid gateway config');
            const config = writeAgentGatewayConfig(ctx, value);
            // 网关配置在启动时经环境变量注入，变更后需要重启 sidecar 才生效。
            service?.restart();
            return config;
        }),
    );

    app.on('will-quit', () => service?.stop());
}
