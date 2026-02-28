import { describe, expect, it } from 'vitest';
import {
  parseBigIntParam,
  bigIntToString,
  clampInt,
  asString,
  normalizeSortDir,
  toggleDir,
  buildHref,
} from '@/lib/cms/params';

describe('CMS Params Utilities', () => {
  describe('parseBigIntParam', () => {
    it('parses valid string to bigint', () => {
      const result = parseBigIntParam('123');
      expect(result).toBe(123n);
    });

    it('parses unknown to bigint', () => {
      const result = parseBigIntParam(456);
      expect(result).toBe(456n);
    });

    it('returns null for invalid input', () => {
      expect(parseBigIntParam('abc')).toBeNull();
      expect(parseBigIntParam(NaN)).toBeNull();
    });

    it('parses empty string as 0', () => {
      // BigInt('') parses as 0n, which is technically valid
      expect(parseBigIntParam('')).toBe(0n);
    });
  });

  describe('bigIntToString', () => {
    it('converts bigint to string', () => {
      expect(bigIntToString(123n)).toBe('123');
    });

    it('converts number to string', () => {
      expect(bigIntToString(456)).toBe('456');
    });

    it('converts other values to string', () => {
      expect(bigIntToString('hello')).toBe('hello');
      expect(bigIntToString(null)).toBe('null');
      expect(bigIntToString(undefined)).toBe('undefined');
    });
  });

  describe('clampInt', () => {
    it('returns parsed integer within range', () => {
      expect(clampInt('50', 1, 0, 100)).toBe(50);
    });

    it('clamps to minimum', () => {
      expect(clampInt('-10', 1, 0, 100)).toBe(0);
    });

    it('clamps to maximum', () => {
      expect(clampInt('150', 1, 0, 100)).toBe(100);
    });

    it('returns default for invalid value', () => {
      expect(clampInt('abc', 42, 0, 100)).toBe(42);
      expect(clampInt(null, 42, 0, 100)).toBe(42);
    });
  });

  describe('asString', () => {
    it('returns string value', () => {
      expect(asString('hello')).toBe('hello');
    });

    it('returns null for array', () => {
      expect(asString(['a', 'b'])).toBeNull();
    });

    it('returns null for undefined', () => {
      expect(asString(undefined)).toBeNull();
    });
  });

  describe('normalizeSortDir', () => {
    it('returns asc for asc', () => {
      expect(normalizeSortDir('asc')).toBe('asc');
    });

    it('defaults to desc', () => {
      expect(normalizeSortDir('desc')).toBe('desc');
      expect(normalizeSortDir('invalid')).toBe('desc');
      expect(normalizeSortDir(null)).toBe('desc');
    });
  });

  describe('toggleDir', () => {
    it('returns asc when key changes', () => {
      expect(toggleDir('oldkey', 'desc', 'newkey')).toBe('asc');
    });

    it('toggles between asc and desc on same key', () => {
      expect(toggleDir('key', 'asc', 'key')).toBe('desc');
      expect(toggleDir('key', 'desc', 'key')).toBe('asc');
    });

    it('returns asc when dir is null/invalid', () => {
      expect(toggleDir('key', null, 'key')).toBe('asc');
      expect(toggleDir('key', 'invalid', 'key')).toBe('asc');
    });
  });

  describe('buildHref', () => {
    it('builds href with params', () => {
      const href = buildHref('/cms/posts', {
        page: '2',
        sort: 'name',
        dir: 'asc',
      });
      expect(href).toContain('/cms/posts?');
      expect(href).toContain('page=2');
      expect(href).toContain('sort=name');
      expect(href).toContain('dir=asc');
    });

    it('omits null, undefined, empty values', () => {
      const href = buildHref('/cms/posts', {
        page: '1',
        sort: null,
        dir: undefined,
        q: '',
      });
      expect(href).toBe('/cms/posts?page=1');
    });

    it('returns base path without params', () => {
      const href = buildHref('/cms/posts', {
        sort: null,
        dir: undefined,
      });
      expect(href).toBe('/cms/posts');
    });
  });
});

