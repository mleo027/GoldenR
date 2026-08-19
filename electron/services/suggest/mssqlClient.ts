import sql from 'mssql';
import type { DbConnectionConfig } from '../../../src/shared/suggest/types';

let pool: sql.ConnectionPool | null = null;
let currentConfigKey: string | null = null;

function configKey(config: DbConnectionConfig): string {
    return JSON.stringify({
        server: config.server,
        port: config.port,
        database: config.database,
        user: config.user,
    });
}

function buildSqlConfig(config: DbConnectionConfig): sql.config {
    return {
        server: config.server,
        port: config.port ?? 1433,
        database: config.database,
        user: config.user,
        password: config.password,
        options: {
            encrypt: false,
            trustServerCertificate: true,
        },
        requestTimeout: config.queryTimeoutMs ?? 10000,
    };
}

async function createPool(config: DbConnectionConfig): Promise<sql.ConnectionPool> {
    const nextPool = new sql.ConnectionPool(buildSqlConfig(config));
    await nextPool.connect();
    return nextPool;
}

async function getPool(config: DbConnectionConfig): Promise<sql.ConnectionPool> {
    const key = configKey(config);
    if (pool && currentConfigKey === key) {
        return pool;
    }

    if (pool) {
        await pool.close();
        pool = null;
        currentConfigKey = null;
    }

    pool = await createPool(config);
    currentConfigKey = key;
    return pool;
}

export async function testConnection(
    config: DbConnectionConfig,
): Promise<{ ok: boolean; error?: string }> {
    let testPool: sql.ConnectionPool | null = null;
    try {
        testPool = await createPool(config);
        await testPool.request().query('SELECT 1 AS ok');
        return { ok: true };
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
        };
    } finally {
        if (testPool) {
            await testPool.close();
        }
    }
}

export async function executeSelect(
    config: DbConnectionConfig,
    sqlText: string,
    bindings: Record<string, string | number>,
    maxRows?: number,
): Promise<{ rows: Record<string, unknown>[]; columns: string[] }> {
    const activePool = await getPool(config);
    const request = activePool.request();

    for (const [key, value] of Object.entries(bindings)) {
        request.input(key, value);
    }

    const result = await request.query(sqlText);
    const recordset = (result.recordset ?? []) as Record<string, unknown>[];
    const limit = maxRows ?? config.maxRows ?? 500;
    const rows = recordset.slice(0, limit);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { rows, columns };
}

export async function closePool(): Promise<void> {
    if (pool) {
        await pool.close();
        pool = null;
        currentConfigKey = null;
    }
}
