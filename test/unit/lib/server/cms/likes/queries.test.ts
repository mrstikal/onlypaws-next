import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { loadLikesPage } from '@/lib/server/cms/likes/queries';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    likes: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    posts: {
      findMany: vi.fn(),
    },
    pets: {
      findMany: vi.fn(),
    },
    comments: {
      findMany: vi.fn(),
    },
  },
}));

describe('likes queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves polymorphic likeable labels', async () => {
    vi.mocked(prisma.likes.count).mockResolvedValue(1);
    vi.mocked(prisma.likes.findMany).mockResolvedValue([
      {
        id: 1n,
        user_id: 5n,
        likeable_type: 'App\\Models\\Post',
        likeable_id: 9n,
        created_at: new Date('2024-01-01T00:00:00.000Z'),
        user: { name: 'U', email: 'u@example.com' },
      },
    ] as never);
    vi.mocked(prisma.posts.findMany).mockResolvedValue([
      { id: 9n, caption: 'Caption', pet: { name: 'Rex' } },
    ] as never);
    vi.mocked(prisma.pets.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.comments.findMany).mockResolvedValue([] as never);

    const result = await loadLikesPage({
      scope: 'all',
      viewerUserId: 5n,
      page: 1,
      perPage: 20,
    });

    expect(result.rows[0]).toMatchObject({
      id: '1',
      user_id: '5',
      likeable_id: '9',
      likeable_label: 'Rex: Caption',
    });
  });
});

