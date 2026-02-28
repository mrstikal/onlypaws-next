import { describe, expect, it } from 'vitest';
import { config } from '@/lib/config';
import { LIMITS } from '@/constants/limits';

describe('config', () => {
  it('keeps upload and auth limits aligned with constants', () => {
    expect(config.upload.maxBytes).toBe(LIMITS.UPLOAD.MAX_FILE_SIZE);
    expect(config.upload.maxBytesAvatar).toBe(LIMITS.UPLOAD.MAX_FILE_SIZE_AVATAR);
    expect(config.auth.minPasswordLength).toBe(LIMITS.AUTH.MIN_PASSWORD_LENGTH);
  });

  it('has sensible pagination constraints', () => {
    expect(config.pagination.minPerPage).toBeLessThanOrEqual(config.pagination.defaultPerPage);
    expect(config.pagination.defaultPerPage).toBeLessThanOrEqual(config.pagination.maxPerPage);
    expect(config.pagination.maxPage).toBeGreaterThan(0);
  });
});

