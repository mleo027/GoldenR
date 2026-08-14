import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
    invalidateKcbpRuntimeConfigCache,
    loadKcbpRuntimeConfig,
    setKcbpRuntimeConfigUserDataDir,
} from './kcbpRuntimeConfigStore';

const tempDirs: string[] = [];

afterEach(async () => {
    invalidateKcbpRuntimeConfigCache();
    await Promise.all(
        tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })),
    );
});

describe('kcbpRuntimeConfigStore migration', () => {
    it('migrates legacy KCBP fields out of tracecode.env.json', async () => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'golden-kcbp-runtime-'));
        tempDirs.push(dir);
        setKcbpRuntimeConfigUserDataDir(dir);

        await fs.writeFile(
            path.join(dir, 'tracecode.env.json'),
            `${JSON.stringify({
                openCppCoveragePath: 'C:/occ/OpenCppCoverage.exe',
                kcbpExecutable: 'C:/kcbp/kcbp.exe',
                kcbpWorkingDir: 'C:/kcbp',
                kcbpArgs: ['--foo', '--bar'],
            })}\n`,
            'utf8',
        );

        const loaded = await loadKcbpRuntimeConfig();

        expect(loaded).toEqual({
            executable: 'C:/kcbp/kcbp.exe',
            workingDir: 'C:/kcbp',
            args: ['--foo', '--bar'],
        });

        const runtimeRaw = JSON.parse(
            await fs.readFile(path.join(dir, 'kcbp.env.json'), 'utf8'),
        ) as Record<string, unknown>;
        const tracecodeRaw = JSON.parse(
            await fs.readFile(path.join(dir, 'tracecode.env.json'), 'utf8'),
        ) as Record<string, unknown>;
        const backupRaw = JSON.parse(
            await fs.readFile(path.join(dir, 'tracecode.kcbp.legacy-migrated.json'), 'utf8'),
        ) as Record<string, unknown>;

        expect(runtimeRaw).toEqual({
            executable: 'C:/kcbp/kcbp.exe',
            workingDir: 'C:/kcbp',
            args: ['--foo', '--bar'],
        });
        expect(tracecodeRaw).toEqual({
            openCppCoveragePath: 'C:/occ/OpenCppCoverage.exe',
        });
        expect(backupRaw).toEqual({
            openCppCoveragePath: 'C:/occ/OpenCppCoverage.exe',
            kcbpExecutable: 'C:/kcbp/kcbp.exe',
            kcbpWorkingDir: 'C:/kcbp',
            kcbpArgs: ['--foo', '--bar'],
        });
    });
});
