/**
 * Agent 模型网关配置。
 *
 * 对应"应用统一配置公司网关"：业务人员零配置，由管理员填写内网
 * OpenAI 兼容网关的地址、模型与密钥。密钥只存在于主进程，渲染进程
 * 只能读到 `hasApiKey` 布尔值，永远拿不到明文。
 */

export interface AgentGatewayConfig {
    /** OpenAI 兼容网关根地址，例如 `https://llm.corp.example/v1`。 */
    baseUrl: string;
    /** 模型名称，例如 `gpt-4o-mini` 或网关自定义别名。 */
    model: string;
    /** 是否已配置密钥。渲染进程据此提示，而不是读取密钥本身。 */
    hasApiKey: boolean;
}

export interface AgentGatewayConfigInput {
    baseUrl: string;
    model: string;
    /** 省略或传空字符串表示保持已有密钥不变。 */
    apiKey?: string;
}

export const EMPTY_AGENT_GATEWAY_CONFIG: AgentGatewayConfig = {
    baseUrl: '',
    model: '',
    hasApiKey: false,
};

/** 网关配置是否足以启动一次对话。 */
export function isAgentGatewayReady(config: AgentGatewayConfig): boolean {
    return Boolean(config.baseUrl.trim() && config.model.trim() && config.hasApiKey);
}
