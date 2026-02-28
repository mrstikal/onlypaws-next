import { describe, expect, it } from 'vitest';
import { LIMITS } from '@/constants/limits';

describe('LIMITS', () => {
  it('has positive file size limits in bytes and MB', () => {
    expect(LIMITS.UPLOAD.MAX_FILE_SIZE).toBeGreaterThan(0);
    expect(LIMITS.UPLOAD.MAX_FILE_SIZE_AVATAR).toBeGreaterThan(0);
    expect(LIMITS.UPLOAD.MAX_FILE_SIZE_MB).toBeGreaterThan(0);
    expect(LIMITS.UPLOAD.MAX_FILE_SIZE_AVATAR_MB).toBeGreaterThan(0);
  });

  it('keeps pagination min <= default <= max', () => {
    expect(LIMITS.PAGINATION.MIN_PER_PAGE).toBeLessThanOrEqual(LIMITS.PAGINATION.DEFAULT_PER_PAGE);
    expect(LIMITS.PAGINATION.DEFAULT_PER_PAGE).toBeLessThanOrEqual(LIMITS.PAGINATION.MAX_PER_PAGE);
  });
});

