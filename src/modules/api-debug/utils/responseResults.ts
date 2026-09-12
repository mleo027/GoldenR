import type { KcbpResultSet } from '@/shared/kcbp/types';

export function getResultSetLabels(resultSets: KcbpResultSet[]): string[] {
    return resultSets.map((resultSet, index) => {
        const baseLabel = resultSet.name || `结果集 ${index + 1}`;
        const duplicate =
            resultSets.filter(
                (candidate, candidateIndex) =>
                    (candidate.name || `结果集 ${candidateIndex + 1}`) === baseLabel,
            ).length > 1;
        return duplicate ? `${baseLabel} ${index + 1}` : baseLabel;
    });
}

export function getResultSetColumns(resultSet: KcbpResultSet | undefined): string[] {
    return resultSet?.columns ?? Object.keys(resultSet?.rows[0] ?? {});
}

export function getVisibleResultColumns(
    selectedColumns: string[],
    resultColumns: string[],
): string[] {
    return selectedColumns.filter((column) => resultColumns.includes(column));
}

export function updateResultSetColumnSelection(
    selections: Record<number, string[]>,
    resultSetIndex: number,
    columns: string[],
): Record<number, string[]> {
    return { ...selections, [resultSetIndex]: [...columns] };
}
