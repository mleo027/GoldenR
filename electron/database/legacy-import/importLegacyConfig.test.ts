import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfigRepository } from '../repositories/configRepository';
import { migrateSchema } from '../schema/migrations';
import { importLegacyConfigOnce } from './importLegacyConfig';

const tempDirs: string[] = [];
const silentLog = { warn: () => undefined } as unknown as Console;

async function createLegacyDir(files: Record<string, unknown>): Promise<string> {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'golden-legacy-import-'));
    tempDirs.push(dir);
    for (const [name, value] of Object.entries(files)) {
        await fs.promises.writeFile(path.join(dir, name), `${JSON.stringify(value)}\n`, 'utf8');
    }
    return dir;
}

function createDatabase() {
    const db = new Database(':memory:');
    migrateSchema(db);
    return db;
}

afterEach(async () => {
    await Promise.all(
        tempDirs.splice(0).map((dir) => fs.promises.rm(dir, { recursive: true, force: true })),
    );
});

describe('legacy JSON import', () => {
    it('migrates legacy KCBP fields out of tracecode.env.json', async () => {
        const dir = await createLegacyDir({
            'tracecode.env.json': {
                openCppCoveragePath: 'C:/occ/OpenCppCoverage.exe',
                kcbpExecutable: 'C:/kcbp/kcbp.exe',
                kcbpWorkingDir: 'C:/kcbp',
                kcbpArgs: ['--foo', '--bar'],
            },
        });
        const db = createDatabase();

        importLegacyConfigOnce(db, dir, silentLog);

        expect(new ConfigRepository(db).read('kcbp.env.json')).toEqual({
            executable: 'C:/kcbp/kcbp.exe',
            workingDir: 'C:/kcbp',
            args: ['--foo', '--bar'],
        });
        expect(fs.existsSync(path.join(dir, 'tracecode.env.json'))).toBe(false);
        expect(fs.existsSync(path.join(dir, 'legacy-config-backup', 'tracecode.env.json'))).toBe(
            true,
        );
        db.close();
    });

    it('imports allowlisted files, moves them to a backup, and runs only once', async () => {
        const dir = await createLegacyDir({ 'app.json': { theme: 'dark' } });
        const db = createDatabase();
        const repo = new ConfigRepository(db);

        importLegacyConfigOnce(db, dir, silentLog);
        expect(repo.read('app.json')).toEqual({ theme: 'dark' });
        expect(fs.existsSync(path.join(dir, 'app.json'))).toBe(false);
        expect(fs.existsSync(path.join(dir, 'legacy-config-backup', 'app.json'))).toBe(true);

        // The data-migration marker makes a second run a no-op, so files dropped
        // into the directory later are never imported.
        await fs.promises.writeFile(
            path.join(dir, 'settings.json'),
            `${JSON.stringify({ snapshot: true })}\n`,
            'utf8',
        );
        importLegacyConfigOnce(db, dir, silentLog);
        expect(repo.read('settings.json')).toBeNull();
        expect(fs.existsSync(path.join(dir, 'settings.json'))).toBe(true);
        db.close();
    });

    it('ignores a corrupt legacy file instead of aborting the import', async () => {
        const dir = await createLegacyDir({ 'app.json': { theme: 'dark' } });
        await fs.promises.writeFile(path.join(dir, 'project.json'), '{ not json', 'utf8');
        const db = createDatabase();

        expect(() => importLegacyConfigOnce(db, dir, silentLog)).not.toThrow();

        expect(new ConfigRepository(db).read('app.json')).toEqual({ theme: 'dark' });
        db.close();
    });
});
