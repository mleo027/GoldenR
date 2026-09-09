/** SQL 格式化与语法高亮工具 */

const CLAUSE_KEYWORDS = new Set([
    'SELECT',
    'FROM',
    'WHERE',
    'GROUP',
    'ORDER',
    'HAVING',
    'UNION',
    'EXCEPT',
    'INTERSECT',
    'VALUES',
    'SET',
    'RETURN',
]);

const JOIN_KEYWORDS = new Set(['JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS']);

const KEYWORDS = new Set([
    ...CLAUSE_KEYWORDS,
    ...JOIN_KEYWORDS,
    'AS',
    'AND',
    'OR',
    'ON',
    'IN',
    'IS',
    'NULL',
    'NOT',
    'LIKE',
    'TOP',
    'DISTINCT',
    'INSERT',
    'UPDATE',
    'DELETE',
    'MERGE',
    'INTO',
    'BEGIN',
    'END',
    'DECLARE',
    'EXEC',
    'EXECUTE',
]);

interface Token {
    kind: 'comment' | 'string' | 'word' | 'whitespace' | 'symbol';
    text: string;
}

/** 将 SQL 拆成不会误伤字符串和注释的词法片段 */
function tokenize(sql: string): Token[] {
    const source = String(sql || '');
    const tokens: Token[] = [];
    let i = 0;
    while (i < source.length) {
        if (source.startsWith('--', i)) {
            const end = source.indexOf('\n', i);
            const finish = end < 0 ? source.length : end;
            tokens.push({ kind: 'comment', text: source.slice(i, finish) });
            i = finish;
            continue;
        }
        if (source.startsWith('/*', i)) {
            const end = source.indexOf('*/', i + 2);
            const finish = end < 0 ? source.length : end + 2;
            tokens.push({ kind: 'comment', text: source.slice(i, finish) });
            i = finish;
            continue;
        }
        const ch = source[i];
        if (ch === "'") {
            let end = i + 1;
            while (end < source.length) {
                if (source[end] === "'" && source[end + 1] === "'") {
                    end += 2;
                    continue;
                }
                if (source[end] === "'") {
                    end++;
                    break;
                }
                end++;
            }
            tokens.push({ kind: 'string', text: source.slice(i, end) });
            i = end;
            continue;
        }
        const word = source.slice(i).match(/^(?:@[\w$#]+|[A-Za-z_][\w$#]*|\d+(?:\.\d+)?)/);
        if (word) {
            tokens.push({ kind: 'word', text: word[0] });
            i += word[0].length;
            continue;
        }
        if (/\s/.test(ch)) {
            const whitespace = source.slice(i).match(/^\s+/)![0];
            tokens.push({ kind: 'whitespace', text: whitespace });
            i += whitespace.length;
            continue;
        }
        tokens.push({ kind: 'symbol', text: ch });
        i++;
    }
    return tokens;
}

/** 格式化 SQL，保留原始字符串、注释和标识符内容 */
export function formatSql(sql: string): string {
    const tokens = tokenize(sql);
    const lines: string[] = [];
    let line = '';
    let depth = 0;
    let afterComma = false;

    const push = () => {
        if (line.trim()) lines.push(`${'    '.repeat(depth)}${line.trim()}`);
        line = '';
    };

    for (const token of tokens) {
        if (token.kind === 'whitespace') continue;

        const upper = token.text.toUpperCase();

        if (token.kind === 'comment') {
            if (line) push();
            lines.push(`${'    '.repeat(depth)}${token.text.trim()}`);
            continue;
        }

        if (token.text === '(') {
            line = `${line.trimEnd()} (`.trimStart();
            depth++;
            continue;
        }

        if (token.text === ')') {
            depth = Math.max(0, depth - 1);
            line = `${line.trimEnd()})`;
            continue;
        }

        if (token.text === ',') {
            line = `${line.trimEnd()},`;
            if (depth === 0 || afterComma) push();
            afterComma = true;
            continue;
        }

        if (token.text === ';') {
            line = `${line.trimEnd()};`;
            push();
            afterComma = false;
            continue;
        }

        if (token.kind === 'word' && (CLAUSE_KEYWORDS.has(upper) || JOIN_KEYWORDS.has(upper))) {
            if (line) push();
            line = token.text.toLowerCase();
            afterComma = false;
            continue;
        }

        const needsSpace = line && !/[.(]$/.test(line) && !/^[.)]/.test(token.text);
        line += `${needsSpace ? ' ' : ''}${token.text}`;
        afterComma = false;
    }

    push();
    return lines.join('\n').trim();
}

/** 为已格式化 SQL 生成语法高亮的 HTML */
export function highlightSql(sql: string): string {
    const escapeHtml = (text: string) =>
        text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return tokenize(sql)
        .map((token) => {
            const text = escapeHtml(token.text);
            if (token.kind === 'whitespace') return text;
            if (token.kind === 'comment') return `<span class="sql-comment">${text}</span>`;
            if (token.kind === 'string') return `<span class="sql-string">${text}</span>`;
            if (token.kind === 'word' && KEYWORDS.has(token.text.toUpperCase())) {
                return `<span class="sql-keyword">${text.toLowerCase()}</span>`;
            }
            if (token.kind === 'word' && /^\d/.test(token.text)) {
                return `<span class="sql-number">${text}</span>`;
            }
            return text;
        })
        .join('');
}
