export type SortOrder = 'ascend' | 'descend';

export function compareValues(a: unknown, b: unknown, order: SortOrder): number {
    const direction = order === 'ascend' ? 1 : -1;

    if (a == null && b == null) return 0;
    if (a == null) return -1 * direction;
    if (b == null) return 1 * direction;

    if (typeof a === 'number' && typeof b === 'number') {
        return (a - b) * direction;
    }

    const aText = String(a);
    const bText = String(b);
    const aNum = Number(aText);
    const bNum = Number(bText);

    if (aText.trim() !== '' && bText.trim() !== '' && !Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return (aNum - bNum) * direction;
    }

    return aText.localeCompare(bText, 'zh-CN') * direction;
}

export function cellTextForSearch(value: unknown): string {
    return typeof value === 'object' && value != null ? JSON.stringify(value) : String(value ?? '');
}

export function matchesSearchRow(row: Record<string, unknown>, keyword: string): boolean {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return true;

    return Object.values(row).some((value) =>
        cellTextForSearch(value).toLowerCase().includes(normalized),
    );
}

export function filterRowsByKeyword(
    rows: Record<string, unknown>[],
    keyword: string,
): Record<string, unknown>[] {
    const normalized = keyword.trim();
    if (!normalized) return rows;
    return rows.filter((row) => matchesSearchRow(row, normalized));
}
