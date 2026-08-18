/** FIX 等协议字段分隔符 SOH (U+0001) */
export const SOH_CHAR = String.fromCharCode(1);
export const SOH_DISPLAY_MARKER = '□';
/** 字面量方块字符用 ■ 显示，避免和 SOH 标记 □ 混淆 */
export const LITERAL_SQUARE_DISPLAY_MARKER = '■';

/** 悬停 title 等纯文本场景：SOH 显示为 □ */
export function formatControlCharsForTitle(text: string): string {
    let result = '';
    for (const char of text) {
        if (char === SOH_CHAR) {
            result += SOH_DISPLAY_MARKER;
        } else if (char === SOH_DISPLAY_MARKER) {
            result += LITERAL_SQUARE_DISPLAY_MARKER;
        } else {
            result += char;
        }
    }
    return result;
}

export function decodeSohMarkers(text: string): string {
    let result = '';
    for (const char of text) {
        if (char === SOH_DISPLAY_MARKER) {
            result += SOH_CHAR;
        } else if (char === LITERAL_SQUARE_DISPLAY_MARKER) {
            result += SOH_DISPLAY_MARKER;
        } else {
            result += char;
        }
    }
    return result;
}

export function containsSoh(text: string): boolean {
    return text.includes(SOH_CHAR);
}
