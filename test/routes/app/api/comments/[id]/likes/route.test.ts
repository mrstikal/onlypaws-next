import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/comments/[id]/likes/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    comments: {
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

describe('POST /api/comments/[id]/likes', () => {
  const userAuth = {
    isAuthed: true,
    user: { id: '8', name: 'User', email: 'user@example.com', role: 'user' as const },
  } as const;

  const staffAuth = {
    isAuthed: true,
    user: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'superadmin' as const },
  } as const;

  it('returns 401 when unauthenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const res = await POST(
      new Request('http://localhost/api/comments/10/likes', { method: 'POST' }),
      { params: Promise.resolve({ id: '10' }) }
    );

    expect(res.status).toBe(401);
  });

  it('returns 403 for staff role', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    const res = await POST(
      new Request('http://localhost/api/comments/10/likes', { method: 'POST' }),
      { params: Promise.resolve({ id: '10' }) }
    );

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid comment id', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const res = await POST(
      new Request('http://localhost/api/comments/invalid/likes', { method: 'POST' }),
      { params: Promise.resolve({ id: 'invalid' }) }
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid comment id' });
  });

  it('returns 404 when comment does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);
    (prisma.comments.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(
      new Request('http://localhost/api/comments/999/likes', { method: 'POST' }),
      { params: Promise.resolve({ id: '999' }) }
    );

    expect(res.status).toBe(404);
  });

  it('returns 403 when user tries to like own comment', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);
    (prisma.comments.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      user_id: 8n,
      likes_count: 2,
    });

    const res = await POST(
      new Request('http://localhost/api/comments/10/likes', { method: 'POST' }),
      { params: Promise.resolve({ id: '10' }) }
    );

    expect(res.status).toBe(403);
  });

  it('returns existing liked state on P2002 unique constraint violation (idempotent)', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);
    (prisma.comments.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        id: 10n,
        user_id: 99n,
        likes_count: 6,
      })
      .mockResolvedValueOnce({
        id: 10n,
        user_id: 99n,
        likes_count: 6,
      });

    // Simulace P2002 chyby z databáze
    const p2002Error = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(p2002Error);

    const res = await POST(
      new Request('http://localhost/api/comments/10/likes', { method: 'POST' }),
      { params: Promise.resolve({ id: '10' }) }
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ liked: true, likes_count: 6 });
  });

  it('creates like and increments likes_count when like does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.comments.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      user_id: 99n,
      likes_count: 6,
    });

    const txLikesCreate = vi.fn().mockResolvedValue({ id: 333n });
    const txCommentsUpdate = vi.fn().mockResolvedValue({ likes_count: 7 });

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
      return callback({
        likes: {
          create: txLikesCreate,
        },
        comments: {
          update: txCommentsUpdate,
        },
      });
    });

    const res = await POST(
      new Request('http://localhost/api/comments/10/likes', { method: 'POST' }),
      { params: Promise.resolve({ id: '10' }) }
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ liked: true, likes_count: 7 });

    expect(txLikesCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user_id: 8n,
        likeable_type: 'App\\Models\\Comment',
        likeable_id: 10n,
      }),
    });

    expect(txCommentsUpdate).toHaveBeenCalledWith({
      where: { id: 10n },
      data: { likes_count: { increment: 1 } },
      select: { likes_count: true },
    });
  });
});

