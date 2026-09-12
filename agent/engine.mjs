/**
 * 引擎接缝 —— "他们那部分"真正的可替换点。
 *
 * 当前实现是一个零依赖的 OpenAI 兼容工具调用循环。
 * 若要改用 Pi SDK，只需替换本文件：协议层（main.mjs / runs.mjs / gateway.mjs 的
 * 调用签名）保持不变，宿主侧无需改动。
 *
 * 引擎契约：
 *   run({ input, tools, emit, isCancelled }) → Promise<{ status, summary }>
 *     - input.instruction  业务人员的自然语言描述
 *     - input.scenarioId   要改写的既有场景（可选）
 *     - tools.call(name, args)  请求宿主执行白名单工具
 *     - emit(event)             推送流式事件
 *     - isCancelled()           被取消时应尽快返回
 */
import { streamChatCompletion } from './gateway.mjs';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt.mjs';
import { ENGINE_TOOLS, HOST_TOOL_NAMES, LOCAL_TOOL_NAMES } from './tools.mjs';

/** 单次运行的最大模型轮次，防止自修复无限循环。 */
const MAX_STEPS = 10;

const messageOf = (error) => (error instanceof Error ? error.message : String(error));

function readConfig() {
    return {
        baseUrl: process.env.AGENT_GATEWAY_URL ?? '',
        apiKey: process.env.AGENT_GATEWAY_KEY ?? '',
        model: process.env.AGENT_MODEL ?? '',
    };
}

function assistantMessage(reply) {
    return {
        role: 'assistant',
        content: reply.content || null,
        tool_calls: reply.toolCalls.map((call) => ({
            id: call.id,
            type: 'function',
            function: { name: call.name, arguments: JSON.stringify(call.arguments ?? {}) },
        })),
    };
}

/** 执行一次工具调用。宿主工具经 tools.call，本地工具就地处理。 */
async function dispatch(call, { tools, emit, input, state }) {
    if (call.name === 'propose_script') {
        const args = call.arguments ?? {};
        emit({
            type: 'script.proposed',
            scenarioId: String(args.scenarioId ?? input.scenarioId ?? ''),
            script: String(args.script ?? ''),
            summary: typeof args.summary === 'string' ? args.summary : undefined,
        });
        state.proposed = true;
        return { ok: true, shown: true };
    }

    if (!HOST_TOOL_NAMES.includes(call.name)) {
        return { error: `未知工具：${call.name}` };
    }

    const result = await tools.call(call.name, call.arguments ?? {});

    if (call.name === 'write_scenario') {
        const written = result && typeof result === 'object' ? result : {};
        const script = (call.arguments ?? {}).script;
        if (typeof script === 'string') {
            emit({
                type: 'script.proposed',
                scenarioId: String(written.scenarioId ?? input.scenarioId ?? ''),
                script,
                summary: '已写入场景',
            });
            state.proposed = true;
        }
    }

    return result;
}

export async function run({ input, tools, emit, isCancelled }) {
    if (!input?.instruction?.trim()) throw new Error('缺少用户需求描述');

    const config = readConfig();
    if (!config.model) throw new Error('未配置模型名称，请在 Agent 设置里填写');

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(input) },
    ];
    const state = { proposed: false };
    let summary;

    for (let step = 0; step < MAX_STEPS; step += 1) {
        if (isCancelled()) return { status: 'cancelled' };

        const reply = await streamChatCompletion({
            ...config,
            messages,
            tools: ENGINE_TOOLS,
            onDelta: (text) => emit({ type: 'message.delta', text }),
        });

        if (!reply.toolCalls.length) {
            summary = reply.content?.trim() || summary;
            break;
        }

        messages.push(assistantMessage(reply));

        for (const call of reply.toolCalls) {
            if (isCancelled()) return { status: 'cancelled' };
            let payload;
            try {
                payload = await dispatch(call, { tools, emit, input, state });
            } catch (error) {
                // 工具失败交回模型，让它据此自修复，而不是中断整次运行。
                payload = { error: messageOf(error) };
            }
            messages.push({
                role: 'tool',
                tool_call_id: call.id,
                content: JSON.stringify(payload ?? null),
            });
        }
    }

    return {
        status: 'succeeded',
        summary: summary ?? (state.proposed ? '已生成脚本' : '已完成'),
    };
}

export { LOCAL_TOOL_NAMES };
