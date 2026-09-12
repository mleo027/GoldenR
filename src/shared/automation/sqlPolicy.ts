const LEADING_COMMENTS = /^(?:\s|--[^\r\n]*(?:\r?\n|$)|\/\*[\s\S]*?\*\/)+/;
const DISALLOWED =
    /\b(?:CREATE|ALTER|DROP|TRUNCATE|USE|BEGIN|COMMIT|ROLLBACK|SAVE|GRANT|REVOKE|DENY|SP_EXECUTESQL)\b/i;
const DYNAMIC_EXEC = /^EXEC(?:UTE)?\s*\(/i;
const ALLOWED_START = /^(?:INSERT|UPDATE|DELETE|MERGE|EXEC(?:UTE)?)\b/i;

function stripLeadingComments(sql: string): string {
    let value = sql;
    while (true) {
        const next = value.replace(LEADING_COMMENTS, '');
        if (next === value) return value.trim();
        value = next;
    }
}

function hasMultipleStatements(sql: string): boolean {
    let quote: "'" | '"' | null = null;
    let statements = 0;
    let hasToken = false;
    for (let index = 0; index < sql.length; index += 1) {
        const char = sql[index];
        if (quote) {
            if (char === quote && sql[index + 1] === quote) index += 1;
            else if (char === quote) quote = null;
            continue;
        }
        if (char === "'" || char === '"') {
            quote = char;
            hasToken = true;
            continue;
        }
        if (char === ';') {
            if (hasToken) statements += 1;
            hasToken = false;
            continue;
        }
        if (!/\s/.test(char)) hasToken = true;
    }
    if (hasToken) statements += 1;
    return statements > 1;
}

function hasDynamicExec(sql: string): boolean {
    if (DYNAMIC_EXEC.test(sql)) return true;
    const variableExec = sql.match(/^EXEC(?:UTE)?\s+@\w+(.*)$/i);
    return Boolean(variableExec && !variableExec[1].trimStart().startsWith('='));
}

export function validateAutomationWriteSql(
    sql: string,
): { ok: true } | { ok: false; reason: string } {
    const normalized = stripLeadingComments(sql);
    if (!normalized) return { ok: false, reason: 'SQL 不能为空' };
    if (!ALLOWED_START.test(normalized)) {
        return { ok: false, reason: '仅允许 INSERT、UPDATE、DELETE、MERGE 或静态 EXEC' };
    }
    if (DISALLOWED.test(normalized)) {
        return { ok: false, reason: '禁止 DDL、事务控制、USE 和动态 SQL' };
    }
    if (hasDynamicExec(normalized)) {
        return { ok: false, reason: '禁止动态 EXEC' };
    }
    if (hasMultipleStatements(normalized)) {
        return { ok: false, reason: '每次 execute 只允许一条 SQL 语句' };
    }
    return { ok: true };
}
