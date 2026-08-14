import { describe, expect, it } from 'vitest';
import { createScriptConsole } from './scriptConsole';

describe('createScriptConsole', () => {
    it('captures log levels', () => {
        const capture = createScriptConsole();
        capture.api.log('hello', 1);
        capture.api.warn('careful');
        capture.api.error('failed');
        capture.append('return', '{"ok":true}');

        expect(capture.snapshot().entries).toEqual([
            expect.objectContaining({ level: 'log', message: 'hello 1' }),
            expect.objectContaining({ level: 'warn', message: 'careful' }),
            expect.objectContaining({ level: 'error', message: 'failed' }),
            expect.objectContaining({ level: 'return', message: '{"ok":true}' }),
        ]);
    });

    it('clears entries', () => {
        const capture = createScriptConsole();
        capture.api.log('x');
        capture.clear();
        expect(capture.snapshot().entries).toEqual([]);
    });
});
