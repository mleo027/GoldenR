import { describe, expect, it } from 'vitest';
import { createCaseFromKuabRecord, parseKuabImportJson, resolveKuabMsgtype } from './kuabImport';

describe('kuabImport', () => {
    it('maps msgtype_src remark tag_dest and type', () => {
        const caseItem = createCaseFromKuabRecord(
            {
                msgtype_src: 'KSPB.410203',
                remark: '证券信息',
                req: [
                    { tag_dest: 'custid', type: 'CHAR(32)', default_val: '10001' },
                    { tag_dest: 'trdpwd', type: 'CHAR(64)', default_val: '' },
                ],
            },
            '127.0.0.1:21000',
            0,
        );

        expect(caseItem).not.toBeNull();
        expect(caseItem?.name).toBe('证券信息');
        expect(caseItem?.address).toBe('127.0.0.1:21000/410203?queue=req1&timeout=15');
        expect(caseItem?.params).toEqual([
            { name: 'custid', value: '10001', type: 'string' },
            { name: 'trdpwd', value: '', type: 'string' },
        ]);
    });

    it('falls back to msgtype_dest when msgtype_src is empty', () => {
        expect(resolveKuabMsgtype({ msgtype_dest: '150501' })).toBe('150501');
    });

    it('parses json array', () => {
        const cases = parseKuabImportJson(
            [
                { msgtype_src: 'KSPB.150501', remark: '测试' },
                { msgtype_dest: '150502', remark: '第二条' },
            ],
            '127.0.0.1:21000',
        );

        expect(cases).toHaveLength(2);
        expect(cases[0].address).toContain('/150501');
        expect(cases[1].address).toContain('/150502');
    });
});
