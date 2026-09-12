/**
 * OpenAI 兼容网关客户端。
 *
 * 刻意不引入任何第三方 SDK：公司网关普遍暴露 `/chat/completions`，
 * 用内置 fetch 即可，这样 sidecar 保持零依赖，替换与审计成本最低。
 */

function trimTrailingSlash(value) {
    return value.replace(/\/+$/, '');
}

async function readErrorDetail(response) {
    try {
        return (await response.text()).slice(0, 500);
    } catch {
        return '<unreadable body>';
    }
}

function finalizeToolCall(entry) {
    let parsed = {};
    if (entry.arguments.trim()) {
        try {
            parsed = JSON.parse(entry.arguments);
        } catch {
            parsed = { __raw: entry.arguments };
        }
    }
    return { id: entry.id, name: entry.name, arguments: parsed };
}

/** 解析 SSE 流，累积文本增量与 tool_calls 增量。 */
async function parseStream(body, onDelta) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    const toolCalls = new Map();
    let buffer = '';
    let content = '';

    for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });

        let split = buffer.indexOf('\n\n');
        while (split !== -1) {
            const frame = buffer.slice(0, split);
            buffer = buffer.slice(split + 2);
            split = buffer.indexOf('\n\n');

            for (const line of frame.split('\n')) {
                if (!line.startsWith('data:')) continue;
                const data = line.slice(5).trim();
                if (!data || data === '[DONE]') continue;

                const parsed = JSON.parse(data);
                const delta = parsed?.choices?.[0]?.delta;
                if (!delta) continue;

                if (typeof delta.content === 'string' && delta.content) {
                    content += delta.content;
                    onDelta?.(delta.content);
                }
                for (const call of delta.tool_calls ?? []) {
                    const index = call.index ?? 0;
                    const entry = toolCalls.get(index) ?? { id: '', name: '', arguments: '' };
                    if (call.id) entry.id = call.id;
                    if (call.function?.name) entry.name = call.function.name;
                    if (call.function?.arguments) entry.arguments += call.function.arguments;
                    toolCalls.set(index, entry);
                }
            }
        }
    }

    return { content, toolCalls: [...toolCalls.values()].map(finalizeToolCall) };
}

export async function streamChatCompletion({ baseUrl, apiKey, model, messages, tools, onDelta }) {
    if (!baseUrl) throw new Error('未配置模型网关地址');
    if (!apiKey) throw new Error('未配置模型网关密钥');

    const response = await fetch(`${trimTrailingSlash(baseUrl)}/chat/completions`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages,
            tools,
            tool_choice: 'auto',
            stream: true,
        }),
    });

    if (!response.ok) {
        throw new Error(`网关返回 ${response.status}：${await readErrorDetail(response)}`);
    }
    if (!response.body) throw new Error('网关未返回流式响应');

    return parseStream(response.body, onDelta);
}
