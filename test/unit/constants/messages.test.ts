import { describe, expect, it } from 'vitest';
import { MESSAGES } from '@/constants/messages';

describe('MESSAGES', () => {
  it('exposes non-empty critical auth and server errors', () => {
    expect(MESSAGES.ERROR.INVALID_CREDENTIALS.length).toBeGreaterThan(0);
    expect(MESSAGES.ERROR.UNAUTHORIZED.length).toBeGreaterThan(0);
    expect(MESSAGES.ERROR.INTERNAL_ERROR.length).toBeGreaterThan(0);
  });

  it('exposes non-empty common success messages', () => {
    expect(MESSAGES.SUCCESS.LOGIN.length).toBeGreaterThan(0);
    expect(MESSAGES.SUCCESS.UPDATE.length).toBeGreaterThan(0);
    expect(MESSAGES.SUCCESS.DELETE.length).toBeGreaterThan(0);
  });
});

