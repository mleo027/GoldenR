/** FIX 等协议字段分隔符 SOH (U+0001) */
export const SOH_CHAR = String.fromCharCode(1);

/** 悬停 title 等纯文本场景：SOH 显示为 □ */
export function formatControlCharsForTitle(text: string): string {
    return text.split(SOH_CHAR).join('□');
}

export function containsSoh(text: string): boolean {
    return text.includes(SOH_CHAR);
}
