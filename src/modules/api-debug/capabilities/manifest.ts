/**
 * API 调试模块对外暴露的能力描述。
 *
 * **静态、无副作用**：只有字符串与 JSON Schema，不 import store、运行器或 React，
 * 因此平台在模块未被打开过时也能拿到完整清单。
 */
import type { CapabilityDescriptor, CapabilityJsonSchema } from '@/shared/capabilities/types';

/** 本模块能力的命名空间前缀。 */
export const API_DEBUG_CAPABILITY_NAMESPACE = 'apidebug';

/** 注册时使用的模块 id。 */
export const API_DEBUG_CAPABILITY_OWNER = 'api-debug';

function object(
    properties: Record<string, unknown>,
    required: string[] = [],
): CapabilityJsonSchema {
    return { type: 'object', properties, required, additionalProperties: false };
}

export const apiDebugCapabilityDescriptors: CapabilityDescriptor[] = [
    {
        name: `${API_DEBUG_CAPABILITY_NAMESPACE}_list_projects`,
        description: '列出全部接口项目，返回项目 id、名称与用例数量。',
        inputSchema: object({}),
    },
    {
        name: `${API_DEBUG_CAPABILITY_NAMESPACE}_list_cases`,
        description: '列出用例摘要（id、名称、协议、地址、所属项目/目录）。可按项目过滤。',
        inputSchema: object({
            projectId: { type: 'string', description: '项目 ID；省略表示全部项目' },
        }),
    },
    {
        name: `${API_DEBUG_CAPABILITY_NAMESPACE}_read_case`,
        description: '读取用例详情：地址、协议、参数、脚本。修改前应先读取。',
        inputSchema: object({ caseId: { type: 'string', description: '用例 ID' } }, ['caseId']),
    },
    {
        name: `${API_DEBUG_CAPABILITY_NAMESPACE}_create_case`,
        description: '在指定项目下新建用例。省略 projectId 时使用第一个项目。',
        inputSchema: object(
            {
                projectId: { type: 'string', description: '项目 ID；省略表示第一个项目' },
                folderId: { type: 'string', description: '目录 ID；省略表示项目根' },
                name: { type: 'string', description: '用例名称' },
                protocol: { type: 'string', description: '协议，默认 kcxp' },
                address: { type: 'string', description: '接口地址（KCXP 地址串）' },
                script: { type: 'string', description: '脚本模式下的脚本内容' },
            },
            ['address'],
        ),
    },
    {
        name: `${API_DEBUG_CAPABILITY_NAMESPACE}_update_case`,
        description: '修改用例的名称、地址、参数或脚本。会返回修改前的取值以便回滚。',
        inputSchema: object(
            {
                caseId: { type: 'string', description: '用例 ID' },
                name: { type: 'string', description: '新名称' },
                address: { type: 'string', description: '新地址' },
                params: {
                    type: 'array',
                    description: '完整参数列表（覆盖式）',
                    items: { type: 'object' },
                },
                script: { type: 'string', description: '新脚本内容' },
            },
            ['caseId'],
        ),
    },
    {
        name: `${API_DEBUG_CAPABILITY_NAMESPACE}_call_case`,
        description:
            '调用指定用例并把请求发往 KCBP，返回执行结果与响应摘要，用于验证用例是否正确。',
        inputSchema: object(
            {
                caseId: { type: 'string', description: '用例 ID' },
                mode: {
                    type: 'string',
                    description: '调用模式：script（默认，含脚本/TCD）或 ui（仅按参数表发送）',
                    enum: ['script', 'ui'],
                },
            },
            ['caseId'],
        ),
    },
    {
        name: `${API_DEBUG_CAPABILITY_NAMESPACE}_read_history`,
        description: '读取最近的请求历史记录，用于定位失败原因。可按用例过滤。',
        inputSchema: object({
            caseId: { type: 'string', description: '用例 ID；省略表示全部' },
            limit: { type: 'number', description: '返回条数，默认 10，最多 50' },
        }),
    },
];
