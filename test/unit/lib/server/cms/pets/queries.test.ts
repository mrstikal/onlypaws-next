import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { loadPetsPage } from '@/lib/server/cms/pets/queries';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pets: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('pets queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps pets page response', async () => {
    vi.mocked(prisma.pets.count).mockResolvedValue(1);
    vi.mocked(prisma.pets.findMany).mockResolvedValue([
      {
        id: 1n,
        name: 'Micka',
        user_id: 2n,
        created_at: new Date('2024-01-01T00:00:00.000Z'),
        profile_picture: 'pets/micka.jpg',
        likes_count: 4,
        followers_count: 5,
        posts_count: 6,
        comments_count: 7,
        user: { name: 'Owner', email: 'owner@example.com' },
        breeds: { name: 'Sphynx', species: 'cat' },
      },
    ] as never);

    const result = await loadPetsPage({
      scope: 'mine',
      viewerUserId: 2n,
      page: 1,
      perPage: 20,
    });

    expect(prisma.pets.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 20 }));
    expect(result.rows[0]).toMatchObject({
      id: '1',
      user_id: '2',
      name: 'Micka',
      species: 'cat',
      profile_picture: '/media/pets/micka.jpg',
      likes_count: 4,
      followers_count: 5,
      posts_count: 6,
      comments_count: 7,
    });
  });
});

