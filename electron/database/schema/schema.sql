-- Golden API runtime database schema (SQLite)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS data_migrations (
    name TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_preferences (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS workspace_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS common_param_sets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS common_params (
    set_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    type TEXT NOT NULL,
    PRIMARY KEY (set_id, position),
    FOREIGN KEY (set_id) REFERENCES common_param_sets (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    common_param_set_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (common_param_set_id) REFERENCES common_param_sets (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS case_folders (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    parent_id TEXT,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES case_folders (id) ON DELETE CASCADE,
    UNIQUE (project_id, parent_id, position)
);

CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    protocol TEXT NOT NULL,
    address TEXT NOT NULL,
    folder_id TEXT,
    favorite INTEGER NOT NULL DEFAULT 0,
    run_input_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES case_folders (id) ON DELETE SET NULL,
    UNIQUE (project_id, position)
);

CREATE TABLE IF NOT EXISTS case_params (
    case_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    type TEXT NOT NULL,
    PRIMARY KEY (case_id, position),
    FOREIGN KEY (case_id) REFERENCES cases (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS api_debug_environments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    queue TEXT NOT NULL,
    timeout TEXT NOT NULL,
    protocol TEXT NOT NULL,
    service TEXT,
    node_id TEXT,
    client_session_id TEXT,
    database_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS api_debug_environment_vars (
    environment_id TEXT NOT NULL,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (environment_id, name),
    FOREIGN KEY (environment_id) REFERENCES api_debug_environments (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS db_connections (
    id TEXT PRIMARY KEY,
    server TEXT NOT NULL,
    port INTEGER,
    database_name TEXT NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    query_timeout_ms INTEGER,
    max_rows INTEGER
);

CREATE TABLE IF NOT EXISTS param_suggest_rules (
    id TEXT PRIMARY KEY,
    field TEXT NOT NULL,
    fields_json TEXT NOT NULL DEFAULT '[]',
    type TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    priority INTEGER NOT NULL DEFAULT 0,
    match_json TEXT NOT NULL DEFAULT '{}',
    datasource_type TEXT NOT NULL,
    datasource_db TEXT NOT NULL,
    datasource_sql TEXT NOT NULL,
    bindings_json TEXT NOT NULL DEFAULT '{}',
    cache_enabled INTEGER,
    cache_ttl_seconds INTEGER,
    trigger TEXT
);

CREATE TABLE IF NOT EXISTS kcbp_runtime_config (
    id TEXT PRIMARY KEY,
    executable TEXT NOT NULL,
    working_dir TEXT NOT NULL,
    args_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS request_history (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    project_id TEXT,
    project_name TEXT NOT NULL,
    case_id TEXT,
    case_name TEXT NOT NULL,
    mode TEXT NOT NULL,
    environment_id TEXT,
    environment_name TEXT,
    address TEXT NOT NULL,
    msgtype TEXT NOT NULL,
    queue TEXT,
    timeout TEXT,
    params_json TEXT NOT NULL,
    run_input_json TEXT NOT NULL,
    response_json TEXT NOT NULL,
    outcome_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cases_project_position ON cases (project_id, position);

CREATE INDEX IF NOT EXISTS idx_cases_folder_position ON cases (project_id, folder_id, position);

CREATE INDEX IF NOT EXISTS idx_case_folders_parent_position ON case_folders (project_id, parent_id, position);

CREATE INDEX IF NOT EXISTS idx_common_params_set_position ON common_params (set_id, position);

CREATE INDEX IF NOT EXISTS idx_environment_vars_environment_id ON api_debug_environment_vars (environment_id);

CREATE INDEX IF NOT EXISTS idx_request_history_timestamp ON request_history (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_request_history_project_timestamp ON request_history (project_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_request_history_case_timestamp ON request_history (case_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_request_history_mode_timestamp ON request_history (mode, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_request_history_environment_timestamp ON request_history (environment_id, timestamp DESC);
