import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/posts/[id]/likes/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    posts: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/posts/[id]/likes', () => {
  const userAuth = {
    isAuthed: true,
    user: { id: '5', name: 'User', email: 'user@example.com', role: 'user' as const },
  } as const;

  const staffAuth = {
    isAuthed: true,
    user: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin' as const },
  } as const;

  it('returns 401 when unauthenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const res = await POST(new Request('http://localhost/api/posts/10/likes', { method: 'POST' }), {
      params: Promise.resolve({ id: '10' }),
    });

    expect(res.status).toBe(401);
  });

  it('returns 403 for staff role', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    const res = await POST(new Request('http://localhost/api/posts/10/likes', { method: 'POST' }), {
      params: Promise.resolve({ id: '10' }),
    });

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid post id', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const res = await POST(new Request('http://localhost/api/posts/invalid/likes', { method: 'POST' }), {
      params: Promise.resolve({ id: 'invalid' }),
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid post id' });
  });

  it('returns 404 when post does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);
    (prisma.posts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(new Request('http://localhost/api/posts/999/likes', { method: 'POST' }), {
      params: Promise.resolve({ id: '999' }),
    });

    expect(res.status).toBe(404);
  });

  it('returns 403 when user tries to like own post', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);
    (prisma.posts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      likes_count: 0,
      pet: { user_id: 5n },
    });

    const res = await POST(new Request('http://localhost/api/posts/10/likes', { method: 'POST' }), {
      params: Promise.resolve({ id: '10' }),
    });

    expect(res.status).toBe(403);
  });

  it('returns existing liked state on P2002 unique constraint violation (idempotent)', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);
    (prisma.posts.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        id: 10n,
        likes_count: 7,
        pet: { user_id: 15n },
      })
      .mockResolvedValueOnce({
        id: 10n,
        likes_count: 7,
        pet: { user_id: 15n },
      });

    // Simulace P2002 chyby z databáze
    const p2002Error = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(p2002Error);

    const res = await POST(new Request('http://localhost/api/posts/10/likes', { method: 'POST' }), {
      params: Promise.resolve({ id: '10' }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ liked: true, likes_count: 7 });
  });

  it('creates like and increments likes_count when like does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.posts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      likes_count: 7,
      pet: { user_id: 15n },
    });

    const txLikesCreate = vi.fn().mockResolvedValue({ id: 777n });
    const txPostsUpdate = vi.fn().mockResolvedValue({ likes_count: 8 });

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
      return callback({
        likes: {
          create: txLikesCreate,
        },
        posts: {
          update: txPostsUpdate,
        },
      });
    });

    const res = await POST(new Request('http://localhost/api/posts/10/likes', { method: 'POST' }), {
      params: Promise.resolve({ id: '10' }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ liked: true, likes_count: 8 });

    expect(txLikesCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user_id: 5n,
        likeable_type: 'App\\Models\\Post',
        likeable_id: 10n,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      }),
    });

    expect(txPostsUpdate).toHaveBeenCalledWith({
      where: { id: 10n },
      data: { likes_count: { increment: 1 } },
      select: { likes_count: true },
    });
  });
});

