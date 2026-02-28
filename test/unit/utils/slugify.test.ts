import { describe, expect, it } from 'vitest';
import { slugify } from '@/utils/slugify';

describe('slugify', () => {
  it('normalizuje diakritiku a mezery', () => {
    expect(slugify('Český Kocour 2026')).toBe('cesky-kocour-2026');
  });

  it('odstraní nealfanumerické znaky a ořízne pomlčky', () => {
    expect(slugify('***Mňau!!!***')).toBe('mnau');
  });

  it('vrací prázdný řetězec pro vstup bez písmen/cifer', () => {
    expect(slugify('---')).toBe('');
  });
});

