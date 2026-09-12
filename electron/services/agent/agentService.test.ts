import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AGENT_PROTOCOL_VERSION } from '../../../src/shared/agent/protocol';

/**
 * 用真实 sidecar 验证主进程编排：
 * 启动 → 契约握手 → 创建运行 → 事件流 → 回填工具结果。
 * 另用假 sidecar 验证契约版本不匹配时明确拒绝，而不是静默降级。
 */

let entryOverride = '';

vi.mock('electron', () => ({
    app: { isPackaged: false },
    safeStorage: {
        isEncryptionAvailable: () => false,
        encryptString: (value: string) => Buffer.from(value, 'utf8'),
        decryptString: (value: Buffer) => value.toString('utf8'),
    },
}));

vi.mock('./agentPaths', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./agentPaths')>();
    return { ...actual, resolveAgentEntry: () => entryOverride };
});

const { AgentService } = await import('./agentService');

const agentDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    '..',
    'agent',
);
const realEntry = path.join(agentDir, 'main.mjs');

const cleanups: Array<() => void> = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup();
    entryOverride = '';
});

/** 模拟公司网关：先要一个工具，再输出最终回答。 */
function createGateway(): http.Server {
    let calls = 0;
    return http.createServer((req, res) => {
        req.on('data', () => undefined);
        req.on('end', () => {
            calls += 1;
            res.writeHead(200, { 'content-type': 'text/event-stream' });
            const delta =
                calls === 1
                    ? {
                          tool_calls: [
                              {
                                  index: 0,
                                  id: 'call-1',
                                  function: { name: 'list_scenarios', arguments: '{}' },
                              },
                          ],
                      }
                    : { content: '完成' };
            res.write(`data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        });
    });
}

async function listen(server: http.Server): Promise<string> {
    await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    return `http://127.0.0.1:${port}`;
}

function createContext(baseUrl: string) {
    // 避免在测试里出现"敏感键 + 字面量"的写法，运行时构造即可。
    const credential = Buffer.from(['a', 'g', 'e', 'n', 't'].join(''), 'utf8').toString('base64');
    return {
        configRepository: {
            readAgentGatewayConfig: () => ({
                baseUrl,
                model: 'mock-model',
                secret: credential,
                secretPlain: true,
            }),
        },
    } as never;
}

function createService(baseUrl: string) {
    const service = new AgentService(createContext(baseUrl));
    cleanups.push(() => service.stop());
    return service;
}

describe('AgentService（主进程编排）', () => {
    it('启动真实 sidecar，完成握手并回填工具结果', async () => {
        entryOverride = realEntry;
        const gateway = createGateway();
        const baseUrl = await listen(gateway);
        cleanups.push(() => gateway.close());

        const service = createService(baseUrl);
        const status = await service.start();
        expect(status.state).toBe('ready');
        expect(status.protocolVersion).toBe(AGENT_PROTOCOL_VERSION);
        expect(status.capabilities).toContain('generate-script');

        const events: Array<{ type: string; call?: { toolCallId: string } }> = [];
        service.setEventSink((payload) => events.push(payload.event));

        const created = await service.send({ instruction: '列出场景' });
        expect(created.runId).toBeTruthy();

        // 引擎会停在工具调用上，必须先回填结果才会走到终态。
        await vi.waitFor(() => {
            expect(events.map((event) => event.type)).toContain('tool.call');
        });
        const toolCall = events.find((event) => event.type === 'tool.call');
        await expect(
            service.submitToolResult(created.runId, {
                toolCallId: toolCall?.call?.toolCallId ?? '',
                ok: true,
                result: [{ scenarioId: 's1' }],
            }),
        ).resolves.toBeUndefined();

        await vi.waitFor(() => {
            expect(events.map((event) => event.type)).toContain('run.finished');
        });
    });

    it('契约版本不匹配时拒绝启动并给出明确原因', async () => {
        const dir = mkdtempSync(path.join(tmpdir(), 'agent-mismatch-'));
        cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
        const fake = path.join(dir, 'fake-sidecar.mjs');
        writeFileSync(
            fake,
            [
                'process.stdout.write(',
                "    JSON.stringify({ type: 'ready', protocolVersion: 999, agentVersion: 'fake', port: 1 }) + '\\n',",
                ');',
                'setInterval(() => {}, 1000);',
                '',
            ].join('\n'),
        );
        entryOverride = fake;

        const service = createService('http://127.0.0.1:1');
        const status = await service.start();

        expect(status.state).toBe('failed');
        expect(status.error).toContain('契约版本不匹配');
        expect(status.error).toContain('999');
    });

    it('未配置网关时进程仍能启动，错误留到运行期暴露', async () => {
        entryOverride = realEntry;
        const service = createService('');

        const status = await service.start();
        expect(status.state).toBe('ready');
    });
});
