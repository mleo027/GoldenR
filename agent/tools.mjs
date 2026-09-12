/**
 * 暴露给模型的工具定义。
 *
 * 分为两类：
 * - 宿主工具：与 `src/shared/agent/protocol.ts` 的 AGENT_TOOL_NAMES 一一对应，
 *   由 GoldenR 应用执行（数据主权在应用侧）。
 * - 本地工具：`propose_script` 只在 sidecar 内处理，用于把草稿推给界面确认。
 */

export const HOST_TOOL_NAMES = [
    'list_scenarios',
    'read_scenario',
    'write_scenario',
    'list_environments',
    'run_scenario',
    'read_report',
];

export const LOCAL_TOOL_NAMES = ['propose_script'];

const object = (properties, required = []) => ({
    type: 'object',
    properties,
    required,
    additionalProperties: false,
});

export const ENGINE_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'list_scenarios',
            description: '列出当前工作区全部自动化场景，返回场景 id、名称与所属项目/目录。',
            parameters: object({}),
        },
    },
    {
        type: 'function',
        function: {
            name: 'read_scenario',
            description: '读取指定场景的名称、脚本与输入定义。修改脚本前应先读取。',
            parameters: object({ scenarioId: { type: 'string', description: '场景 ID' } }, [
                'scenarioId',
            ]),
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_environments',
            description: '列出可用 KCXP 运行环境，返回 environmentId、名称与环境类型。',
            parameters: object({}),
        },
    },
    {
        type: 'function',
        function: {
            name: 'write_scenario',
            description:
                '把脚本写入场景，新建或覆盖。会保留旧脚本版本以便回滚。返回写入后的场景 id。',
            parameters: object(
                {
                    scenarioId: { type: 'string', description: '要覆盖的场景 ID；省略表示新建' },
                    name: { type: 'string', description: '场景名称；新建时必填' },
                    script: { type: 'string', description: '完整脚本内容' },
                },
                ['script'],
            ),
        },
    },
    {
        type: 'function',
        function: {
            name: 'run_scenario',
            description: '运行指定场景并返回执行报告，用于验证脚本是否正确。',
            parameters: object(
                {
                    scenarioId: { type: 'string', description: '要运行的场景 ID' },
                    environmentId: {
                        type: 'string',
                        description: '运行环境 ID；省略则使用当前选定环境',
                    },
                },
                ['scenarioId'],
            ),
        },
    },
    {
        type: 'function',
        function: {
            name: 'read_report',
            description: '读取场景最近一次运行报告，用于定位失败原因。',
            parameters: object({ scenarioId: { type: 'string', description: '场景 ID' } }, [
                'scenarioId',
            ]),
        },
    },
    {
        type: 'function',
        function: {
            name: 'propose_script',
            description: '把脚本草稿展示给用户确认，但不写入。用户希望先看改动时使用。',
            parameters: object(
                {
                    scenarioId: { type: 'string', description: '目标场景 ID' },
                    script: { type: 'string', description: '完整脚本内容' },
                    summary: { type: 'string', description: '一句话说明这次改动' },
                },
                ['script'],
            ),
        },
    },
];
