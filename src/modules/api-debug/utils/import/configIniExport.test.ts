import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCaseTab, createParamItem, createProject } from '../../../../test/factories';
import { parseConfigIni } from './configIniImport';
import { buildConfigIniContent, exportProjectToIni } from './configIniExport';

const mockSaveIni = vi.hoisted(() => vi.fn());

vi.mock('../../../../lib/electron', () => ({
    getElectronAPI: () => ({
        importExport: {
            saveIni: mockSaveIni,
        },
    }),
}));

const project = createProject({
    name: '测试项目',
    cases: [
        createCaseTab({
            id: 'case-1',
            name: '查询一',
            address: '10.0.0.5:22000/150501?queue=req2&timeout=30',
            params: [
                createParamItem({ name: 'fundid', value: '8' }),
                createParamItem({ name: 'skip', value: 'x', type: 'disabled' }),
            ],
        }),
        createCaseTab({
            id: 'case-2',
            name: '查询二',
            address: '10.0.0.5:22000/150502?queue=req3&timeout=45',
            params: [],
        }),
    ],
});

describe('configIniExport', () => {
    beforeEach(() => {
        mockSaveIni.mockReset();
    });

    it('builds an ini project file that can be imported back', () => {
        const content = buildConfigIniContent(project);

        expect(content).toContain('[连接参数]');
        expect(content).toContain('IPAddress=10.0.0.5');
        expect(content).toContain('IPPort=22000');
        expect(content).toContain('查询一=150501?queue=req2&timeout=30;fundid:8');
        expect(content).not.toContain('skip');

        const imported = parseConfigIni(content);
        expect(imported).toHaveLength(2);
        expect(imported[0].address).toBe('10.0.0.5:22000/150501?queue=req2&timeout=30');
        expect(imported[1].address).toBe('10.0.0.5:22000/150502?queue=req3&timeout=45');
        expect(imported[0].params).toEqual([{ name: 'fundid', value: '8', type: 'string' }]);
    });

    it('escapes delimiters so exported parameter values can be imported back', () => {
        const escapedProject = createProject({
            name: '测试项目',
            cases: [
                createCaseTab({
                    id: 'case-1',
                    name: '[查询;一]',
                    address: '10.0.0.5:22000/150501?queue=req2&timeout=30',
                    params: [
                        createParamItem({ name: 'a,b', value: 'x,y;z=w' }),
                        createParamItem({ name: 'skip', value: 'x', type: 'disabled' }),
                    ],
                }),
            ],
        });

        const content = buildConfigIniContent(escapedProject);
        expect(content).toContain(
            '\\[查询\\;一\\]=150501?queue=req2&timeout=30;a\\,b:x\\,y\\;z\\=w',
        );
        expect(content).not.toContain(';skip:');

        const imported = parseConfigIni(content);
        expect(imported[0].name).toBe('[查询;一]');
        expect(imported[0].params).toEqual([{ name: 'a,b', value: 'x,y;z=w', type: 'string' }]);
    });

    it('delegates saving to the electron ini export channel', async () => {
        mockSaveIni.mockResolvedValue({ saved: true, filePath: 'D:/out.ini' });

        const result = await exportProjectToIni(project, 'project.ini');

        expect(result).toEqual({ saved: true, filePath: 'D:/out.ini' });
        expect(mockSaveIni).toHaveBeenCalledWith(
            expect.stringContaining('查询一=150501'),
            'project.ini',
        );
    });

    it('reports electron save errors instead of treating them as cancelled', async () => {
        mockSaveIni.mockResolvedValue({ saved: false, error: 'disk full' });

        await expect(exportProjectToIni(project, 'project.ini')).resolves.toEqual({
            saved: false,
            reason: 'error',
            error: 'disk full',
        });
    });

    it('returns empty when the project has no exportable interface', async () => {
        const emptyProject = createProject({
            name: '空项目',
            cases: [createCaseTab({ id: 'empty', address: '' })],
        });

        await expect(exportProjectToIni(emptyProject)).resolves.toEqual({
            saved: false,
            reason: 'empty',
        });
    });
});
