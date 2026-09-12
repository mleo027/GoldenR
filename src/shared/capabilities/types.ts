/**
 * 平台级能力契约（与传输方式无关）。
 *
 * 一个"能力"是应用对外暴露的一个**意图级**接口。模块声明它
 * （`CapabilityDescriptor`，静态、可在模块代码加载前读取），并提供一个实现
 * （`CapabilityHandler`，懒加载）。
 *
 * MCP 服务器只是这份契约的消费者之一：`CapabilityDescriptor` 几乎可以原样映射为
 * MCP 的 tool 定义（`name` / `description` / `inputSchema`），因此新增传输方式
 * 不需要改任何模块。
 *
 * 注意：能力描述与实现都不属于某个传输协议。不要在这里引入 MCP 概念。
 */

/** 能力入参的 JSON Schema；MCP 的 `inputSchema` 直接复用该字段。 */
export interface CapabilityJsonSchema {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
}

/** 能力描述：静态、无副作用，可在对应模块代码加载前读取。 */
export interface CapabilityDescriptor {
    /** 全局唯一，格式 `<命名空间>_<动作>`，例如 `automation_run_scenario`。 */
    name: string;
    /** 面向调用方的说明：做什么、什么时候该用。 */
    description: string;
    /** 入参 JSON Schema。 */
    inputSchema: CapabilityJsonSchema;
}

export type CapabilityArgs = Record<string, unknown>;

/**
 * 能力实现。
 *
 * `context` 由宿主提供，且**对平台不透明**——平台不解释业务上下文，由模块在
 * `capabilities/handlers.ts` 里自行收窄。这样平台层永远不需要知道任何模块的
 * store、运行器或 UI 细节。
 */
export type CapabilityHandler = (args: CapabilityArgs, context: unknown) => Promise<unknown>;

export type CapabilityHandlerMap = Record<string, CapabilityHandler>;

/** 一个模块贡献的能力包：描述静态，实现懒加载。 */
export interface CapabilityContribution {
    /** 该模块的命名空间，也是能力名前缀；须匹配 `^[a-z][a-z0-9]*$`。 */
    namespace: string;
    descriptors: CapabilityDescriptor[];
    /** 首次调用时才真正载入实现。 */
    loadHandlers: () => Promise<CapabilityHandlerMap>;
}
