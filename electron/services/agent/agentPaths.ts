import fs from 'node:fs';
import path from 'node:path';

/**
 * Agent sidecar 的路径解析。
 *
 * 开发模式下从仓库根目录解析 `agent/main.mjs`；打包后从
 * `process.resourcesPath/agent/` 解析（由 electron-builder 的 extraResources 投放）。
 * asar 内文件对系统 Node 子进程不可见，因此需要映射到 app.asar.unpacked。
 */

export function resolveUnpackedAsarPath(filePath: string): string {
    return filePath.includes('app.asar')
        ? filePath.replace('app.asar', 'app.asar.unpacked')
        : filePath;
}

export interface AgentEntryOptions {
    isPackaged: boolean;
    resourcesPath: string;
    moduleDir: string;
    cwd: string;
}

export function resolveAgentEntry(options: AgentEntryOptions): string {
    const candidates = options.isPackaged
        ? [path.join(options.resourcesPath, 'agent', 'main.mjs')]
        : [
              path.join(options.cwd, 'agent', 'main.mjs'),
              path.join(options.moduleDir, '..', 'agent', 'main.mjs'),
          ];

    for (const candidate of candidates) {
        const resolved = resolveUnpackedAsarPath(candidate);
        if (fs.existsSync(resolved)) return resolved;
    }
    throw new Error(`找不到 Agent sidecar 入口：${candidates.join(' | ')}`);
}

export interface AgentNodeOptions {
    isPackaged: boolean;
    resourcesPath: string;
    env: NodeJS.ProcessEnv;
    platform?: NodeJS.Platform;
    exists?: (candidate: string) => boolean;
}

/**
 * 解析运行 sidecar 的 Node 可执行文件。
 *
 * 打包后优先使用 `resources/node` 里随应用分发的 Node，避免依赖用户机器环境；
 * 开发模式回退到当前 Node。
 */
export function resolveNodeExecutable(options: AgentNodeOptions): string {
    const exists = options.exists ?? ((candidate: string) => fs.existsSync(candidate));
    const platform = options.platform ?? process.platform;

    const override = options.env.AGENT_NODE_PATH?.trim();
    if (override) return override;

    if (options.isPackaged) {
        const nodeName = platform === 'win32' ? 'node.exe' : 'node';
        const bundled = path.join(options.resourcesPath, 'node', nodeName);
        if (exists(bundled)) return bundled;
    }

    const npmNode = options.env.npm_node_execpath?.trim();
    if (npmNode) return npmNode;

    return platform === 'win32' ? 'node.exe' : 'node';
}
