import { describe, expect, it } from 'vitest';
import type { ParamItem } from '../../types/workspace';
import {
    buildKcbpFields,
    buildEnabledParamFields,
    FILE_PARAM_PREFIX,
    formatFileParamValue,
    isFileParamValue,
    parseFileParamPath,
} from './kcbpFields';

describe('kcbpFields @file: prefix', () => {
    it('splits @file: values into binaryFields', () => {
        const params: ParamItem[] = [
            { name: 'g_serverid', value: '1', type: 'string' },
            {
                name: 'databody',
                value: formatFileParamValue('D:/data/1.zip'),
                type: 'string',
            },
            { name: 'datasize', value: '', type: 'string' },
            { name: 'ignored', value: 'x', type: 'disabled' },
            { name: 'emptyFile', value: FILE_PARAM_PREFIX, type: 'string' },
        ];

        expect(buildKcbpFields(params)).toEqual({
            fields: {
                g_serverid: '1',
                datasize: '',
                [params[4].name]: FILE_PARAM_PREFIX,
            },
            binaryFields: {
                databody: 'D:/data/1.zip',
            },
        });
    });

    it('still supports legacy type=file', () => {
        const params: ParamItem[] = [
            { name: 'databody', value: 'D:/data/legacy.zip', type: 'file' },
        ];

        expect(buildKcbpFields(params).binaryFields).toEqual({
            databody: 'D:/data/legacy.zip',
        });
    });

    it('parses file path from @file: prefix', () => {
        expect(parseFileParamPath('@file:D:/data/a.zip')).toBe('D:/data/a.zip');
        expect(isFileParamValue('@file:D:/data/a.zip')).toBe(true);
        expect(isFileParamValue('D:/data/a.zip')).toBe(false);
    });

    it('buildEnabledParamFields returns text fields only', () => {
        const params: ParamItem[] = [
            { name: 'market', value: '1', type: 'string' },
            { name: 'databody', value: '@file:D:/data/1.zip', type: 'string' },
        ];

        expect(buildEnabledParamFields(params)).toEqual({ market: '1' });
    });
});
