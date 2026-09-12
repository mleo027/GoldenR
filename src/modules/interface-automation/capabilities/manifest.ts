/**
 * 接口自动化模块对外暴露的能力描述。
 *
 * **静态、无副作用**：这里只有字符串与 JSON Schema，不 import store、运行器或 React，
 * 因此平台可以在模块代码加载前（甚至在模块从未被打开过时）就拿到完整的能力清单，
 * 交给 `tools/list`。真正的实现在 `./handlers.ts`，懒加载。
 */
import type { CapabilityDescriptor, CapabilityJsonSchema } from '@/shared/capabilities/types';

/** 本模块能力的命名空间前缀；能力名一律为 `<命名空间>_<动作>`。 */
export const AUTOMATION_CAPABILITY_NAMESPACE = 'automation';

/** 注册时使用的模块 id，与 `platform/registry` 中的模块 id 一致。 */
export const AUTOMATION_CAPABILITY_OWNER = 'interface-automation';

function object(
    properties: Record<string, unknown>,
    required: string[] = [],
): CapabilityJsonSchema {
    return { type: 'object', properties, required, additionalProperties: false };
}

export const automationCapabilityDescriptors: CapabilityDescriptor[] = [
    {
        name: `${AUTOMATION_CAPABILITY_NAMESPACE}_list_scenarios`,
        description: '列出当前工作区全部自动化场景，返回场景 id、名称与所属项目/目录。',
        inputSchema: object({}),
    },
    {
        name: `${AUTOMATION_CAPABILITY_NAMESPACE}_read_scenario`,
        description: '读取指定场景的名称与脚本。修改脚本前应先读取。',
        inputSchema: object({ scenarioId: { type: 'string', description: '场景 ID' } }, [
            'scenarioId',
        ]),
    },
    {
        name: `${AUTOMATION_CAPABILITY_NAMESPACE}_write_scenario`,
        description: '把脚本写入场景，新建或覆盖。会返回旧脚本以便回滚。返回写入后的场景 id。',
        inputSchema: object(
            {
                scenarioId: { type: 'string', description: '要覆盖的场景 ID；省略表示新建' },
                name: { type: 'string', description: '场景名称；新建时必填' },
                script: { type: 'string', description: '完整脚本内容' },
            },
            ['script'],
        ),
    },
    {
        name: `${AUTOMATION_CAPABILITY_NAMESPACE}_list_environments`,
        description: '列出可用 KCXP 运行环境，返回 environmentId、名称与环境类型。',
        inputSchema: object({}),
    },
    {
        name: `${AUTOMATION_CAPABILITY_NAMESPACE}_run_scenario`,
        description: '运行指定场景并返回执行报告，用于验证脚本是否正确。',
        inputSchema: object(
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
    {
        name: `${AUTOMATION_CAPABILITY_NAMESPACE}_read_report`,
        description: '读取场景最近一次运行报告，用于定位失败原因。',
        inputSchema: object({ scenarioId: { type: 'string', description: '场景 ID' } }, [
            'scenarioId',
        ]),
    },
];
