import { describe, expect, it } from 'vitest';
import { formatDateTime, formatIsoDateTimeBeijing } from './formatDateTime';

describe('formatDateTime', () => {
    it('formats timestamp as YYYY-MM-DD HH:mm:ss', () => {
        // 2024-03-15 08:09:07 local time
        const timestamp = new Date(2024, 2, 15, 8, 9, 7).getTime();
        expect(formatDateTime(timestamp)).toBe('2024-03-15 08:09:07');
    });

    it('zero-pads single digit parts', () => {
        const timestamp = new Date(2024, 0, 5, 3, 4, 5).getTime();
        expect(formatDateTime(timestamp)).toBe('2024-01-05 03:04:05');
    });
});

describe('formatIsoDateTimeBeijing', () => {
    it('converts UTC ISO string to Beijing time', () => {
        expect(formatIsoDateTimeBeijing('2026-06-26T06:46:41.648Z')).toBe('2026-06-26 14:46:41');
    });

    it('returns dash for empty value', () => {
        expect(formatIsoDateTimeBeijing()).toBe('—');
    });
});
