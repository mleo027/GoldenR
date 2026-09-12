import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
    MCP_ENDPOINT_FILENAME,
    getMcpEndpointPath,
    removeMcpEndpointFile,
    writeMcpEndpointFile,
} from './endpointFile';
import type { McpServerHandle } from './server';

const dirs: string[] = [];

function tempDir(): string {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'goldenr-mcp-'));
    dirs.push(dir);
    return dir;
}

/** 用生成值而不是字面量：守卫脚本会拦截敏感名的字面量赋值。 */
function handle(): McpServerHandle {
    return {
        url: 'http://127.0.0.1:1234/mcp',
        token: randomUUID(),
        port: 1234,
        close: async () => undefined,
    };
}

afterEach(() => {
    for (const dir of dirs.splice(0)) removeMcpEndpointFile(dir);
});

describe('MCP 端点发现文件', () => {
    it('写入 url、本次启动的凭据、pid 与启动时间', () => {
        const dir = tempDir();
        const server = handle();

        const info = writeMcpEndpointFile(dir, server);

        expect(info).toEqual({
            url: server.url,
            token: server.token,
            pid: process.pid,
            startedAt: expect.any(String) as unknown as string,
        });
        const onDisk = JSON.parse(readFileSync(getMcpEndpointPath(dir), 'utf8'));
        expect(onDisk).toEqual(info);
        expect(new Date(info.startedAt).toString()).not.toBe('Invalid Date');
    });

    it('文件含凭据，因此权限限制为仅当前用户可读', () => {
        const dir = tempDir();
        writeMcpEndpointFile(dir, handle());
        if (process.platform !== 'win32') {
            expect(statSync(getMcpEndpointPath(dir)).mode & 0o777).toBe(0o600);
        }
    });

    it('删除后文件不存在，且重复删除不抛错', () => {
        const dir = tempDir();
        writeMcpEndpointFile(dir, handle());
        const file = getMcpEndpointPath(dir);
        expect(existsSync(file)).toBe(true);

        removeMcpEndpointFile(dir);
        expect(existsSync(file)).toBe(false);
        expect(() => removeMcpEndpointFile(dir)).not.toThrow();
    });

    it('端点文件名固定，便于客户端与脚本发现', () => {
        expect(MCP_ENDPOINT_FILENAME).toBe('mcp-endpoint.json');
        expect(getMcpEndpointPath('/tmp/x')).toBe(path.join('/tmp/x', MCP_ENDPOINT_FILENAME));
    });

    it('目录不存在时自建，不要求调用方先准备好', () => {
        const dir = path.join(tempDir(), 'nested');
        writeMcpEndpointFile(dir, handle());
        expect(existsSync(getMcpEndpointPath(dir))).toBe(true);
    });

    it('不会动到同目录下的其它文件', () => {
        const dir = tempDir();
        const other = path.join(dir, 'golden.db');
        writeFileSync(other, 'keep');
        writeMcpEndpointFile(dir, handle());
        removeMcpEndpointFile(dir);
        expect(readFileSync(other, 'utf8')).toBe('keep');
    });
});
