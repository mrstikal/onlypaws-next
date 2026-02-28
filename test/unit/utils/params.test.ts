import { describe, expect, it } from 'vitest';
import { clampInt } from '@/utils/params';
import { isStaffRole } from '@/lib/server/roles';

describe('clampInt', () => {
  it('vrací default pro nečíselnou hodnotu', () => {
    expect(clampInt('abc', 10, 1, 100)).toBe(10);
  });

  it('omezuje hodnotu na spodní hranici', () => {
    expect(clampInt('-5', 10, 1, 100)).toBe(1);
  });

  it('omezuje hodnotu na horní hranici', () => {
    expect(clampInt('1000', 10, 1, 100)).toBe(100);
  });

  it('vrátí parsované číslo v rozsahu', () => {
    expect(clampInt('42', 10, 1, 100)).toBe(42);
  });
});

describe('isStaffRole', () => {
  it('pozná admin role', () => {
    expect(isStaffRole('admin')).toBe(true);
    expect(isStaffRole('superadmin')).toBe(true);
  });

  it('odmítne nestaff role', () => {
    expect(isStaffRole('user')).toBe(false);
  });
});

