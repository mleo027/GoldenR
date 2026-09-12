import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
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

    it('downgrades a database migrated by the reverted automation schema', () => {
        const db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        migrateSchema(db);
        db.prepare("INSERT INTO projects VALUES('p1', 'Project', NULL, 0, 0)").run();
        db.exec(
            `CREATE TABLE automation_project_configs (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, FOREIGN KEY(project_id) REFERENCES automation_projects(id) ON DELETE CASCADE);
             CREATE TABLE automation_projects (id TEXT PRIMARY KEY, default_config_id TEXT, FOREIGN KEY(default_config_id) REFERENCES automation_project_configs(id) ON DELETE SET NULL);`,
        );
        db.prepare('INSERT INTO schema_migrations VALUES(6, 0)').run();

        migrateSchema(db);

        expect(db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()).toEqual({
            version: SCHEMA_VERSION,
        });
        const leftover = db
            .prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'automation%'",
            )
            .all() as Array<{ name: string }>;
        expect(leftover).toEqual([]);
        expect(db.prepare('SELECT id FROM projects').all()).toEqual([{ id: 'p1' }]);
        db.close();
    });

    it('rejects a database newer than the application schema', () => {
        const db = new Database(':memory:');
        db.exec(
            'CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL); INSERT INTO schema_migrations VALUES (999, 0);',
        );

        expect(() => migrateSchema(db)).toThrow('Unsupported database schema version 999');
        db.close();
    });

    it('upgrades schema version 3 through the version 4 filter indexes', () => {
        const db = new Database(':memory:');
        // Version 3 era: no case_folders, no cases.folder_id, single history index.
        db.exec(
            `CREATE TABLE projects(id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
             CREATE TABLE cases(id TEXT PRIMARY KEY, project_id TEXT NOT NULL, position INTEGER NOT NULL, name TEXT NOT NULL, protocol TEXT NOT NULL, address TEXT NOT NULL, favorite INTEGER NOT NULL DEFAULT 0, run_input_json TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(project_id, position));
             CREATE TABLE request_history(id TEXT PRIMARY KEY, timestamp INTEGER NOT NULL, project_id TEXT, project_name TEXT NOT NULL, case_id TEXT, case_name TEXT NOT NULL, mode TEXT NOT NULL, environment_id TEXT, environment_name TEXT, address TEXT NOT NULL, msgtype TEXT NOT NULL, queue TEXT, timeout TEXT, params_json TEXT NOT NULL, run_input_json TEXT NOT NULL, response_json TEXT NOT NULL, outcome_json TEXT NOT NULL);
             CREATE INDEX idx_request_history_timestamp ON request_history(timestamp DESC);
             CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);
             INSERT INTO schema_migrations VALUES (3, 0);`,
        );

        migrateSchema(db);

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
        expect(
            (db.prepare('PRAGMA table_info(cases)').all() as Array<{ name: string }>).map(
                (column) => column.name,
            ),
        ).toContain('folder_id');
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

        repository.writeRequestHistory({ version: 2, entries });

        expect(db.prepare('SELECT COUNT(*) AS count FROM request_history').get()).toEqual({
            count: 500,
        });
        expect(
            db.prepare('SELECT id FROM request_history ORDER BY timestamp DESC LIMIT 1').get(),
        ).toEqual({ id: 'history-500' });
        db.close();
    });
});
