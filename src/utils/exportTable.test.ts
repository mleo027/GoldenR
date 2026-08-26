import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    buildAlignedTextTable,
    buildCsvContent,
    estimateDataSize,
    exportTableToCsv,
    formatDataSize,
} from './exportTable';

const mockSaveCsvFile = vi.fn();
const mockSaveTxtFile = vi.fn();

vi.mock('../lib/electron', () => ({
    getElectronAPI: () => ({
        importExport: {
            saveCsv: mockSaveCsvFile,
            saveTxt: mockSaveTxtFile,
        },
    }),
}));

describe('buildCsvContent', () => {
    it('builds UTF-8 BOM csv with escaped quotes and commas', () => {
        const content = buildCsvContent([
            { name: 'a', note: 'say "hi"' },
            { name: 'b,c', note: 'line\nbreak' },
        ]);
        expect(content.startsWith('\uFEFF')).toBe(true);
        expect(content).toContain('"say ""hi"""');
        expect(content).toContain('"b,c"');
        expect(content).toContain('"line\nbreak"');
    });
});

describe('estimateDataSize / formatDataSize', () => {
    it('returns human-readable size', () => {
        const data = [{ x: '1'.repeat(2048) }];
        expect(estimateDataSize(data)).toBeGreaterThan(1024);
        expect(formatDataSize(data)).toMatch(/KB$/);
    });

    it('formats small payload as bytes', () => {
        expect(formatDataSize([{ a: 1 }])).toMatch(/B$/);
    });
});

describe('exportTableToCsv', () => {
    beforeEach(() => {
        mockSaveCsvFile.mockReset();
    });

    it('returns empty when data is empty', async () => {
        await expect(exportTableToCsv([])).resolves.toEqual({ saved: false, reason: 'empty' });
    });

    it('delegates to electron saveCsvFile when available', async () => {
        mockSaveCsvFile.mockResolvedValue({ saved: true, filePath: 'D:/out.csv' });
        const result = await exportTableToCsv([{ custid: '1' }], 'response.csv');
        expect(result).toEqual({ saved: true, filePath: 'D:/out.csv' });
        expect(mockSaveCsvFile).toHaveBeenCalledOnce();
    });

    it('returns cancelled when user dismisses dialog', async () => {
        mockSaveCsvFile.mockResolvedValue({ saved: false });
        await expect(exportTableToCsv([{ custid: '1' }])).resolves.toEqual({
            saved: false,
            reason: 'cancelled',
        });
    });
});

describe('buildAlignedTextTable', () => {
    it('aligns columns by max display width with two-space gaps', () => {
        const table = buildAlignedTextTable([
            { fundid: '6001001', stkcode: '000001', flag: '买入' },
            { fundid: '6001002', stkcode: '600519', flag: '卖出' },
        ]);
        expect(table).toBe(
            ['fundid   stkcode  flag', '6001001  000001   买入', '6001002  600519   卖出'].join('\n'),
        );
    });

    it('pads cells wider than header including CJK width', () => {
        const table = buildAlignedTextTable([{ name: '长长长的中文名称', qty: 5 }]);
        expect(table).toBe('name              qty\n长长长的中文名称  5');
    });

    it('serializes null as empty string and objects as JSON', () => {
        const table = buildAlignedTextTable([{ a: null, b: { x: 1 } }]);
        expect(table).toBe('a  b\n   {"x":1}');
    });
});
