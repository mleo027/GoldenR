import { describe, expect, it } from 'vitest';
import type { TabData } from '../../types/workspace';
import { parseCaseFromClipboard, serializeCaseForClipboard } from './caseClipboard';

const sourceCase: TabData = {
    id: 'case-1',
    name: '查询接口',
    protocol: 'KCBP',
    address: '127.0.0.1:21000/150501',
    params: [{ name: 'custid', value: '1001', type: 'string' }],
    script: 'return true;',
    runInput: { fundid: '8' },
    favorite: true,
    createdAt: 1,
    updatedAt: 2,
};

describe('case clipboard codec', () => {
    it('round-trips interface content without its identity fields', () => {
        const parsed = parseCaseFromClipboard(serializeCaseForClipboard(sourceCase));

        expect(parsed).toEqual({
            name: sourceCase.name,
            protocol: sourceCase.protocol,
            address: sourceCase.address,
            params: sourceCase.params,
            script: sourceCase.script,
            runInput: sourceCase.runInput,
            requestScript: undefined,
            responseScript: undefined,
            favorite: true,
        });
    });

    it('rejects ordinary text and malformed payloads', () => {
        expect(parseCaseFromClipboard('普通文本')).toBeNull();
        expect(
            parseCaseFromClipboard(
                JSON.stringify({ type: 'golden-api/case', version: 1, case: { name: 'bad' } }),
            ),
        ).toBeNull();
    });
});
