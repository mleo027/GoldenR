/**
 * 引擎接缝 —— 这是"他们那部分"真正的可替换点。
 *
 * 接入 Pi 时**只替换本文件**：协议层（main.mjs / runs.mjs / protocol.mjs）保持不动。
 *
 * 引擎契约：
 *   run({ input, tools, emit, isCancelled }) → Promise<{ status, summary }>
 *     - input.instruction  业务人员的自然语言描述
 *     - input.scenarioId   要改写的既有场景（可选）
 *     - tools.call(name, args)  请求宿主执行白名单工具，返回 Promise
 *     - emit(event)             推送流式事件（message.delta / script.proposed 等）
 *     - isCancelled()           被取消时应尽快返回
 *
 * 当前是占位实现，仅用于打通协议链路与验证"替换 agent/ 即升级"。
 */

const PLACEHOLDER_NOTICE = '占位引擎：尚未接入 Pi，仅用于打通协议链路';

export async function run({ input, tools, emit }) {
    const context = input.scenarioId
        ? await tools.call('read_scenario', { scenarioId: input.scenarioId })
        : undefined;

    emit({ type: 'message.delta', text: PLACEHOLDER_NOTICE });

    const scenarioId = readScenarioId(context) ?? input.scenarioId ?? '';
    emit({
        type: 'script.proposed',
        scenarioId,
        script: buildScript(input.instruction, context),
        summary: '根据描述生成的脚本草稿（占位）',
    });

    return { status: 'succeeded', summary: '已生成脚本草稿' };
}

function readScenarioId(context) {
    if (!context || typeof context !== 'object') return undefined;
    const id = context.id;
    return typeof id === 'string' ? id : undefined;
}

function readScenarioName(context) {
    if (!context || typeof context !== 'object') return '新场景';
    const name = context.name;
    return typeof name === 'string' && name ? name : '新场景';
}

function buildScript(instruction, context) {
    const stepName = readScenarioName(context);
    return [
        'scenario({ inputs: {} }, async (t) => {',
        `    // ${instruction}`,
        `    await t.step('${stepName}', async () => {`,
        `        t.log('${PLACEHOLDER_NOTICE}');`,
        '    });',
        '});',
        '',
    ].join('\n');
}
