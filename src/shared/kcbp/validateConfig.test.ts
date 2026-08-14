import { describe, expect, it } from 'vitest';
import { createDefaultKcbpRuntimeConfig } from './defaults';
import { validateKcbpRuntimeConfig } from './validateConfig';

describe('validateKcbpRuntimeConfig', () => {
    it('returns missing required fields for empty config', () => {
        expect(validateKcbpRuntimeConfig(createDefaultKcbpRuntimeConfig())).toEqual([
            '请配置 KCBP 可执行文件路径',
            '请配置 KCBP 工作目录',
        ]);
    });

    it('passes when required fields are present', () => {
        expect(
            validateKcbpRuntimeConfig({
                executable: 'C:\\kcbp\\kcbp.exe',
                workingDir: 'C:\\kcbp',
                args: ['-x'],
            }),
        ).toEqual([]);
    });
});
