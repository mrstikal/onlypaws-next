import { describe, expect, it } from 'vitest';
import {
  validateBigInt,
  validateEmail,
  validateIds,
  validatePaginationParams,
  validatePassword,
  validateRange,
  validateSlug,
} from '@/lib/api/validation';

describe('validateEmail', () => {
  it('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(validateEmail('user@')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('rejects short password', () => {
    expect(validatePassword('1234567')).toBeTruthy();
  });

  it('accepts password with length 8+', () => {
    expect(validatePassword('12345678')).toBeNull();
  });
});

describe('validateSlug', () => {
  it('accepts valid slug', () => {
    expect(validateSlug('muj-slug-123')).toBe(true);
  });

  it('rejects invalid slug variants', () => {
    expect(validateSlug('MujSlug')).toBe(false);
    expect(validateSlug('-slug')).toBe(false);
    expect(validateSlug('slug-')).toBe(false);
    expect(validateSlug('slug__x')).toBe(false);
  });
});

describe('validateRange', () => {
  it('returns true when value is in range including boundaries', () => {
    expect(validateRange(1, 1, 10)).toBe(true);
    expect(validateRange(10, 1, 10)).toBe(true);
  });

  it('returns false when out of range', () => {
    expect(validateRange(0, 1, 10)).toBe(false);
    expect(validateRange(11, 1, 10)).toBe(false);
  });
});

describe('validateIds', () => {
  it('accepts array of string/number ids', () => {
    expect(validateIds(['a', 1, '2'])).toBe(true);
  });

  it('rejects non-array and invalid member types', () => {
    expect(validateIds('a' as unknown as unknown[])).toBe(false);
    expect(validateIds(['a', null] as unknown[])).toBe(false);
  });
});

describe('validateBigInt', () => {
  it('parses numeric values', () => {
    expect(validateBigInt('123')).toBe(123n);
    expect(validateBigInt(456)).toBe(456n);
  });

  it('returns null for invalid values', () => {
    expect(validateBigInt('abc')).toBeNull();
    expect(validateBigInt({})).toBeNull();
  });
});

describe('validatePaginationParams', () => {
  it('returns parsed params for valid values', () => {
    expect(validatePaginationParams('2', '20')).toEqual({ page: 2, perPage: 20 });
  });

  it('returns null for invalid pagination values', () => {
    expect(validatePaginationParams('0', '20')).toBeNull();
    expect(validatePaginationParams('2', '0')).toBeNull();
    expect(validatePaginationParams('x', '20')).toBeNull();
  });
});

