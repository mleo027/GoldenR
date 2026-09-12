import type { CapabilityDescriptor } from '../../src/shared/capabilities/types';
import { toMcpTool, type McpTool } from './protocol';

/**
 * 主进程侧的能力清单。
 *
 * 能力描述由模块静态声明、组合根注入**渲染层**的注册表。主进程不能 import 模块
 * （`electron/**` 只允许依赖 `src/shared`），所以清单必须由渲染层在启动后推过来。
 *
 * 清单是静态的——模块被打开与否都不影响它，因此 `tools/list` 不会因为界面状态而
 * 时有时无。
 */
let tools: McpTool[] = [];

export function setCapabilityManifest(descriptors: CapabilityDescriptor[]): void {
    tools = descriptors.map(toMcpTool);
}

export function listMcpTools(): McpTool[] {
    return tools;
}

export function getCapabilityManifestSize(): number {
    return tools.length;
}
