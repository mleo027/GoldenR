/* @vitest-environment jsdom */
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentEventPayload } from '@/shared/electron/api';
import { useAutomationStore } from '../store/automationStore';
import { useAgentStore } from '../store/agentStore';
import AutomationAgentPanel from './AutomationAgentPanel';

const listeners: Array<(payload: AgentEventPayload) => void> = [];
const send = vi.fn(async () => ({ runId: 'run-1' }));

function installBridge() {
    Object.assign(window, {
        electronAPI: {
            config: {
                readApiDebugEnvironments: async () => ({
                    kcxpEnvironments: [
                        { id: 'e1', name: '开发环境', environmentType: 'development' },
                    ],
                }),
            },
            automation: { saveWorkspace: async () => undefined },
            agent: {
                status: async () => ({ state: 'ready', agentVersion: 'test-1' }),
                start: async () => ({ state: 'ready' }),
                stop: async () => undefined,
                send,
                cancel: async () => undefined,
                submitToolResult: async () => undefined,
                onEvent: (callback: (payload: AgentEventPayload) => void) => {
                    listeners.push(callback);
                    // 必须模拟真实退订语义，否则 effect 重跑会重复投递事件。
                    return () => {
                        const index = listeners.indexOf(callback);
                        if (index >= 0) listeners.splice(index, 1);
                    };
                },
                readGatewayConfig: async () => ({
                    baseUrl: 'https://gw.example/v1',
                    model: 'test-model',
                    hasApiKey: true,
                }),
                writeGatewayConfig: async () => ({
                    baseUrl: 'https://gw.example/v1',
                    model: 'test-model',
                    hasApiKey: true,
                }),
            },
        },
    });
}

function seedWorkspace() {
    const stamp = Date.now();
    useAutomationStore.setState({
        loaded: true,
        selectedScenarioId: 's1',
        workspace: {
            projects: [{ id: 'p1', name: '项目', position: 0, createdAt: stamp, updatedAt: stamp }],
            folders: [],
            scenarios: [
                {
                    id: 's1',
                    projectId: 'p1',
                    name: '查询余额',
                    script: 'scenario();',
                    position: 0,
                    enabled: true,
                    createdAt: stamp,
                    updatedAt: stamp,
                },
            ],
        },
    });
}

describe('AutomationAgentPanel（右侧 Agent 侧边栏）', () => {
    beforeEach(() => {
        listeners.length = 0;
        send.mockClear();
        installBridge();
        seedWorkspace();
        useAgentStore.getState().reset();
        useAgentStore.getState().setStatus({ state: 'stopped' });
    });

    // 未开启 globals，RTL 不会自动清理，多个用例的 DOM 会互相干扰。
    afterEach(() => {
        cleanup();
    });

    it('显示 Agent 状态并允许发送自然语言指令', async () => {
        render(
            <App>
                <AutomationAgentPanel />
            </App>,
        );

        await waitFor(() => expect(screen.getByText('就绪')).toBeTruthy());

        const composer = screen.getByPlaceholderText(/用自然语言描述/);
        await userEvent.type(composer, '给场景加一个断言');
        await userEvent.click(screen.getByRole('button', { name: /发送/ }));

        await waitFor(() =>
            expect(send).toHaveBeenCalledWith({
                instruction: '给场景加一个断言',
                scenarioId: 's1',
            }),
        );
    });

    it('收到脚本提案后展示 diff，应用后写入场景', async () => {
        render(
            <App>
                <AutomationAgentPanel />
            </App>,
        );

        await waitFor(() => expect(listeners.length).toBeGreaterThan(0));

        act(() => {
            listeners[0]({
                runId: 'run-1',
                event: {
                    type: 'script.proposed',
                    scenarioId: 's1',
                    script: 'scenario({ inputs: {} }, async (t) => t.log("新脚本"));',
                    summary: '补充断言',
                },
            });
        });

        await waitFor(() => expect(screen.getByText('脚本改动')).toBeTruthy());
        expect(screen.getByText('补充断言')).toBeTruthy();

        await userEvent.click(screen.getByRole('button', { name: /^应\s*用$/ }));

        await waitFor(() =>
            expect(useAutomationStore.getState().workspace.scenarios[0].script).toBe(
                'scenario({ inputs: {} }, async (t) => t.log("新脚本"));',
            ),
        );
    });

    it('回滚可以恢复提案前的脚本', async () => {
        render(
            <App>
                <AutomationAgentPanel />
            </App>,
        );

        await waitFor(() => expect(listeners.length).toBeGreaterThan(0));

        act(() => {
            listeners[0]({
                runId: 'run-1',
                event: {
                    type: 'script.proposed',
                    scenarioId: 's1',
                    script: 'scenario({ inputs: {} });',
                    summary: '改动',
                },
            });
        });

        await waitFor(() => expect(screen.getByText('脚本改动')).toBeTruthy());
        await userEvent.click(screen.getByRole('button', { name: /^应\s*用$/ }));
        await waitFor(() =>
            expect(useAutomationStore.getState().workspace.scenarios[0].script).toBe(
                'scenario({ inputs: {} });',
            ),
        );

        await userEvent.click(screen.getByRole('button', { name: /^回\s*滚$/ }));
        await waitFor(() =>
            expect(useAutomationStore.getState().workspace.scenarios[0].script).toBe('scenario();'),
        );
    });
});
