/**
 * 轻量行级 diff，用于在 Agent 面板里展示脚本改动。
 *
 * 只做展示，不追求最小编辑距离；用标准 LCS 动态规划即可，
 * 脚本体量在数百行以内，开销可忽略。
 */
export type DiffLineKind = 'context' | 'added' | 'removed';

export interface DiffLine {
    kind: DiffLineKind;
    text: string;
}

function splitLines(value: string): string[] {
    if (!value) return [];
    return value.replace(/\r\n/g, '\n').split('\n');
}

function lcsTable(before: string[], after: string[]): number[][] {
    const table: number[][] = Array.from({ length: before.length + 1 }, () =>
        new Array<number>(after.length + 1).fill(0),
    );
    for (let i = before.length - 1; i >= 0; i -= 1) {
        for (let j = after.length - 1; j >= 0; j -= 1) {
            table[i][j] =
                before[i] === after[j]
                    ? table[i + 1][j + 1] + 1
                    : Math.max(table[i + 1][j], table[i][j + 1]);
        }
    }
    return table;
}

/** 逐行比较两份脚本，返回带增删标记的行序列。 */
export function diffScriptLines(before: string, after: string): DiffLine[] {
    const left = splitLines(before);
    const right = splitLines(after);
    const table = lcsTable(left, right);
    const result: DiffLine[] = [];

    let i = 0;
    let j = 0;
    while (i < left.length && j < right.length) {
        if (left[i] === right[j]) {
            result.push({ kind: 'context', text: left[i] });
            i += 1;
            j += 1;
        } else if (table[i + 1][j] >= table[i][j + 1]) {
            result.push({ kind: 'removed', text: left[i] });
            i += 1;
        } else {
            result.push({ kind: 'added', text: right[j] });
            j += 1;
        }
    }
    while (i < left.length) {
        result.push({ kind: 'removed', text: left[i] });
        i += 1;
    }
    while (j < right.length) {
        result.push({ kind: 'added', text: right[j] });
        j += 1;
    }
    return result;
}

/** 统计新增/删除行数，用于折叠展示。 */
export function summarizeDiff(lines: DiffLine[]): { added: number; removed: number } {
    return {
        added: lines.filter((line) => line.kind === 'added').length,
        removed: lines.filter((line) => line.kind === 'removed').length,
    };
}
