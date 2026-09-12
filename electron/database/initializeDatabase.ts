import type { SqliteDatabase } from './connection';
import { openDatabase } from './connection';
import { migrateSchema } from './schema/migrations';

export function initializeDatabase(directory: string): SqliteDatabase {
    const db = openDatabase(directory);
    migrateSchema(db);
    return db;
}
