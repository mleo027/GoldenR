import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export type SqliteDatabase = Database.Database;

let connection: SqliteDatabase | null = null;

export function openDatabase(directory: string): SqliteDatabase {
    if (connection) return connection;
    fs.mkdirSync(directory, { recursive: true });
    connection = new Database(path.join(directory, 'golden.db'));
    connection.pragma('journal_mode = WAL');
    connection.pragma('foreign_keys = ON');
    return connection;
}

export function getDatabase(): SqliteDatabase {
    if (!connection) throw new Error('Database has not been initialized');
    return connection;
}

export function closeDatabase(): void {
    if (!connection) return;
    connection.close();
    connection = null;
}

export function resetDatabaseForTests(): void {
    closeDatabase();
}
