import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { initializeDatabase } from './initializeDatabase';
import { closeDatabase, openDatabase } from './connection';
import { ConfigRepository } from './repositories/configRepository';
import { migrateSchema, SCHEMA_VERSION } from './schema/migrations';

describe('runtime database schema', () => {
    it('executes the standalone SQL schema script cleanly', () => {
        const db = new Database(':memory:');
        const sql = fs.readFileSync(
            path.join(process.cwd(), 'electron', 'database', 'schema', 'schema.sql'),
            'utf8',
        );
        expect(() => db.exec(sql)).not.toThrow();
        expect(
            (db.prepare('PRAGMA table_info(cases)').all() as Array<{ name: string }>).filter(
                (column) => column.name === 'folder_id',
            ),
        ).toHaveLength(1);
        db.close();
    });

    it('creates the final schema without generic script or payload columns', () => {
        const db = new Database(':memory:');
        migrateSchema(db);

        const tables = db
            .prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
            )
            .all() as Array<{ name: string }>;
        expect(tables.map((table) => table.name)).toContain('request_history');
        expect(db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()).toEqual({
            version: SCHEMA_VERSION,
        });
        const indexes = db
            .prepare(
                "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_request_history_%'",
            )
            .all() as Array<{ name: string }>;
        expect(indexes.map((index) => index.name)).toEqual(
            expect.arrayContaining([
                'idx_request_history_timestamp',
                'idx_request_history_project_timestamp',
                'idx_request_history_case_timestamp',
                'idx_request_history_mode_timestamp',
                'idx_request_history_environment_timestamp',
            ]),
        );

        const columns = (table: string) =>
            (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(
                (column) => column.name,
            );
        expect(columns('cases')).not.toEqual(
            expect.arrayContaining(['script', 'request_script', 'response_script', 'payload']),
        );
        expect(columns('request_history')).not.toContain('script');
        expect(columns('projects')).toEqual(expect.arrayContaining(['common_param_set_id']));
        expect(columns('request_history')).toEqual(
            expect.arrayContaining(['project_id', 'case_id']),
        );
        db.close();
    });

    it('imports legacy JSON when the database exists but data migration is incomplete', () => {
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'golden-db-test-'));
        try {
            const existing = openDatabase(directory);
            migrateSchema(existing);
            closeDatabase();
            fs.writeFileSync(
                path.join(directory, 'project.json'),
                JSON.stringify({ projects: [{ id: 'p1', name: 'Imported', cases: [] }] }),
                'utf8',
            );

            const db = initializeDatabase(directory);
            expect(db.prepare('SELECT name FROM projects WHERE id=?').get('p1')).toEqual({
                name: 'Imported',
            });
            expect(
                db.prepare("SELECT 1 FROM data_migrations WHERE name='legacy-json-v1'").get(),
            ).toEqual({
                1: 1,
            });
            expect(
                fs.existsSync(path.join(directory, 'legacy-config-backup', 'project.json')),
            ).toBe(true);
            closeDatabase();
        } finally {
            closeDatabase();
            fs.rmSync(directory, { recursive: true, force: true });
        }
    });

    it('rejects a database newer than the application schema', () => {
        const db = new Database(':memory:');
        db.exec(
            'CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL); INSERT INTO schema_migrations VALUES (999, 0);',
        );

        expect(() => migrateSchema(db)).toThrow('Unsupported database schema version 999');
        db.close();
    });

    it('upgrades schema version 4 with request history filter indexes', () => {
        const db = new Database(':memory:');
        migrateSchema(db);
        db.prepare('DELETE FROM schema_migrations').run();
        db.prepare('INSERT INTO schema_migrations VALUES(4, 0)').run();
        db.prepare('DROP INDEX idx_request_history_project_timestamp').run();
        db.prepare('DROP INDEX idx_request_history_case_timestamp').run();
        db.prepare('DROP INDEX idx_request_history_mode_timestamp').run();
        db.prepare('DROP INDEX idx_request_history_environment_timestamp').run();

        migrateSchema(db);

        expect(db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()).toEqual({
            version: SCHEMA_VERSION,
        });
        expect(
            db
                .prepare(
                    "SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_request_history_case_timestamp'",
                )
                .get(),
        ).toEqual({ 1: 1 });
        db.close();
    });

    it('enforces the history retention limit at the repository boundary', () => {
        const db = new Database(':memory:');
        migrateSchema(db);
        const repository = new ConfigRepository(db);
        const entries = Array.from({ length: 501 }, (_, index) => ({
            id: `history-${index}`,
            timestamp: index,
            projectName: 'Project',
            caseName: 'Case',
            mode: 'ui',
            request: { address: 'address', msgtype: 'message', params: [], runInput: {} },
            response: { code: '0', message: 'ok', resultSets: [] },
            outcome: {},
        }));

        repository.write('request-history.json', { version: 2, entries });

        expect(db.prepare('SELECT COUNT(*) AS count FROM request_history').get()).toEqual({
            count: 500,
        });
        expect(
            db.prepare('SELECT id FROM request_history ORDER BY timestamp DESC LIMIT 1').get(),
        ).toEqual({ id: 'history-500' });
        db.close();
    });
});
