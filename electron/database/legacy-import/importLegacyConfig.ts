import fs from 'node:fs';
import path from 'node:path';
import type { ConfigStorageFileName } from '../../../src/shared/config/files';
import type { SqliteDatabase } from '../connection';
import { ConfigRepository } from '../repositories/configRepository';

const IMPORTED = 'legacy-json-v1';
const FILES: ConfigStorageFileName[] = [
    'app.json',
    'settings.json',
    'common-params.json',
    'project.json',
    'db.json',
    'param-suggest-rules.json',
    'api-debug.env.json',
    'kcbp.env.json',
    'request-history.json',
];

export function importLegacyConfigOnce(db: SqliteDatabase, directory: string, log = console): void {
    if (db.prepare('SELECT 1 FROM data_migrations WHERE name=?').get(IMPORTED)) return;
    const repo = new ConfigRepository(db);
    const backup = path.join(directory, 'legacy-config-backup');
    fs.mkdirSync(backup, { recursive: true });
    const moved: Array<[string, string]> = [];
    const sources = [...FILES, 'tracecode.env.json'];
    try {
        for (const name of sources) {
            const source = path.join(directory, name);
            const target = path.join(backup, name);
            if (!fs.existsSync(source)) continue;
            if (fs.existsSync(target)) throw new Error(`Legacy backup already exists: ${target}`);
            fs.renameSync(source, target);
            moved.push([source, target]);
        }
    } catch (error) {
        for (const [source, target] of moved.reverse()) {
            try {
                fs.renameSync(target, source);
            } catch {
                /* preserve original error */
            }
        }
        throw error;
    }
    const tx = db.transaction(() => {
        for (const name of FILES) {
            const source = path.join(backup, name);
            if (!fs.existsSync(source)) continue;
            let value: unknown;
            try {
                value = JSON.parse(fs.readFileSync(source, 'utf8'));
            } catch (error) {
                log.warn(`Ignoring invalid legacy config ${name}:`, error);
                continue;
            }
            repo.write(name, value);
        }
        const tracecodePath = path.join(backup, 'tracecode.env.json');
        if (fs.existsSync(tracecodePath)) {
            try {
                const tracecode = JSON.parse(fs.readFileSync(tracecodePath, 'utf8')) as Record<
                    string,
                    unknown
                >;
                if (
                    tracecode.kcbpExecutable != null ||
                    tracecode.kcbpWorkingDir != null ||
                    tracecode.kcbpArgs != null
                ) {
                    repo.write('kcbp.env.json', {
                        executable: tracecode.kcbpExecutable ?? '',
                        workingDir: tracecode.kcbpWorkingDir ?? '',
                        args: tracecode.kcbpArgs ?? [],
                    });
                }
            } catch (error) {
                log.warn('Ignoring invalid legacy tracecode.env.json:', error);
            }
        }
        db.prepare('INSERT INTO data_migrations(name, applied_at) VALUES(?,?)').run(
            IMPORTED,
            Date.now(),
        );
    });
    try {
        tx();
    } catch (error) {
        for (const [source, target] of moved.reverse()) {
            try {
                fs.renameSync(target, source);
            } catch {
                /* preserve database error */
            }
        }
        throw error;
    }
}
