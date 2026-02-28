import { describe, expect, it } from 'vitest';
import { bigIntToString, parseBigIntParam } from '@/utils/bigint';

describe('bigIntToString', () => {
  it('serializes bigint value', () => {
    expect(bigIntToString(123n)).toBe('123');
  });

  it('serializes non-bigint values via String()', () => {
    expect(bigIntToString(42)).toBe('42');
    expect(bigIntToString(null)).toBe('null');
  });
});

describe('parseBigIntParam', () => {
  it('parses valid bigint strings', () => {
    expect(parseBigIntParam('9007199254740993')).toBe(9007199254740993n);
  });

  it('returns null for invalid values', () => {
    expect(parseBigIntParam('abc')).toBeNull();
    expect(parseBigIntParam('12.4')).toBeNull();
  });
});

