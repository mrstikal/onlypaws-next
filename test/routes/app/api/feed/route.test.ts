import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/feed/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    posts: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    pets: {
      findMany: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/feed', () => {
  it('returns paginated posts with default params', async () => {
    (prisma.posts.count as ReturnType<typeof vi.fn>).mockResolvedValue(10);
    (prisma.posts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 1n,
        caption: 'Beautiful sunset',
        media_url: '/posts/1.jpg',
        media_type: 'image/jpeg',
        likes_count: 12,
        comments_count: 3,
        is_premium: false,
        created_at: new Date('2026-03-01'),
        pet: {
          id: 10n,
          name: 'Micka',
          profile_picture: null,
          followers_count: 5,
          likes_count: 20,
          posts_count: 8,
          comments_count: 15,
        },
        subscription_tiers: null,
      },
    ]);

    (prisma.pets.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 10n, name: 'Micka', profile_picture: null, followers_count: 5 },
    ]);

    const req = new Request('http://localhost/api/feed');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.posts.data).toHaveLength(1);
    expect(body.posts.data[0].caption).toBe('Beautiful sunset');
    expect(body.posts.data[0].likes_count).toBe(12);
    expect(body.posts.current_page).toBe(1);
    expect(body.recommendedPets).toHaveLength(1);
  });

  it('sorts posts by likes descending by default', async () => {
    (prisma.posts.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.posts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.pets.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new Request('http://localhost/api/feed');
    await GET(req);

    expect(prisma.posts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ likes_count: 'desc' }, { id: 'desc' }],
      })
    );
  });

  it('sorts posts by date when specified', async () => {
    (prisma.posts.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.posts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.pets.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new Request('http://localhost/api/feed?sort=date&dir=asc');
    await GET(req);

    expect(prisma.posts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ created_at: 'asc' }, { id: 'desc' }],
      })
    );
  });

  it('filters posts by search query', async () => {
    (prisma.posts.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.posts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.pets.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new Request('http://localhost/api/feed?q=sunset');
    await GET(req);

    expect(prisma.posts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { caption: { contains: 'sunset', mode: 'insensitive' } },
            { pet: { is: { name: { contains: 'sunset', mode: 'insensitive' } } } },
          ]),
        }),
      })
    );
  });

  it('handles pagination correctly', async () => {
    (prisma.posts.count as ReturnType<typeof vi.fn>).mockResolvedValue(30);
    (prisma.posts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.pets.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new Request('http://localhost/api/feed?page=2&per_page=12');
    const res = await GET(req);

    const body = await res.json();
    expect(body.posts.current_page).toBe(2);
    expect(body.posts.per_page).toBe(12);
    expect(body.posts.last_page).toBe(3);

    expect(prisma.posts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 12,
        take: 12,
      })
    );
  });

  it('includes recommended pets sorted by followers', async () => {
    (prisma.posts.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.posts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.pets.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1n, name: 'Micka', profile_picture: null, followers_count: 100 },
      { id: 2n, name: 'Alik', profile_picture: 'alik.jpg', followers_count: 50 },
    ]);

    const req = new Request('http://localhost/api/feed');
    const res = await GET(req);

    const body = await res.json();
    expect(body.recommendedPets).toHaveLength(2);
    expect(body.recommendedPets[0].name).toBe('Micka');
    expect(body.recommendedPets[0].followers_count).toBe(100);

    expect(prisma.pets.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ followers_count: 'desc' }, { id: 'desc' }],
        take: 8,
      })
    );
  });
});

