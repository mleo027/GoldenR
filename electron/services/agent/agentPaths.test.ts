import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { resolveAgentEntry, resolveNodeExecutable, resolveUnpackedAsarPath } from './agentPaths';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, '..', '..', '..');

describe('agentPaths', () => {
    it('asar 路径映射到 app.asar.unpacked', () => {
        expect(resolveUnpackedAsarPath('/app/resources/app.asar/agent/main.mjs')).toBe(
            '/app/resources/app.asar.unpacked/agent/main.mjs',
        );
        expect(resolveUnpackedAsarPath('/repo/agent/main.mjs')).toBe('/repo/agent/main.mjs');
    });

    it('开发模式从仓库根目录解析 sidecar 入口', () => {
        const entry = resolveAgentEntry({
            isPackaged: false,
            resourcesPath: '/unused',
            moduleDir,
            cwd: repoRoot,
        });
        expect(entry.endsWith(path.join('agent', 'main.mjs'))).toBe(true);
    });

    it('打包模式从 resourcesPath 解析 sidecar 入口', () => {
        const entry = resolveAgentEntry({
            isPackaged: true,
            resourcesPath: repoRoot,
            moduleDir,
            cwd: '/unused',
        });
        expect(entry).toBe(path.join(repoRoot, 'agent', 'main.mjs'));
    });

    it('找不到 sidecar 入口时明确报错', () => {
        expect(() =>
            resolveAgentEntry({
                isPackaged: false,
                resourcesPath: '/unused',
                moduleDir: '/nonexistent-module-dir',
                cwd: '/nonexistent-cwd',
            }),
        ).toThrow('找不到 Agent sidecar 入口');
    });

    it('AGENT_NODE_PATH 覆盖一切', () => {
        expect(
            resolveNodeExecutable({
                isPackaged: true,
                resourcesPath: '/resources',
                env: { AGENT_NODE_PATH: '/custom/node' },
                exists: () => false,
            }),
        ).toBe('/custom/node');
    });

    it('打包后优先使用随应用分发的 Node', () => {
        expect(
            resolveNodeExecutable({
                isPackaged: true,
                resourcesPath: '/resources',
                env: {},
                platform: 'win32',
                exists: (candidate) => candidate === path.join('/resources', 'node', 'node.exe'),
            }),
        ).toBe(path.join('/resources', 'node', 'node.exe'));
    });

    it('分发的 Node 缺失时回退到当前 Node', () => {
        expect(
            resolveNodeExecutable({
                isPackaged: true,
                resourcesPath: '/resources',
                env: { npm_node_execpath: '/usr/bin/node' },
                platform: 'linux',
                exists: () => false,
            }),
        ).toBe('/usr/bin/node');
    });

    it('没有任何线索时使用平台默认命令名', () => {
        expect(
            resolveNodeExecutable({
                isPackaged: false,
                resourcesPath: '/resources',
                env: {},
                platform: 'win32',
                exists: () => false,
            }),
        ).toBe('node.exe');
        expect(
            resolveNodeExecutable({
                isPackaged: false,
                resourcesPath: '/resources',
                env: {},
                platform: 'linux',
                exists: () => false,
            }),
        ).toBe('node');
    });
});
