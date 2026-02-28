import { describe, expect, it } from 'vitest';
import {
  formatCommentsCS,
  formatFollowersCS,
  formatLikesCS,
  formatPostsCS,
  pluralizeCS,
} from '@/utils/pluralize';

describe('pluralizeCS', () => {
  it('použije singular pro 1', () => {
    expect(pluralizeCS(1, 'lajk', 'lajky', 'lajků')).toBe('1 lajk');
  });

  it('použije paucal pro 2-4', () => {
    expect(pluralizeCS(4, 'lajk', 'lajky', 'lajků')).toBe('4 lajky');
  });

  it('použije plural pro ostatní hodnoty', () => {
    expect(pluralizeCS(0, 'lajk', 'lajky', 'lajků')).toBe('0 lajků');
    expect(pluralizeCS(5, 'lajk', 'lajky', 'lajků')).toBe('5 lajků');
  });
});

describe('format*CS helpery', () => {
  it('formátují likes a comments', () => {
    expect(formatLikesCS(2)).toBe('2 lajky');
    expect(formatCommentsCS(1)).toBe('1 komentář');
  });

  it('formátují followers a posts', () => {
    expect(formatFollowersCS(5)).toBe('5 sledujících');
    expect(formatPostsCS(3)).toBe('3 příspěvky');
  });
});

