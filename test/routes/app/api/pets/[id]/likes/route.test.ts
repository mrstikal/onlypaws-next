import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/pets/[id]/likes/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pets: {
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

describe('POST /api/pets/[id]/likes', () => {
  const userAuth = {
    isAuthed: true,
    user: { id: '7', name: 'User', email: 'user@example.com', role: 'user' as const },
  } as const;

  const staffAuth = {
    isAuthed: true,
    user: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin' as const },
  } as const;

  it('returns 401 when unauthenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const res = await POST(new Request('http://localhost/api/pets/10/likes', { method: 'POST' }), {
      params: Promise.resolve({ id: '10' }),
    });

    expect(res.status).toBe(401);
  });

  it('returns 403 for staff role', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    const res = await POST(new Request('http://localhost/api/pets/10/likes', { method: 'POST' }), {
      params: Promise.resolve({ id: '10' }),
    });

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid pet id', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const res = await POST(new Request('http://localhost/api/pets/invalid/likes', { method: 'POST' }), {
      params: Promise.resolve({ id: 'invalid' }),
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid pet id' });
  });

  it('returns 404 when pet does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);
    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(new Request('http://localhost/api/pets/999/likes', { method: 'POST' }), {
      params: Promise.resolve({ id: '999' }),
    });

    expect(res.status).toBe(404);
  });

  it('returns 403 when user tries to like own pet', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);
    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      user_id: 7n,
      likes_count: 4,
    });

    const res = await POST(new Request('http://localhost/api/pets/10/likes', { method: 'POST' }), {
      params: Promise.resolve({ id: '10' }),
    });

    expect(res.status).toBe(403);
  });

  it('returns existing liked state on P2002 unique constraint violation (idempotent)', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);
    (prisma.pets.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        id: 10n,
        user_id: 99n,
        likes_count: 7,
      })
      .mockResolvedValueOnce({
        id: 10n,
        user_id: 99n,
        likes_count: 7,
      });

    // Simulace P2002 chyby z databáze
    const p2002Error = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(p2002Error);

    const res = await POST(new Request('http://localhost/api/pets/10/likes', { method: 'POST' }), {
      params: Promise.resolve({ id: '10' }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ liked: true, likes_count: 7 });
  });

  it('creates like and increments likes_count when like does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      user_id: 99n,
      likes_count: 7,
    });

    const txLikesCreate = vi.fn().mockResolvedValue({ id: 777n });
    const txPetsUpdate = vi.fn().mockResolvedValue({ likes_count: 8 });

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
      return callback({
        likes: {
          create: txLikesCreate,
        },
        pets: {
          update: txPetsUpdate,
        },
      });
    });

    const res = await POST(new Request('http://localhost/api/pets/10/likes', { method: 'POST' }), {
      params: Promise.resolve({ id: '10' }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ liked: true, likes_count: 8 });

    expect(txLikesCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user_id: 7n,
        likeable_type: 'App\\Models\\Pet',
        likeable_id: 10n,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      }),
    });

    expect(txPetsUpdate).toHaveBeenCalledWith({
      where: { id: 10n },
      data: { likes_count: { increment: 1 } },
      select: { likes_count: true },
    });
  });
});

