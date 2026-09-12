/**
 * 架构边界守卫（路径感知）。
 *
 * 与 eslint.config.js 的 boundaries 规则互补：
 * - ESLint 是权威、可自动修复的完整分层约束（CI 走 `npm run check`）。
 * - 本测试覆盖最关键的几条不变量，且同时解析 `@/` 别名与相对路径，
 *   避免旧版只匹配别名、被相对导入绕过的问题。
 *
 * 新增分层规则请优先加到 eslint.config.js；这里只保留稳定的核心不变量。
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');

interface Zone {
    name: string;
    dir: string;
    /** 解析后的绝对路径若落在这些前缀内即为违规 */
    forbid: string[];
}

const abs = (rel: string) => path.join(ROOT, rel).split(path.sep).join('/');

const ZONES: Zone[] = [
    {
        name: 'src/shared 是叶子层',
        dir: 'src/shared',
        forbid: [
            'src/modules',
            'src/components',
            'src/store',
            'src/platform',
            'src/runtime',
            'src/services',
            'src/lib',
            'src/hooks',
        ],
    },
    {
        name: 'api-debug services 不得依赖 UI / store / hooks',
        dir: 'src/modules/api-debug/services',
        forbid: [
            'src/components',
            'src/modules/api-debug/components',
            'src/modules/api-debug/layout',
            'src/modules/api-debug/providers',
            'src/modules/api-debug/store',
            'src/modules/api-debug/hooks',
        ],
    },
    {
        name: 'api-debug store 不得依赖 UI',
        dir: 'src/modules/api-debug/store',
        forbid: [
            'src/components',
            'src/modules/api-debug/components',
            'src/modules/api-debug/layout',
        ],
    },
    {
        name: 'api-debug utils 保持无副作用',
        dir: 'src/modules/api-debug/utils',
        forbid: [
            'src/components',
            'src/modules/api-debug/components',
            'src/modules/api-debug/store',
            'src/runtime',
        ],
    },
    {
        name: 'electron 不得依赖 renderer 分层',
        dir: 'electron',
        forbid: [
            'src/modules',
            'src/components',
            'src/store',
            'src/platform',
            'src/runtime',
            'src/services',
            'src/lib',
            'src/hooks',
        ],
    },
];

async function listSourceFiles(root: string): Promise<string[]> {
    const entries = await readdir(root, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
        const fullPath = path.join(root, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await listSourceFiles(fullPath)));
        } else if (
            entry.isFile() &&
            /\.(ts|tsx)$/.test(entry.name) &&
            !entry.name.includes('.test.')
        ) {
            files.push(fullPath);
        }
    }
    return files;
}

function importSpecifiers(source: string): string[] {
    const specifiers: string[] = [];
    for (const match of source.matchAll(/(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g)) {
        specifiers.push(match[1]);
    }
    return specifiers;
}

/** 把 `@/x` 或相对路径解析为仓库内的绝对 POSIX 路径；外部包返回 null。 */
function resolveSpecifier(specifier: string, fromFile: string): string | null {
    if (specifier.startsWith('@/')) {
        return abs(path.join('src', specifier.slice(2)));
    }
    if (specifier.startsWith('.')) {
        return path.resolve(path.dirname(fromFile), specifier).split(path.sep).join('/');
    }
    return null;
}

function isForbidden(resolved: string, forbid: string[]): boolean {
    return forbid.some((prefix) => {
        const target = abs(prefix);
        return resolved === target || resolved.startsWith(`${target}/`);
    });
}

describe('architecture boundaries', () => {
    for (const zone of ZONES) {
        it(zone.name, async () => {
            const files = await listSourceFiles(path.join(ROOT, zone.dir));
            const violations: string[] = [];
            for (const file of files) {
                const source = await readFile(file, 'utf-8');
                const relative = path.relative(ROOT, file).split(path.sep).join('/');
                for (const specifier of importSpecifiers(source)) {
                    const resolved = resolveSpecifier(specifier, file);
                    if (resolved && isForbidden(resolved, zone.forbid)) {
                        violations.push(
                            `${relative} -> ${path.relative(ROOT, resolved).split(path.sep).join('/')}`,
                        );
                    }
                }
            }
            expect(violations).toEqual([]);
        });
    }

    it('仅允许统一客户端访问 Electron 桥', async () => {
        const marker = ['window', 'electronAPI'].join('.');
        const files = await listSourceFiles(SRC);
        const offenders: string[] = [];
        for (const file of files) {
            const relative = path.relative(ROOT, file).split(path.sep).join('/');
            if (relative === 'src/lib/electron.ts') continue;
            const source = await readFile(file, 'utf-8');
            if (source.includes(marker)) offenders.push(relative);
        }
        expect(offenders).toEqual([]);
    });
});
