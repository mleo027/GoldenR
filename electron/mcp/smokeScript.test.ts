import { execFile } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { getMcpEndpointPath, writeMcpEndpointFile } from './endpointFile';
import { startMcpServer } from './server';

const execFileAsync = promisify(execFile);

describe('mcp-smoke 端到端', () => {
    it('对真实服务器跑通完整流程', async () => {
        const server = await startMcpServer({
            deps: {
                listTools: () => [
                    {
                        name: 'automation_list_scenarios',
                        description: '列出场景',
                        inputSchema: { type: 'object', properties: {} },
                    },
                ],
                invoke: async () => [{ scenarioId: 's1' }],
            },
        });
        const dir = mkdtempSync(path.join(os.tmpdir(), 'goldenr-smoke-'));
        writeMcpEndpointFile(dir, server);
        try {
            const { stdout } = await execFileAsync(
                process.execPath,
                ['scripts/mcp-smoke.mjs', `--endpoint=${getMcpEndpointPath(dir)}`],
                { cwd: process.cwd() },
            );
            expect(stdout).toContain('initialize');
            expect(stdout).toContain('tools/list：1 个工具');
            expect(stdout).toContain('tools/call automation_list_scenarios');
            expect(stdout).toContain('通过');
        } finally {
            await server.close();
        }
    }, 20_000);
});
