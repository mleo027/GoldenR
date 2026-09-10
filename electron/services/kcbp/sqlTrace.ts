import sql from 'mssql';
import type { DbConnectionConfig } from '../../../src/shared/suggest/types';
import type { SqlTraceEvent, SqlTraceResult } from '../../../src/shared/kcbp/types';

const SESSION_PREFIX = 'golden_api_trace_';

function quote(value: string): string {
    return `N'${value.replace(/'/g, "''")}'`;
}
export function createTraceSessionName(now = Date.now(), random = Math.random()): string {
    return `${SESSION_PREFIX}${now.toString(36)}_${Math.floor(random * 0xffffff).toString(36)}`;
}
export function validateTraceDatabaseConfig(config: DbConnectionConfig): string[] {
    const missing: string[] = [];
    if (!config?.server?.trim()) missing.push('server');
    if (!config?.database?.trim()) missing.push('database');
    if (!config?.user?.trim()) missing.push('user');
    if (!config?.password) missing.push('password');
    return missing;
}
export function buildTraceStartSql(session: string, database: string): string {
    const s = quote(session);
    const db = quote(database);
    const name = session.replace(/]/g, ']]');
    return `IF EXISTS (SELECT 1 FROM sys.server_event_sessions WHERE name=${s})
DROP EVENT SESSION [${name}] ON SERVER;

CREATE EVENT SESSION [${name}] ON SERVER
ADD EVENT sqlserver.sql_statement_completed(ACTION(sqlserver.session_id,sqlserver.sql_text) WHERE (database_name=${db} AND sqlserver.session_id > 50)),
ADD EVENT sqlserver.rpc_completed(ACTION(sqlserver.session_id,sqlserver.sql_text) WHERE (database_name=${db} AND sqlserver.session_id > 50)),
ADD EVENT sqlserver.error_reported(ACTION(sqlserver.session_id,sqlserver.sql_text) WHERE (database_name=${db} AND sqlserver.session_id > 50 AND severity >= 10));

ALTER EVENT SESSION [${name}] ON SERVER
ADD TARGET package0.ring_buffer (SET max_memory=65536);

ALTER EVENT SESSION [${name}] ON SERVER
WITH (MAX_DISPATCH_LATENCY=1 SECONDS);

ALTER EVENT SESSION [${name}] ON SERVER STATE=START;`;
}
export function buildTraceReadSql(session: string): string {
    return `SELECT CAST(t.target_data AS NVARCHAR(MAX)) AS target_data FROM sys.dm_xe_session_targets t INNER JOIN sys.dm_xe_sessions s ON s.address=t.event_session_address WHERE s.name=${quote(session)} AND t.target_name=N'ring_buffer';`;
}
export function buildTraceStopSql(session: string): string {
    const safe = session.replace(/]/g, ']]');
    return `IF EXISTS (SELECT 1 FROM sys.server_event_sessions WHERE name=${quote(session)}) BEGIN ALTER EVENT SESSION [${safe}] ON SERVER STATE=STOP; DROP EVENT SESSION [${safe}] ON SERVER; END;`;
}

export function parseTraceEventsXml(xml: string): SqlTraceEvent[] {
    const events: SqlTraceEvent[] = [];
    for (const match of xml.matchAll(/<event\b([^>]*)>([\s\S]*?)<\/event>/g)) {
        const attributes = match[1];
        const eventName = attributes.match(/\bname="([^"]*)"/)?.[1] ?? '';
        const timestamp = attributes.match(/\btimestamp="([^"]*)"/)?.[1] ?? '';
        const body = match[2];
        const value = (name: string) => {
            const raw =
                body.match(
                    new RegExp(
                        `<(?:data|action)\\b[^>]*\\bname=["']${name}["'][^>]*>[\\s\\S]*?<value\\b[^>]*>([\\s\\S]*?)<\\/value>`,
                        'i',
                    ),
                )?.[1] ?? '';
            return raw
                .replace(/^<!\[CDATA\[/, '')
                .replace(/\]\]>$/, '')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .trim();
        };
        const sqlText = value('statement') || value('sql_text') || value('batch_text');
        const duration = Number(value('duration')) || 0;
        const sessionId = Number(value('session_id')) || 0;
        const parsedTimestamp = new Date(timestamp);
        if (Number.isNaN(parsedTimestamp.getTime())) continue;
        events.push({
            eventType: eventName,
            timestampUtc: parsedTimestamp.toISOString(),
            sqlText: sqlText.trim(),
            durationMs: duration / 1000,
            sessionId,
            errorMessage: value('message') || undefined,
        });
    }
    return events.sort((a, b) => a.timestampUtc.localeCompare(b.timestampUtc));
}

export async function executeWithSqlTrace<T>(
    config: DbConnectionConfig,
    request: () => Promise<T>,
): Promise<{ value?: T; trace: SqlTraceResult }> {
    const trace: SqlTraceResult = { enabled: true, events: [] };
    const missing = validateTraceDatabaseConfig(config);
    if (missing.length) {
        trace.startError = `数据库配置不完整: ${missing.join(', ')}`;
        return { trace };
    }
    const session = createTraceSessionName();
    trace.session = session;
    const pool = new sql.ConnectionPool({
        server: config.server,
        port: config.port ?? 1433,
        database: config.database,
        user: config.user,
        password: config.password,
        options: { encrypt: false, trustServerCertificate: true },
        requestTimeout: config.queryTimeoutMs ?? 30000,
    });
    try {
        await pool.connect();
        await pool.request().batch(buildTraceStartSql(session, config.database));
        try {
            const value = await request();
            return { value, trace };
        } finally {
            await new Promise<void>((resolve) => {
                // The session is created with a one-second dispatch latency.
                // Give XE enough time to flush the ring buffer before reading it.
                setTimeout(resolve, 1200);
            });
            try {
                const result = await pool.request().query(buildTraceReadSql(session));
                const xml = String(result.recordset?.[0]?.target_data ?? '');
                trace.events = parseTraceEventsXml(xml);
            } catch (error) {
                trace.readError = error instanceof Error ? error.message : String(error);
            }
            try {
                await pool.request().batch(buildTraceStopSql(session));
            } catch (error) {
                trace.stopError = error instanceof Error ? error.message : String(error);
            }
        }
    } catch (error) {
        trace.startError = error instanceof Error ? error.message : String(error);
    } finally {
        await pool.close().catch((error) => {
            trace.stopError ??= error instanceof Error ? error.message : String(error);
        });
    }
    return { trace };
}
