import { describe, expect, it } from 'vitest';
import { formatDateTimeCS } from '@/utils/datetime';

describe('formatDateTimeCS', () => {
  it('returns placeholder for empty/invalid values', () => {
    expect(formatDateTimeCS(null)).toBe('—');
    expect(formatDateTimeCS(undefined)).toBe('—');
    expect(formatDateTimeCS('invalid-date')).toBe('—');
  });

  it('formats Date and string values', () => {
    const iso = '2026-02-10T14:05:00.000Z';
    const fromString = formatDateTimeCS(iso);
    const fromDate = formatDateTimeCS(new Date(iso));

    expect(fromString).not.toBe('—');
    expect(fromDate).not.toBe('—');
  });
});

