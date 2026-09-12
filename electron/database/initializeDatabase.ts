import type { SqliteDatabase } from './connection';
import { openDatabase } from './connection';
import { migrateSchema } from './schema/migrations';
import { importLegacyConfigOnce } from './legacy-import/importLegacyConfig';
import fs from 'node:fs';
import path from 'node:path';

export function initializeDatabase(directory: string): SqliteDatabase {
    const db = openDatabase(directory);
    migrateSchema(db);
    const migrationDone = db
        .prepare("SELECT 1 FROM data_migrations WHERE name='legacy-json-v1'")
        .get();
    const hasLegacyFiles = [
        'app.json',
        'settings.json',
        'project.json',
        'db.json',
        'param-suggest-rules.json',
        'common-params.json',
        'api-debug.env.json',
        'kcbp.env.json',
        'request-history.json',
        'tracecode.env.json',
    ].some((name) => fs.existsSync(path.join(directory, name)));
    if (!migrationDone && hasLegacyFiles) importLegacyConfigOnce(db, directory);
    return db;
}
