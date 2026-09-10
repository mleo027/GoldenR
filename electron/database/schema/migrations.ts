import type { SqliteDatabase } from '../connection';
import { ConfigRepository } from '../repositories/configRepository';

export const SCHEMA_VERSION = 7;

// Schema version 6 belonged to the reverted script-automation feature.
// Databases migrated by that build keep its tables behind, so migration
// recognizes the version and rolls the database back to SCHEMA_VERSION.
const REVERTED_AUTOMATION_VERSION = 6;
const REVERTED_AUTOMATION_TABLES = [
    'automation_run_steps',
    'automation_run_reports',
    'automation_run_cases',
    'automation_runs',
    'automation_cases',
    'automation_case_folders',
    'automation_project_configs',
    'automation_projects',
];

export function migrateSchema(db: SqliteDatabase): void {
    db.transaction(() => {
        db.exec(
            'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS data_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL);',
        );
        const row = db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get() as
            | { version?: number }
            | undefined;
        const currentVersion = row?.version ?? 0;
        if (currentVersion > SCHEMA_VERSION && currentVersion !== REVERTED_AUTOMATION_VERSION) {
            throw new Error(
                `Unsupported database schema version ${currentVersion}; application supports up to ${SCHEMA_VERSION}`,
            );
        }
        if (
            currentVersion === REVERTED_AUTOMATION_VERSION ||
            Boolean(
                db
                    .prepare('SELECT 1 FROM schema_migrations WHERE version=?')
                    .get(REVERTED_AUTOMATION_VERSION),
            )
        ) {
            downgradeRevertedAutomationSchema(db);
            return;
        }
        if (row?.version === 5) {
            migrateV5(db);
            return;
        }
        if (row?.version && row.version < 3) {
            migrateV1(db);
            return;
        }
        if (row?.version === 3) {
            migrateV3(db);
        }
        if (row?.version === 3 || row?.version === 4) {
            migrateV4(db);
            return;
        }
        if (!row?.version) {
            createSchema(db);
            db.prepare('INSERT INTO schema_migrations VALUES(?,?)').run(SCHEMA_VERSION, Date.now());
        }
    })();
}

function downgradeRevertedAutomationSchema(db: SqliteDatabase): void {
    const existing = new Set(
        (
            db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{
                name: string;
            }>
        ).map((r) => r.name),
    );
    for (const table of [...REVERTED_AUTOMATION_TABLES].reverse()) {
        if (existing.has(table)) db.exec(`DROP TABLE IF EXISTS ${table}`);
    }
    db.prepare('DELETE FROM schema_migrations WHERE version=?').run(REVERTED_AUTOMATION_VERSION);
    if (!db.prepare('SELECT 1 FROM schema_migrations WHERE version=?').get(SCHEMA_VERSION)) {
        db.prepare('INSERT INTO schema_migrations VALUES(?,?)').run(SCHEMA_VERSION, Date.now());
    }
}

function createSchema(db: SqliteDatabase): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS app_preferences(key TEXT PRIMARY KEY,value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS workspace_state(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS common_param_sets(id TEXT PRIMARY KEY,name TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS common_params(set_id TEXT NOT NULL,position INTEGER NOT NULL,name TEXT NOT NULL,value TEXT NOT NULL,type TEXT NOT NULL,PRIMARY KEY(set_id,position),FOREIGN KEY(set_id) REFERENCES common_param_sets(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,name TEXT NOT NULL,common_param_set_id TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,FOREIGN KEY(common_param_set_id) REFERENCES common_param_sets(id) ON DELETE SET NULL);
      CREATE TABLE IF NOT EXISTS case_folders(id TEXT PRIMARY KEY,project_id TEXT NOT NULL,parent_id TEXT,name TEXT NOT NULL,position INTEGER NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,FOREIGN KEY(parent_id) REFERENCES case_folders(id) ON DELETE CASCADE,UNIQUE(project_id,parent_id,position));
      CREATE TABLE IF NOT EXISTS cases(id TEXT PRIMARY KEY,project_id TEXT NOT NULL,position INTEGER NOT NULL,name TEXT NOT NULL,protocol TEXT NOT NULL,address TEXT NOT NULL,folder_id TEXT,favorite INTEGER NOT NULL DEFAULT 0,run_input_json TEXT NOT NULL DEFAULT '{}',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,FOREIGN KEY(folder_id) REFERENCES case_folders(id) ON DELETE SET NULL,UNIQUE(project_id,position));
      CREATE TABLE IF NOT EXISTS case_params(case_id TEXT NOT NULL,position INTEGER NOT NULL,name TEXT NOT NULL,value TEXT NOT NULL,type TEXT NOT NULL,PRIMARY KEY(case_id,position),FOREIGN KEY(case_id) REFERENCES cases(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS api_debug_environments(id TEXT PRIMARY KEY,name TEXT NOT NULL,host TEXT NOT NULL,queue TEXT NOT NULL,timeout TEXT NOT NULL,protocol TEXT NOT NULL,service TEXT,node_id TEXT,client_session_id TEXT,database_json TEXT NOT NULL DEFAULT '{}');
      CREATE TABLE IF NOT EXISTS api_debug_environment_vars(environment_id TEXT NOT NULL,name TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY(environment_id,name),FOREIGN KEY(environment_id) REFERENCES api_debug_environments(id) ON DELETE CASCADE);
      CREATE TABLE IF NOT EXISTS db_connections(id TEXT PRIMARY KEY,server TEXT NOT NULL,port INTEGER,database_name TEXT NOT NULL,username TEXT NOT NULL,password TEXT NOT NULL,query_timeout_ms INTEGER,max_rows INTEGER);
      CREATE TABLE IF NOT EXISTS param_suggest_rules(id TEXT PRIMARY KEY,field TEXT NOT NULL,fields_json TEXT NOT NULL DEFAULT '[]',type TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,priority INTEGER NOT NULL DEFAULT 0,match_json TEXT NOT NULL DEFAULT '{}',datasource_type TEXT NOT NULL,datasource_db TEXT NOT NULL,datasource_sql TEXT NOT NULL,bindings_json TEXT NOT NULL DEFAULT '{}',cache_enabled INTEGER,cache_ttl_seconds INTEGER,trigger TEXT);
      CREATE TABLE IF NOT EXISTS kcbp_runtime_config(id TEXT PRIMARY KEY,executable TEXT NOT NULL,working_dir TEXT NOT NULL,args_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS request_history(id TEXT PRIMARY KEY,timestamp INTEGER NOT NULL,project_id TEXT,project_name TEXT NOT NULL,case_id TEXT,case_name TEXT NOT NULL,mode TEXT NOT NULL,environment_id TEXT,environment_name TEXT,address TEXT NOT NULL,msgtype TEXT NOT NULL,queue TEXT,timeout TEXT,params_json TEXT NOT NULL,run_input_json TEXT NOT NULL,response_json TEXT NOT NULL,outcome_json TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_cases_project_position ON cases(project_id,position); CREATE INDEX IF NOT EXISTS idx_case_folders_parent_position ON case_folders(project_id,parent_id,position); CREATE INDEX IF NOT EXISTS idx_cases_folder_position ON cases(project_id,folder_id,position); CREATE INDEX IF NOT EXISTS idx_common_params_set_position ON common_params(set_id,position); CREATE INDEX IF NOT EXISTS idx_environment_vars_environment_id ON api_debug_environment_vars(environment_id); CREATE INDEX IF NOT EXISTS idx_request_history_timestamp ON request_history(timestamp DESC); CREATE INDEX IF NOT EXISTS idx_request_history_project_timestamp ON request_history(project_id,timestamp DESC); CREATE INDEX IF NOT EXISTS idx_request_history_case_timestamp ON request_history(case_id,timestamp DESC); CREATE INDEX IF NOT EXISTS idx_request_history_mode_timestamp ON request_history(mode,timestamp DESC); CREATE INDEX IF NOT EXISTS idx_request_history_environment_timestamp ON request_history(environment_id,timestamp DESC);`);
}

function migrateV3(db: SqliteDatabase): void {
    db.exec(
        'CREATE TABLE case_folders(id TEXT PRIMARY KEY,project_id TEXT NOT NULL,parent_id TEXT,name TEXT NOT NULL,position INTEGER NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,FOREIGN KEY(parent_id) REFERENCES case_folders(id) ON DELETE CASCADE,UNIQUE(project_id,parent_id,position)); ALTER TABLE cases ADD COLUMN folder_id TEXT REFERENCES case_folders(id) ON DELETE SET NULL; CREATE INDEX idx_case_folders_parent_position ON case_folders(project_id,parent_id,position); CREATE INDEX idx_cases_folder_position ON cases(project_id,folder_id,position);',
    );
    db.prepare('UPDATE schema_migrations SET version=?, applied_at=? WHERE version=3').run(
        4,
        Date.now(),
    );
}

function migrateV4(db: SqliteDatabase): void {
    db.exec(
        'CREATE INDEX IF NOT EXISTS idx_request_history_project_timestamp ON request_history(project_id,timestamp DESC); CREATE INDEX IF NOT EXISTS idx_request_history_case_timestamp ON request_history(case_id,timestamp DESC); CREATE INDEX IF NOT EXISTS idx_request_history_mode_timestamp ON request_history(mode,timestamp DESC); CREATE INDEX IF NOT EXISTS idx_request_history_environment_timestamp ON request_history(environment_id,timestamp DESC);',
    );
    db.prepare('UPDATE schema_migrations SET version=?, applied_at=? WHERE version=4').run(
        5,
        Date.now(),
    );
    migrateV5(db);
}

function migrateV5(db: SqliteDatabase): void {
    db.exec(
        'CREATE TABLE IF NOT EXISTS api_debug_environments (id TEXT PRIMARY KEY, name TEXT NOT NULL, host TEXT NOT NULL, queue TEXT NOT NULL, timeout TEXT NOT NULL, protocol TEXT NOT NULL, service TEXT, node_id TEXT, client_session_id TEXT)',
    );
    const columns = db.prepare('PRAGMA table_info(api_debug_environments)').all() as Array<{
        name: string;
    }>;
    if (!columns.some((column) => column.name === 'database_json')) {
        db.exec(
            "ALTER TABLE api_debug_environments ADD COLUMN database_json TEXT NOT NULL DEFAULT '{}'",
        );
    }
    db.prepare('UPDATE schema_migrations SET version=?, applied_at=? WHERE version=5').run(
        SCHEMA_VERSION,
        Date.now(),
    );
}

function migrateV1(db: SqliteDatabase): void {
    const parse = (v: unknown): unknown => {
        try {
            return JSON.parse(String(v));
        } catch {
            return null;
        }
    };
    const asRecord = (v: unknown): Record<string, unknown> =>
        v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
    const rows = (table: string): Record<string, unknown>[] =>
        db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
    const projects = rows('projects').map((r) => {
        const p = asRecord(parse(r.payload));
        p.id = p.id ?? r.id;
        p.cases = rows('cases')
            .filter((c) => c.project_id === r.id)
            .map((c) => {
                const x = asRecord(parse(c.payload));
                const cp = rows('case_params').find((q) => q.case_id === c.id);
                return {
                    ...x,
                    id: x.id ?? c.id,
                    params: cp ? (parse(cp.payload) ?? []) : (x.params ?? []),
                };
            });
        return p;
    });
    const sets = rows('common_param_sets').map((r) => {
        const s = asRecord(parse(r.payload));
        return {
            ...s,
            id: s.id ?? r.id,
            name: s.name ?? r.name,
            params: rows('common_params')
                .filter((p) => p.set_id === r.id)
                .map((p) => parse(p.payload) ?? {}),
        };
    });
    const envs = rows('api_debug_environments').map((r) => {
        const e = asRecord(parse(r.payload));
        e.id = e.id ?? r.id;
        e.vars = rows('api_debug_environment_vars')
            .filter((v) => v.environment_id === r.id)
            .reduce((a, v) => ({ ...a, [String(v.name)]: v.value }), {});
        return e;
    });
    const readPayload = (table: string): unknown[] =>
        rows(table)
            .map((r) => parse(r.payload))
            .filter((v): v is unknown => v != null);
    const dbConfig = rows('db_connections')[0] ? parse(rows('db_connections')[0].payload) : null;
    const rules = readPayload('param_suggest_rules');
    const kcbp = rows('kcbp_runtime_config')[0]
        ? parse(rows('kcbp_runtime_config')[0].payload)
        : null;
    const history = rows('request_history')
        .map((r) => parse(r.payload))
        .filter(Boolean);
    db.exec(
        'DROP TABLE request_history; DROP TABLE kcbp_runtime_config; DROP TABLE param_suggest_rules; DROP TABLE db_connections; DROP TABLE api_debug_environment_vars; DROP TABLE api_debug_environments; DROP TABLE case_params; DROP TABLE cases; DROP TABLE projects; DROP TABLE common_params; DROP TABLE common_param_sets;',
    );
    createSchema(db);
    const repo = new ConfigRepository(db);
    const app = db.prepare('SELECT value FROM app_preferences WHERE key=?').get('app.json') as
        | { value?: string }
        | undefined;
    if (app) repo.write('app.json', parse(app.value));
    const settings = db.prepare("SELECT value FROM workspace_state WHERE key='snapshot'").get() as
        | { value?: string }
        | undefined;
    if (settings) repo.write('settings.json', parse(settings.value));
    if (projects.length) repo.write('project.json', { projects });
    if (sets.length) repo.write('common-params.json', { sets });
    if (envs.length) repo.write('api-debug.env.json', { kcxpEnvironments: envs });
    if (dbConfig) repo.write('db.json', dbConfig);
    if (rules.length) repo.write('param-suggest-rules.json', { rules });
    if (kcbp) repo.write('kcbp.env.json', kcbp);
    if (history.length) repo.write('request-history.json', { version: 2, entries: history });
    db.prepare('UPDATE schema_migrations SET version=?, applied_at=? WHERE version<?').run(
        SCHEMA_VERSION,
        Date.now(),
        SCHEMA_VERSION,
    );
}
