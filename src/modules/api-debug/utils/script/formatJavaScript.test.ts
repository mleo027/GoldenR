import { describe, expect, it } from 'vitest';
import { formatJavaScript } from './formatJavaScript';

describe('formatJavaScript', () => {
    it('formats compact function body', async () => {
        const result = await formatJavaScript(
            "async function main(ctx){const x=1;return await call({g_funcid:'150501'});}",
        );
        expect(result).toContain('async function main');
        expect(result).toContain("g_funcid: '150501'");
        expect(result.split('\n').length).toBeGreaterThan(1);
    });

    it('returns empty-ish source unchanged', async () => {
        expect(await formatJavaScript('')).toBe('');
        expect(await formatJavaScript('   ')).toBe('   ');
    });
});
