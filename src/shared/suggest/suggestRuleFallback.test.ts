import { describe, expect, it } from 'vitest';
import {
    finalizeEmptySuggestResponse,
    shouldFallbackToNextSuggestRule,
    SUGGEST_EMPTY_RESULT_MESSAGE,
} from './suggestRuleFallback';

describe('shouldFallbackToNextSuggestRule', () => {
    it('falls back when query succeeded with zero rows', () => {
        expect(
            shouldFallbackToNextSuggestRule({
                options: [],
                emptyResult: true,
            }),
        ).toBe(true);
    });

    it('stops when options are returned', () => {
        expect(
            shouldFallbackToNextSuggestRule({
                options: [{ value: '1', label: '1' }],
                emptyResult: true,
            }),
        ).toBe(false);
    });

    it('stops when pending deps block execution', () => {
        expect(
            shouldFallbackToNextSuggestRule({
                options: [],
                emptyResult: true,
                pendingDeps: ['fundid'],
            }),
        ).toBe(false);
    });

    it('stops on hard errors without emptyResult', () => {
        expect(
            shouldFallbackToNextSuggestRule({
                options: [],
                error: '连接失败',
            }),
        ).toBe(false);
    });
});

describe('finalizeEmptySuggestResponse', () => {
    it('adds default message for empty successful query', () => {
        expect(
            finalizeEmptySuggestResponse({
                options: [],
                emptyResult: true,
            }).error,
        ).toBe(SUGGEST_EMPTY_RESULT_MESSAGE);
    });

    it('preserves existing hard error', () => {
        expect(
            finalizeEmptySuggestResponse({
                options: [],
                error: '列映射失败',
            }).error,
        ).toBe('列映射失败');
    });
});
