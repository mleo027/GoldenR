import { describe, expect, it } from 'vitest';
import { getPathEnvShortLabel, getPathEnvVariant } from './pathEnvVariant';

describe('pathEnvVariant', () => {
    it('detects dev/test/prod variants', () => {
        expect(getPathEnvVariant('开发')).toBe('dev');
        expect(getPathEnvVariant('UAT测试')).toBe('test');
        expect(getPathEnvVariant('生产环境')).toBe('prod');
    });

    it('returns short labels', () => {
        expect(getPathEnvShortLabel('开发')).toBe('DEV');
        expect(getPathEnvShortLabel('预发环境')).toBe('TEST');
    });
});
