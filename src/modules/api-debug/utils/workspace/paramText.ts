import type { ParamItem } from '../../types/workspace';
import { resolveMsgtypeFromParams } from './caseLabel';

export interface ParseParamsTextResult {
    ok: true;
    params: ParamItem[];
}

export interface ParseQuickFillResult {
    ok: true;
    params: ParamItem[];
    /** 从日志头或 funcid/g_funcid 入参中解析的功能号，用于更新地址栏 msgtype */
    msgtype?: string;
    /** 从「接口名=功能号;」格式中提取的接口标题 */
    title?: string;
}

export interface ParseParamsTextError {
    ok: false;
    error: string;
}

export type ParseParamsTextOutcome = ParseParamsTextResult | ParseParamsTextError;
export type ParseQuickFillOutcome = ParseQuickFillResult | ParseParamsTextError;

function parseParamToken(raw: string, forceDisabled = false): ParamItem | null {
    let disabled = forceDisabled;
    let content = raw.trim();
    if (!content) return null;

    if (content.startsWith('#')) {
        disabled = true;
        content = content.slice(1).trim();
        if (!content) return null;
    }

    const separatorIndex = content.search(/[:=]/);
    if (separatorIndex === -1) {
        return {
            name: content,
            value: '',
            type: disabled ? 'disabled' : 'string',
        };
    }

    const name = content.slice(0, separatorIndex).trim();
    const value = stripOuterQuotes(content.slice(separatorIndex + 1).trim());
    if (!name) return null;

    return {
        name,
        value,
        type: disabled ? 'disabled' : 'string',
    };
}

function stripOuterQuotes(value: string): string {
    if (value.length < 2) return value;

    const quote = value[0];
    if ((quote === "'" || quote === '"') && value[value.length - 1] === quote) {
        return value.slice(1, -1);
    }

    return value;
}

function splitParamTokens(line: string): string[] {
    const trimmed = line.trim();
    if (!trimmed) return [];

    if (trimmed.includes(',') && !trimmed.includes('\n')) {
        return splitCommaSeparatedPairs(trimmed);
    }

    return [trimmed];
}

/** 按逗号拆分 key:value 片段，保留 value 内空格（如 netaddr:127.0.0.1  abcdefg） */
function splitCommaSeparatedPairs(text: string): string[] {
    const normalized = text.replace(/(?:,\s*)+$/, '');
    const parts: string[] = [];
    let current = '';

    for (let i = 0; i < normalized.length; i += 1) {
        const char = normalized[i];
        if (char === ',') {
            const nextSegment = normalized.slice(i + 1);
            const nextKeyMatch = nextSegment.match(/^\s*([a-zA-Z_]\w*)[:=]/);
            if (nextKeyMatch) {
                if (current.trim()) parts.push(current.trim());
                current = '';
                continue;
            }
        }
        current += char;
    }

    if (current.trim()) parts.push(current.trim());
    return parts;
}

/** 分离「接口名=功能号;」类前缀，如 深圳普通买=410411;funcid:... */
function splitLeadingTitlePrefix(text: string): { title?: string; rest: string } {
    const semicolonIndex = text.indexOf(';');
    if (semicolonIndex === -1) return { rest: text };

    const prefix = text.slice(0, semicolonIndex).trim();
    if (/^[^:;,]+=[^:;,]+$/.test(prefix)) {
        const title = prefix.split('=')[0].trim();
        return { title, rest: text.slice(semicolonIndex + 1).trim() };
    }

    return { rest: text };
}

const LOG_PARAM_LINE = /\[入参:([^[\]]+?)\]\s*\[数值:(.*)\]\s*\[说明:/;

const LOG_HEADER_MSGTYPE = /^\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\]\s*\[(\d+)\]/;

function parseLogHeaderMsgtype(line: string): string | null {
    const match = line.trim().match(LOG_HEADER_MSGTYPE);
    return match?.[1] ?? null;
}

function parseLogFormatParams(text: string): { params: ParamItem[]; msgtype?: string } {
    const params: ParamItem[] = [];
    let msgtype: string | undefined;

    for (const line of text.split(/\r?\n/)) {
        if (!msgtype) {
            const headerMsgtype = parseLogHeaderMsgtype(line);
            if (headerMsgtype) msgtype = headerMsgtype;
        }

        const match = line.match(LOG_PARAM_LINE);
        if (!match) continue;

        const name = match[1].trim();
        const value = stripOuterQuotes(match[2].trim());
        if (!name) continue;

        params.push({ name, value, type: 'string' });
    }

    if (msgtype) {
        params.unshift({ name: 'funcid', value: msgtype, type: 'string' });
    }

    return { params, msgtype };
}

function isLogFormatText(text: string): boolean {
    return (
        /\[入参:[^[\]]+\]\s*\[数值:/.test(text) ||
        /\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\]\s*\[\d+\]/.test(text)
    );
}

function parseInlineCommaParams(text: string): ParamItem[] {
    const params: ParamItem[] = [];

    for (const token of splitCommaSeparatedPairs(text)) {
        const parsed = parseParamToken(token);
        if (parsed) params.push(parsed);
    }

    return params;
}

export function serializeParamsToText(params: ParamItem[]): string {
    return params
        .map((param) => {
            const pair = `${param.name}=${param.value}`;
            return param.type === 'disabled' ? `# ${pair}` : pair;
        })
        .join('\n');
}

export function parseParamsText(text: string): ParseParamsTextOutcome {
    const params: ParamItem[] = [];

    for (const line of text.split(/\r?\n/)) {
        for (const token of splitParamTokens(line)) {
            const parsed = parseParamToken(token);
            if (parsed) params.push(parsed);
        }
    }

    return { ok: true, params };
}

export function parseQuickFillText(text: string): ParseQuickFillOutcome {
    const trimmed = text.trim();
    if (!trimmed) {
        return { ok: false, error: '请粘贴待识别的入参文本' };
    }

    let params: ParamItem[];
    let msgtype: string | undefined;
    let title: string | undefined;

    if (isLogFormatText(trimmed)) {
        const logResult = parseLogFormatParams(trimmed);
        params = logResult.params;
        msgtype = logResult.msgtype;
    } else if (trimmed.includes(';') || (trimmed.includes(',') && trimmed.includes(':'))) {
        const { title: parsedTitle, rest } = splitLeadingTitlePrefix(trimmed);
        if (parsedTitle) title = parsedTitle;
        params = parseInlineCommaParams(rest);
    } else {
        const outcome = parseParamsText(trimmed);
        if (!outcome.ok) return outcome;
        params = outcome.params;
    }

    if (params.length === 0) {
        return { ok: false, error: '未能识别有效入参，请检查文本格式' };
    }

    const resolvedMsgtype = msgtype || resolveMsgtypeFromParams(params);
    return {
        ok: true,
        params,
        ...(resolvedMsgtype ? { msgtype: resolvedMsgtype } : {}),
        ...(title ? { title } : {}),
    };
}

export const PARAM_TEXT_PLACEHOLDER = `g_serverid=1
g_funcid=150501
# g_disabled=0`;
