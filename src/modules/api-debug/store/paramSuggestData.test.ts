import { describe, expect, it } from 'vitest';
import { mergeDbConfig } from './paramSuggestData';

describe('mergeDbConfig', () => {
    it('fills missing fields from defaults without exposing connection options', () => {
        const config = mergeDbConfig({});

        expect(config).toMatchObject({
            server: '127.0.0.1',
            port: 1433,
            database: '',
            user: '',
            password: '',
            queryTimeoutMs: 10000,
            maxRows: 500,
        });
        expect('options' in config).toBe(false);
    });

    it('merges partial values and drops legacy options', () => {
        const config = mergeDbConfig({
            server: '10.0.0.5',
            database: 'kcbp',
            user: 'sa',
            password: 'secret',
            options: {
                encrypt: true,
                trustServerCertificate: false,
            },
        } as never);

        expect(config).toMatchObject({
            server: '10.0.0.5',
            port: 1433,
            database: 'kcbp',
            user: 'sa',
            password: 'secret',
            queryTimeoutMs: 10000,
            maxRows: 500,
        });
        expect('options' in config).toBe(false);
    });
});
