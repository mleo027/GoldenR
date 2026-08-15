import { describe, expect, it } from 'vitest';
import { assertTrustedRenderer } from './security';

describe('IPC renderer security', () => {
    it('rejects subframe requests', () => {
        expect(() =>
            assertTrustedRenderer({
                senderFrame: { parent: {}, url: 'file:///app/index.html' },
            } as never),
        ).toThrow('main frame');
    });

    it('rejects unexpected document URLs', () => {
        expect(() =>
            assertTrustedRenderer({
                senderFrame: { parent: null, url: 'https://example.test' },
            } as never),
        ).toThrow('untrusted');
    });

    it('allows packaged main-frame documents', () => {
        expect(() =>
            assertTrustedRenderer({
                senderFrame: { parent: null, url: 'file:///app/index.html' },
            } as never),
        ).not.toThrow();
    });
});
