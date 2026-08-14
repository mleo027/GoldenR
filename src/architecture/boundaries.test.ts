import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');

async function listSourceFiles(root: string): Promise<string[]> {
    const entries = await readdir(root, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
        const fullPath = path.join(root, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await listSourceFiles(fullPath)));
        } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
            files.push(fullPath);
        }
    }
    return files;
}

async function readImportSpecifiers(root: string): Promise<string[]> {
    const files = await listSourceFiles(root);
    const specifiers: string[] = [];
    for (const file of files) {
        const source = await readFile(file, 'utf-8');
        const matches = source.matchAll(/(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g);
        for (const match of matches) {
            specifiers.push(match[1]);
        }
    }
    return specifiers;
}

describe('architecture boundaries', () => {
    it('keeps shared free of feature, UI, store, platform, and config imports', async () => {
        const specifiers = await readImportSpecifiers(path.join(ROOT, 'src/shared'));
        const forbidden = specifiers.filter(
            (specifier) =>
                specifier.startsWith('@/modules/') ||
                specifier.startsWith('@/components/') ||
                specifier.startsWith('@/store/') ||
                specifier.startsWith('@/platform/') ||
                specifier.startsWith('@/config/'),
        );
        expect(forbidden).toEqual([]);
    });

    it('keeps api-debug services free of UI, store, and antd imports', async () => {
        const specifiers = await readImportSpecifiers(
            path.join(ROOT, 'src/modules/api-debug/services'),
        );
        const forbidden = specifiers.filter(
            (specifier) =>
                specifier === 'antd' ||
                specifier.startsWith('@/components/') ||
                specifier.startsWith('@/modules/api-debug/components/') ||
                specifier.startsWith('@/modules/api-debug/layout/') ||
                specifier.startsWith('@/modules/api-debug/providers/') ||
                specifier.startsWith('@/modules/api-debug/store/'),
        );
        expect(forbidden).toEqual([]);
    });

    it('keeps api-debug store free of UI, layout, and antd imports', async () => {
        const specifiers = await readImportSpecifiers(
            path.join(ROOT, 'src/modules/api-debug/store'),
        );
        const forbidden = specifiers.filter(
            (specifier) =>
                specifier === 'antd' ||
                specifier.startsWith('@/components/') ||
                specifier.startsWith('@/modules/api-debug/components/') ||
                specifier.startsWith('@/modules/api-debug/layout/'),
        );
        expect(forbidden).toEqual([]);
    });

    it('allows only the unified client to access the Electron bridge', async () => {
        const electronApiMember = ['window', 'electronAPI'].join('.');
        const files = await listSourceFiles(path.join(ROOT, 'src'));
        const offenders = files.filter(
            (file) =>
                !file.replace(/\\/g, '/').endsWith('src/lib/electron.ts') &&
                (file.endsWith('.ts') || file.endsWith('.tsx')),
        );
        for (const file of offenders) {
            const source = await readFile(file, 'utf-8');
            expect(source, file).not.toContain(electronApiMember);
        }
    });

    it('keeps electron free of renderer feature, UI, store, and platform imports', async () => {
        const specifiers = await readImportSpecifiers(path.join(ROOT, 'electron'));
        const forbidden = specifiers.filter(
            (specifier) =>
                specifier.startsWith('@/modules/') ||
                specifier.startsWith('@/components/') ||
                specifier.startsWith('@/store/') ||
                specifier.startsWith('@/platform/'),
        );
        expect(forbidden).toEqual([]);
    });
});
