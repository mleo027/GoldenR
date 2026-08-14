import { describe, expect, it } from 'vitest';
import { buildKcbpRuntimeConfigFromFormValues, kcbpRuntimeConfigToFormValues } from './configForm';

describe('Kcbp runtime config form mapping', () => {
    it('falls back to defaults for empty values', () => {
        expect(buildKcbpRuntimeConfigFromFormValues({})).toEqual({
            executable: '',
            workingDir: '',
            args: [],
        });
    });

    it('splits argsText into trimmed non-empty lines', () => {
        expect(
            buildKcbpRuntimeConfigFromFormValues({
                executable: '  cli.exe ',
                workingDir: ' C:/run ',
                argsText: '  -a  \n\n-b\n',
            }),
        ).toEqual({
            executable: 'cli.exe',
            workingDir: 'C:/run',
            args: ['-a', '-b'],
        });
    });

    it('keeps existing args array and converts config back to form values', () => {
        const config = {
            executable: 'cli.exe',
            workingDir: 'C:/run',
            args: ['-a', '-b'],
        };
        expect(buildKcbpRuntimeConfigFromFormValues(config)).toEqual(config);
        expect(kcbpRuntimeConfigToFormValues(config)).toEqual({
            ...config,
            argsText: '-a\n-b',
        });
    });
});
