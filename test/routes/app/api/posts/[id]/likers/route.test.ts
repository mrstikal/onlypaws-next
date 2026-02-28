import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/posts/[id]/likers/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    likes: {
      findMany: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/posts/[id]/likers', () => {
  it('returns 400 for invalid post id', async () => {
    const req = new Request('http://localhost/api/posts/invalid/likers');
    const res = await GET(req, { params: Promise.resolve({ id: 'invalid' }) });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid post id' });
  });

  it('returns empty likers array when post has no likes', async () => {
    (prisma.likes.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new Request('http://localhost/api/posts/10/likers');
    const res = await GET(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.likers).toEqual([]);

    expect(prisma.likes.findMany).toHaveBeenCalledWith({
      where: {
        likeable_type: 'App\\Models\\Post',
        likeable_id: 10n,
      },
      orderBy: [{ id: 'desc' }],
      take: 200,
      select: {
        user: { select: { id: true, name: true } },
      },
    });
  });

  it('returns likers with proper data transformation', async () => {
    (prisma.likes.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        user: { id: 1n, name: 'Alice' },
      },
      {
        user: { id: 2n, name: 'Bob' },
      },
      {
        user: { id: 3n, name: 'Charlie' },
      },
    ]);

    const req = new Request('http://localhost/api/posts/10/likers');
    const res = await GET(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.likers).toHaveLength(3);
    expect(body.likers[0]).toEqual({ id: 1, name: 'Alice' });
    expect(body.likers[1]).toEqual({ id: 2, name: 'Bob' });
    expect(body.likers[2]).toEqual({ id: 3, name: 'Charlie' });
  });

  it('respects 200 like limit', async () => {
    const manyLikes = Array.from({ length: 200 }, (_, i) => ({
      user: { id: BigInt(i + 1), name: `User${i + 1}` },
    }));

    (prisma.likes.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(manyLikes);

    const req = new Request('http://localhost/api/posts/10/likers');
    const res = await GET(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.likers).toHaveLength(200);

    expect(prisma.likes.findMany).toHaveBeenCalledWith({
      where: {
        likeable_type: 'App\\Models\\Post',
        likeable_id: 10n,
      },
      orderBy: [{ id: 'desc' }],
      take: 200,
      select: {
        user: { select: { id: true, name: true } },
      },
    });
  });

  it('filters out null users', async () => {
    (prisma.likes.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        user: { id: 1n, name: 'Alice' },
      },
      {
        user: null,
      },
      {
        user: { id: 2n, name: 'Bob' },
      },
    ]);

    const req = new Request('http://localhost/api/posts/10/likers');
    const res = await GET(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.likers).toHaveLength(2);
    expect(body.likers[0]).toEqual({ id: 1, name: 'Alice' });
    expect(body.likers[1]).toEqual({ id: 2, name: 'Bob' });
  });

  it('converts bigint ids to numbers', async () => {
    (prisma.likes.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        user: { id: 9223372036854775807n, name: 'LargeId' },
      },
    ]);

    const req = new Request('http://localhost/api/posts/10/likers');
    const res = await GET(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.likers[0].id).toBe(9223372036854775807);
    expect(typeof body.likers[0].id).toBe('number');
  });

  it('orders likers by id descending', async () => {
    const req = new Request('http://localhost/api/posts/10/likers');
    await GET(req, { params: Promise.resolve({ id: '10' }) });

    expect(prisma.likes.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ id: 'desc' }],
      })
    );
  });
});

