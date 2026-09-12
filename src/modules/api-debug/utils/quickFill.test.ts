import { describe, expect, it } from 'vitest';
import { buildQuickFillCasePatch } from './quickFill';

describe('buildQuickFillCasePatch', () => {
    it('merges address fields while preserving fields not supplied by the result', () => {
        expect(
            buildQuickFillCasePatch(
                { address: 'host/old?queue=q%201&timeout=5' },
                {
                    params: [{ name: 'id', value: '1', type: 'string' }],
                    msgtype: 'new',
                },
            ),
        ).toEqual({
            params: [{ name: 'id', value: '1', type: 'string' }],
            address: 'host/new?queue=q+1&timeout=5',
        });
    });

    it('adds supplied service/node and title, but ignores empty metadata', () => {
        expect(
            buildQuickFillCasePatch(
                { address: 'host/old' },
                {
                    params: [],
                    service: 'svc',
                    nodeId: '7',
                    title: 'New case',
                    msgtype: '',
                },
            ),
        ).toEqual({
            params: [],
            address: 'host/old?queue=req1&service=svc&nodeid=7',
            name: 'New case',
        });
        expect(buildQuickFillCasePatch({ address: 'host/old' }, { params: [], title: '' })).toEqual(
            { params: [] },
        );
    });
});
