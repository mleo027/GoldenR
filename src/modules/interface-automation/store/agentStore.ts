import { create } from 'zustand';
import type { AgentGatewayConfig } from '@/shared/agent/gateway';
import { EMPTY_AGENT_GATEWAY_CONFIG } from '@/shared/agent/gateway';
import type { AgentStatus, AgentToolName } from '@/shared/agent/protocol';

/**
 * Agent 对话面板的状态。
 *
 * 刻意**不持久化**：对话是过程性内容，落库会污染自动化工作区快照，
 * 也会把可能含敏感字段的工具结果写进 SQLite。
 */

export interface AgentChatMessage {
    id: string;
    role: 'user' | 'assistant';
    text: string;
    at: number;
}

export interface AgentToolTrace {
    id: string;
    name: AgentToolName;
    status: 'running' | 'ok' | 'error';
    detail?: string;
    at: number;
}

export interface AgentScriptDraft {
    id: string;
    scenarioId: string;
    script: string;
    previousScript?: string;
    summary?: string;
    at: number;
}

export interface AgentState {
    status: AgentStatus;
    gateway: AgentGatewayConfig;
    running: boolean;
    runId?: string;
    error?: string;
    messages: AgentChatMessage[];
    tools: AgentToolTrace[];
    drafts: AgentScriptDraft[];
    activeAssistantId?: string;
    setStatus(status: AgentStatus): void;
    setGateway(gateway: AgentGatewayConfig): void;
    setRunning(running: boolean, runId?: string): void;
    setError(error?: string): void;
    pushUserMessage(text: string): void;
    appendDelta(text: string): void;
    finishAssistantMessage(): void;
    pushTool(trace: AgentToolTrace): void;
    settleTool(id: string, status: 'ok' | 'error', detail?: string): void;
    pushDraft(draft: Omit<AgentScriptDraft, 'id' | 'at'>): void;
    reset(): void;
}

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const useAgentStore = create<AgentState>((set) => ({
    status: { state: 'stopped' },
    gateway: EMPTY_AGENT_GATEWAY_CONFIG,
    running: false,
    messages: [],
    tools: [],
    drafts: [],
    setStatus: (status) => set({ status }),
    setGateway: (gateway) => set({ gateway }),
    setRunning: (running, runId) => set({ running, runId: running ? runId : undefined }),
    setError: (error) => set({ error }),
    pushUserMessage: (text) =>
        set((state) => ({
            messages: [
                ...state.messages,
                { id: newId('agent-msg'), role: 'user' as const, text, at: Date.now() },
            ],
        })),
    appendDelta: (text) =>
        set((state) => {
            const id = state.activeAssistantId ?? newId('agent-msg');
            const exists = state.messages.some((item) => item.id === id);
            return {
                activeAssistantId: id,
                messages: exists
                    ? state.messages.map((item) =>
                          item.id === id ? { ...item, text: item.text + text } : item,
                      )
                    : [...state.messages, { id, role: 'assistant' as const, text, at: Date.now() }],
            };
        }),
    finishAssistantMessage: () => set({ activeAssistantId: undefined }),
    pushTool: (trace) => set((state) => ({ tools: [...state.tools, trace] })),
    settleTool: (id, status, detail) =>
        set((state) => ({
            tools: state.tools.map((item) =>
                item.id === id ? { ...item, status, detail: detail ?? item.detail } : item,
            ),
        })),
    pushDraft: (draft) =>
        set((state) => ({
            drafts: [{ ...draft, id: newId('agent-draft'), at: Date.now() }, ...state.drafts],
        })),
    reset: () =>
        set({
            running: false,
            runId: undefined,
            error: undefined,
            messages: [],
            tools: [],
            drafts: [],
            activeAssistantId: undefined,
        }),
}));
