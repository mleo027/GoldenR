import fs from 'node:fs';
import path from 'node:path';
import type { McpServerHandle } from './server';

/**
 * MCP 端点发现文件。
 *
 * 客户端（或 `scripts/mcp-smoke.mjs`）读它拿到 URL 与本次启动的 token。文件放在配置
 * 目录，权限 0600，且已加入 `.gitignore`——它含凭据。
 */
export const MCP_ENDPOINT_FILENAME = 'mcp-endpoint.json';

export interface McpEndpointInfo {
    url: string;
    token: string;
    /** 写入时的进程号：便于识别崩溃后残留的过期文件。 */
    pid: number;
    startedAt: string;
}

export function getMcpEndpointPath(configDir: string): string {
    return path.join(configDir, MCP_ENDPOINT_FILENAME);
}

export function writeMcpEndpointFile(configDir: string, handle: McpServerHandle): McpEndpointInfo {
    const info: McpEndpointInfo = {
        url: handle.url,
        token: handle.token,
        pid: process.pid,
        startedAt: new Date().toISOString(),
    };
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(getMcpEndpointPath(configDir), `${JSON.stringify(info, null, 2)}\n`, {
        mode: 0o600,
    });
    return info;
}

/** 尽力而为：退出路径上删不掉也不该阻塞退出（过期文件由 pid 校验识别）。 */
export function removeMcpEndpointFile(configDir: string): void {
    try {
        fs.rmSync(getMcpEndpointPath(configDir), { force: true });
    } catch {
        // 忽略
    }
}
