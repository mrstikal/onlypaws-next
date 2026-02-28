import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { loadPostsPage } from '@/lib/server/cms/posts/queries';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    posts: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('posts queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds filtered query and maps rows', async () => {
    vi.mocked(prisma.posts.count).mockResolvedValue(1);
    vi.mocked(prisma.posts.findMany).mockResolvedValue([
      {
        id: 10n,
        pet_id: 20n,
        caption: 'hello world',
        is_premium: true,
        media_url: 'dog.jpg',
        media_type: 'image',
        likes_count: 2,
        comments_count: 3,
        created_at: new Date('2024-01-01T10:00:00.000Z'),
        pet: { name: 'Rex', user_id: 5n, user: { name: 'Owner', email: 'o@example.com' } },
      },
    ] as never);

    const result = await loadPostsPage({
      scope: 'mine',
      viewerUserId: 5n,
      page: 0,
      perPage: 500,
      q: 'hello',
      premium: 'premium',
    });

    expect(prisma.posts.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ AND: expect.any(Array) }),
    });
    expect(prisma.posts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 100 })
    );

    expect(result.page).toBe(1);
    expect(result.perPage).toBe(100);
    expect(result.rows[0]).toMatchObject({
      id: '10',
      pet_id: '20',
      owner_user_id: '5',
      pet_name: 'Rex',
      media_url: '/media/posts/dog.jpg',
      likes_count: 2,
      comments_count: 3,
    });
  });
});

