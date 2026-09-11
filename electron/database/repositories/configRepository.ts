import type { ConfigStorageFileName } from '../../../src/shared/config/files';
import type { SqliteDatabase } from '../connection';

const encode = (value: unknown, fallback: unknown = null): string =>
    JSON.stringify(value ?? fallback);
const decode = <T>(value: string | null | undefined, fallback: T): T => {
    try {
        return value == null ? fallback : (JSON.parse(value) as T);
    } catch {
        return fallback;
    }
};
const record = (value: unknown): Record<string, unknown> =>
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
const text = (value: unknown, fallback = ''): string => (value == null ? fallback : String(value));
const now = (): number => Date.now();
const MAX_REQUEST_HISTORY = 500;

export class ConfigRepository {
    private readonly db: SqliteDatabase;
    constructor(db: SqliteDatabase) {
        this.db = db;
    }

    read(name: ConfigStorageFileName): unknown | null {
        if (name === 'app.json')
            return this.oneJson('SELECT value FROM app_preferences WHERE key=?', name);
        if (name === 'settings.json')
            return this.oneJson("SELECT value FROM workspace_state WHERE key='snapshot'");
        if (name === 'db.json') {
            const r = this.db
                .prepare(
                    'SELECT server,port,database_name AS database,username AS user,password,query_timeout_ms AS queryTimeoutMs,max_rows AS maxRows FROM db_connections ORDER BY id LIMIT 1',
                )
                .get() as Record<string, unknown> | undefined;
            return r ?? null;
        }
        if (name === 'kcbp.env.json') {
            const r = this.db
                .prepare(
                    'SELECT executable,working_dir AS workingDir,args_json FROM kcbp_runtime_config ORDER BY id LIMIT 1',
                )
                .get() as Record<string, unknown> | undefined;
            return r
                ? {
                      executable: r.executable,
                      workingDir: r.workingDir,
                      args: decode(r.args_json as string, []),
                  }
                : null;
        }
        if (name === 'api-debug.env.json') return this.readEnvironments();
        if (name === 'project.json')
            return {
                projects: this.db
                    .prepare('SELECT * FROM projects ORDER BY rowid')
                    .all()
                    .map((p) => this.readProject(p as Record<string, unknown>)),
            };
        if (name === 'common-params.json')
            return {
                sets: this.db
                    .prepare('SELECT * FROM common_param_sets ORDER BY rowid')
                    .all()
                    .map((s) => this.readSet(s as Record<string, unknown>)),
            };
        if (name === 'param-suggest-rules.json')
            return {
                rules: this.db
                    .prepare('SELECT * FROM param_suggest_rules ORDER BY rowid')
                    .all()
                    .map((r) => this.readRule(r as Record<string, unknown>)),
            };
        if (name === 'request-history.json')
            return {
                version: 2,
                entries: this.db
                    .prepare('SELECT * FROM request_history ORDER BY timestamp DESC')
                    .all()
                    .map((r) => this.readHistory(r as Record<string, unknown>)),
            };
        return null;
    }

    write(name: ConfigStorageFileName, value: unknown): void {
        const tx = this.db.transaction(() => {
            if (name === 'app.json')
                return this.upsert('app_preferences', 'key', name, { value: encode(value, {}) });
            if (name === 'settings.json')
                return this.upsert('workspace_state', 'key', 'snapshot', {
                    value: encode(value, {}),
                });
            if (name === 'project.json') return this.writeProjects(record(value).projects);
            if (name === 'common-params.json') return this.writeCommonSets(record(value).sets);
            if (name === 'api-debug.env.json')
                return this.writeEnvironments(record(value).kcxpEnvironments, value);
            if (name === 'db.json') return this.writeDb(record(value));
            if (name === 'param-suggest-rules.json') return this.writeRules(record(value).rules);
            if (name === 'kcbp.env.json') return this.writeKcbp(record(value));
            if (name === 'request-history.json') return this.writeHistory(record(value).entries);
        });
        tx();
    }

    flush(): void {
        this.db.pragma('wal_checkpoint(PASSIVE)');
    }

    private oneJson(sql: string, ...args: unknown[]): unknown | null {
        const r = this.db.prepare(sql).get(...args) as { value?: string } | undefined;
        return r ? decode(r.value, null) : null;
    }
    private upsert(
        table: string,
        key: string,
        keyValue: string,
        fields: Record<string, unknown>,
    ): void {
        const columns = [key, ...Object.keys(fields)];
        const values = [keyValue, ...Object.values(fields)];
        const updates = Object.keys(fields)
            .map((c) => `${c}=excluded.${c}`)
            .join(',');
        this.db
            .prepare(
                `INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map(() => '?').join(',')}) ON CONFLICT(${key}) DO UPDATE SET ${updates}`,
            )
            .run(...values);
    }
    private readProject(p: Record<string, unknown>): Record<string, unknown> {
        const cases = this.db
            .prepare('SELECT * FROM cases WHERE project_id=? ORDER BY position')
            .all(p.id)
            .map((c) => this.readCase(c as Record<string, unknown>));
        const folders = this.db
            .prepare(
                'SELECT id,name,parent_id AS parentId,position,created_at AS createdAt,updated_at AS updatedAt FROM case_folders WHERE project_id=? ORDER BY position',
            )
            .all(p.id);
        return {
            id: p.id,
            name: p.name,
            commonParamSetId: p.common_param_set_id ?? undefined,
            createdAt: p.created_at,
            updatedAt: p.updated_at,
            folders,
            cases,
        };
    }
    private readCase(c: Record<string, unknown>): Record<string, unknown> {
        const params = this.db
            .prepare('SELECT name,value,type FROM case_params WHERE case_id=? ORDER BY position')
            .all(c.id);
        return {
            id: c.id,
            name: c.name,
            protocol: c.protocol,
            address: c.address,
            folderId: c.folder_id ?? undefined,
            favorite: Boolean(c.favorite),
            runInput: decode(c.run_input_json as string, {}),
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            params,
        };
    }
    private writeProjects(items: unknown): void {
        this.db.exec('DELETE FROM projects');
        const insertP = this.db.prepare(
            'INSERT INTO projects(id,name,common_param_set_id,created_at,updated_at) VALUES(?,?,?,?,?)',
        );
        const insertF = this.db.prepare(
            'INSERT INTO case_folders(id,project_id,parent_id,name,position,created_at,updated_at) VALUES(?,?,?,?,?,?,?)',
        );
        const insertC = this.db.prepare(
            'INSERT INTO cases(id,project_id,position,name,protocol,address,folder_id,favorite,run_input_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
        );
        const insertParam = this.db.prepare(
            'INSERT INTO case_params(case_id,position,name,value,type) VALUES(?,?,?,?,?)',
        );
        (Array.isArray(items) ? items : []).forEach((item, pi) => {
            const p = record(item);
            const id = text(p.id, `project-${pi}`);
            const stamp = now();
            const setId =
                p.commonParamSetId &&
                this.db
                    .prepare('SELECT 1 FROM common_param_sets WHERE id=?')
                    .get(String(p.commonParamSetId))
                    ? String(p.commonParamSetId)
                    : null;
            insertP.run(
                id,
                text(p.name, id),
                setId,
                Number(p.createdAt ?? stamp),
                Number(p.updatedAt ?? stamp),
            );
            const folderIds = new Set<string>();
            (Array.isArray(p.folders) ? p.folders : []).forEach((fi, i) => {
                const f = record(fi);
                const fid = text(f.id, `${id}-folder-${i}`);
                const parentId =
                    f.parentId && folderIds.has(String(f.parentId)) ? String(f.parentId) : null;
                folderIds.add(fid);
                insertF.run(
                    fid,
                    id,
                    parentId,
                    text(f.name, fid),
                    Number(f.position ?? i),
                    Number(f.createdAt ?? stamp),
                    Number(f.updatedAt ?? stamp),
                );
            });
            (Array.isArray(p.cases) ? p.cases : []).forEach((ci, i) => {
                const c = record(ci);
                const cid = text(c.id, `${id}-case-${i}`);
                const folderId =
                    c.folderId && folderIds.has(String(c.folderId)) ? String(c.folderId) : null;
                insertC.run(
                    cid,
                    id,
                    i,
                    text(c.name, cid),
                    text(c.protocol, 'KCBP'),
                    text(c.address),
                    folderId,
                    c.favorite ? 1 : 0,
                    encode(c.runInput, {}),
                    Number(c.createdAt ?? stamp),
                    Number(c.updatedAt ?? stamp),
                );
                (Array.isArray(c.params) ? c.params : []).forEach((param, j) => {
                    const x = record(param);
                    insertParam.run(cid, j, text(x.name), text(x.value), text(x.type, 'string'));
                });
            });
        });
    }
    private readSet(s: Record<string, unknown>): Record<string, unknown> {
        return {
            id: s.id,
            name: s.name,
            params: this.db
                .prepare(
                    'SELECT name,value,type FROM common_params WHERE set_id=? ORDER BY position',
                )
                .all(s.id),
        };
    }
    private writeCommonSets(items: unknown): void {
        this.db.exec('DELETE FROM common_param_sets');
        const is = this.db.prepare(
            'INSERT INTO common_param_sets(id,name,created_at,updated_at) VALUES(?,?,?,?)',
        );
        const ip = this.db.prepare(
            'INSERT INTO common_params(set_id,position,name,value,type) VALUES(?,?,?,?,?)',
        );
        (Array.isArray(items) ? items : []).forEach((item, i) => {
            const s = record(item),
                id = text(s.id, `set-${i}`),
                t = now();
            is.run(id, text(s.name, id), t, t);
            (Array.isArray(s.params) ? s.params : []).forEach((v, j) => {
                const p = record(v);
                ip.run(id, j, text(p.name), text(p.value), text(p.type, 'string'));
            });
        });
    }
    private readEnvironments(): unknown {
        const meta = this.oneJson(
            "SELECT value FROM workspace_state WHERE key='api-env-meta'",
        ) as Record<string, unknown> | null;
        const environments = this.db
            .prepare(
                'SELECT id,name,host,queue,timeout,protocol,service,node_id AS nodeId,client_session_id AS clientSessionId,database_json FROM api_debug_environments ORDER BY rowid',
            )
            .all()
            .map((environment) => {
                const stored = decode(
                    (environment as Record<string, unknown>).database_json as string,
                    {},
                ) as Record<string, unknown>;
                // 历史数据曾把 kuabConfigId 混存在 database_json 里，读取时丢弃，不再回传给渲染层。
                const database = { ...stored };
                delete database.kuabConfigId;
                return {
                    ...(environment as Record<string, unknown>),
                    database,
                };
            });
        return { ...(meta ?? {}), kcxpEnvironments: environments };
    }
    private writeEnvironments(items: unknown, value: unknown): void {
        const meta = record(value);
        delete meta.kcxpEnvironments;
        this.upsert('workspace_state', 'key', 'api-env-meta', { value: encode(meta, {}) });
        this.db.exec('DELETE FROM api_debug_environments');
        const i = this.db.prepare(
            'INSERT INTO api_debug_environments(id,name,host,queue,timeout,protocol,service,node_id,client_session_id,database_json) VALUES(?,?,?,?,?,?,?,?,?,?)',
        );
        const v = this.db.prepare(
            'INSERT INTO api_debug_environment_vars(environment_id,name,value) VALUES(?,?,?)',
        );
        (Array.isArray(items) ? items : []).forEach((x, n) => {
            const e = record(x),
                id = text(e.id, `env-${n}`);
            i.run(
                id,
                text(e.name, id),
                text(e.host),
                text(e.queue),
                text(e.timeout),
                text(e.protocol, 'KCBP'),
                e.service ?? null,
                e.nodeId ?? null,
                e.clientSessionId ?? null,
                encode(record(e.database), {}),
            );
            Object.entries(record(e.vars)).forEach(([k, val]) => v.run(id, k, text(val)));
        });
    }
    private writeDb(c: Record<string, unknown>): void {
        this.db.exec('DELETE FROM db_connections');
        this.db
            .prepare(
                'INSERT INTO db_connections(id,server,port,database_name,username,password,query_timeout_ms,max_rows) VALUES(?,?,?,?,?,?,?,?)',
            )
            .run(
                'default',
                text(c.server),
                c.port == null ? null : Number(c.port),
                text(c.database),
                text(c.user),
                text(c.password),
                c.queryTimeoutMs == null ? null : Number(c.queryTimeoutMs),
                c.maxRows == null ? null : Number(c.maxRows),
            );
    }
    private readRule(r: Record<string, unknown>): Record<string, unknown> {
        return {
            id: r.id,
            field: r.field,
            fields: decode(r.fields_json as string, []),
            type: r.type,
            enabled: Boolean(r.enabled),
            priority: r.priority,
            match: decode(r.match_json as string, {}),
            datasource: {
                type: r.datasource_type,
                db: r.datasource_db,
                sql: r.datasource_sql,
                bindings: decode(r.bindings_json as string, {}),
                cache:
                    r.cache_enabled == null
                        ? undefined
                        : { enabled: Boolean(r.cache_enabled), ttlSeconds: r.cache_ttl_seconds },
                trigger: r.trigger ?? undefined,
            },
        };
    }
    private writeRules(items: unknown): void {
        this.db.exec('DELETE FROM param_suggest_rules');
        const i = this.db.prepare(
            'INSERT INTO param_suggest_rules(id,field,fields_json,type,enabled,priority,match_json,datasource_type,datasource_db,datasource_sql,bindings_json,cache_enabled,cache_ttl_seconds,trigger) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        );
        (Array.isArray(items) ? items : []).forEach((x, n) => {
            const r = record(x),
                d = record(r.datasource),
                cache = record(d.cache);
            i.run(
                text(r.id, `rule-${n}`),
                text(r.field),
                encode(r.fields, []),
                text(r.type, 'select'),
                r.enabled === false ? 0 : 1,
                Number(r.priority ?? 0),
                encode(r.match, {}),
                text(d.type, 'sql'),
                text(d.db, 'mssql'),
                text(d.sql),
                encode(d.bindings, {}),
                d.cache == null ? null : cache.enabled ? 1 : 0,
                d.cache == null ? null : Number(cache.ttlSeconds ?? 0),
                d.trigger ?? null,
            );
        });
    }
    private writeKcbp(c: Record<string, unknown>): void {
        this.db.exec('DELETE FROM kcbp_runtime_config');
        this.db
            .prepare(
                'INSERT INTO kcbp_runtime_config(id,executable,working_dir,args_json) VALUES(?,?,?,?)',
            )
            .run('default', text(c.executable), text(c.workingDir), encode(c.args, []));
    }
    private readHistory(r: Record<string, unknown>): unknown {
        return {
            id: r.id,
            timestamp: r.timestamp,
            projectId: r.project_id,
            projectName: r.project_name,
            caseId: r.case_id,
            caseName: r.case_name,
            mode: r.mode,
            environmentId: r.environment_id,
            environmentName: r.environment_name,
            request: {
                address: r.address,
                msgtype: r.msgtype,
                queue: r.queue,
                timeout: r.timeout,
                params: decode(r.params_json as string, []),
                runInput: decode(r.run_input_json as string, {}),
            },
            response: decode(r.response_json as string, {}),
            outcome: decode(r.outcome_json as string, {}),
        };
    }
    private writeHistory(items: unknown): void {
        this.db.exec('DELETE FROM request_history');
        const i = this.db.prepare(
            'INSERT INTO request_history(id,timestamp,project_id,project_name,case_id,case_name,mode,environment_id,environment_name,address,msgtype,queue,timeout,params_json,run_input_json,response_json,outcome_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        );
        const entries = (Array.isArray(items) ? items : [])
            .slice()
            .sort((a, b) => Number(record(b).timestamp ?? 0) - Number(record(a).timestamp ?? 0))
            .slice(0, MAX_REQUEST_HISTORY);
        entries.forEach((x, n) => {
            const h = record(x),
                q = record(h.request);
            i.run(
                text(h.id, `history-${n}`),
                Number(h.timestamp ?? now()),
                h.projectId ?? null,
                text(h.projectName),
                h.caseId ?? null,
                text(h.caseName),
                text(h.mode, 'ui'),
                h.environmentId ?? null,
                h.environmentName ?? null,
                text(q.address),
                text(q.msgtype),
                q.queue ?? null,
                q.timeout ?? null,
                encode(q.params, []),
                encode(q.runInput, {}),
                encode(h.response, {}),
                encode(h.outcome, {}),
            );
        });
    }
}
