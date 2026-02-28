import { describe, expect, it } from 'vitest';
import { publicUrl } from '@/utils/mediaUrl';

describe('publicUrl', () => {
  it('vrací null pro prázdnou hodnotu', () => {
    expect(publicUrl('pets', null)).toBeNull();
    expect(publicUrl('pets', '   ')).toBeNull();
  });

  it('ponechá absolutní URL', () => {
    expect(publicUrl('pets', 'https://cdn.example.com/pet.jpg')).toBe('https://cdn.example.com/pet.jpg');
  });

  it('ponechá absolutní cestu začínající /', () => {
    expect(publicUrl('posts', '/media/posts/a.jpg')).toBe('/media/posts/a.jpg');
  });

  it('normalizuje relativní cestu bez prefixu složky', () => {
    expect(publicUrl('pets', 'cat.jpg')).toBe('/media/pets/cat.jpg');
  });

  it('odstraní duplicitní prefix složky', () => {
    expect(publicUrl('posts', 'posts/story.jpg')).toBe('/media/posts/story.jpg');
  });
});

