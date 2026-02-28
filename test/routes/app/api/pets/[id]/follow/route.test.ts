import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/pets/[id]/follow/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pets: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    follows: {
      findFirst: vi.fn(),
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

describe('POST /api/pets/[id]/follow', () => {
  const userAuth = {
    isAuthed: true,
    user: { id: '7', name: 'User', email: 'user@example.com', role: 'user' as const },
  } as const;

  const staffAuth = {
    isAuthed: true,
    user: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'superadmin' as const },
  } as const;

  it('returns 401 when unauthenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const res = await POST(new Request('http://localhost/api/pets/10/follow', { method: 'POST' }), {
      params: Promise.resolve({ id: '10' }),
    });

    expect(res.status).toBe(401);
  });

  it('returns 403 for staff role', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    const res = await POST(new Request('http://localhost/api/pets/10/follow', { method: 'POST' }), {
      params: Promise.resolve({ id: '10' }),
    });

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid pet id', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const res = await POST(new Request('http://localhost/api/pets/invalid/follow', { method: 'POST' }), {
      params: Promise.resolve({ id: 'invalid' }),
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid pet id' });
  });

  it('returns 404 when pet does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);
    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await POST(new Request('http://localhost/api/pets/999/follow', { method: 'POST' }), {
      params: Promise.resolve({ id: '999' }),
    });

    expect(res.status).toBe(404);
  });

  it('returns 403 when user tries to follow own pet', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);
    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      user_id: 7n,
      followers_count: 4,
    });

    const res = await POST(new Request('http://localhost/api/pets/10/follow', { method: 'POST' }), {
      params: Promise.resolve({ id: '10' }),
    });

    expect(res.status).toBe(403);
  });

  it('unfollows pet when follow already exists', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      user_id: 99n,
      followers_count: 4,
    });
    (prisma.follows.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 222n });

    const txFollowDelete = vi.fn().mockResolvedValue({ id: 222n });
    const txPetUpdate = vi.fn().mockResolvedValue({ followers_count: 3 });

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
      return callback({
        follows: {
          delete: txFollowDelete,
        },
        pets: {
          update: txPetUpdate,
        },
      });
    });
    (prisma.pets.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

    const res = await POST(new Request('http://localhost/api/pets/10/follow', { method: 'POST' }), {
      params: Promise.resolve({ id: '10' }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ followed_by_me: false, followers_count: 3 });

    expect(txFollowDelete).toHaveBeenCalledWith({ where: { id: 222n } });
    expect(txPetUpdate).toHaveBeenCalledWith({
      where: { id: 10n },
      data: { followers_count: { decrement: 1 } },
      select: { followers_count: true },
    });
    expect(prisma.pets.updateMany).toHaveBeenCalledWith({
      where: { id: 10n, followers_count: { lt: 0 } },
      data: { followers_count: 0 },
    });
  });

  it('creates follow and increments followers_count when follow does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      user_id: 99n,
      followers_count: 4,
    });
    (prisma.follows.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const txFollowCreate = vi.fn().mockResolvedValue({ id: 333n });
    const txPetUpdate = vi.fn().mockResolvedValue({ followers_count: 5 });

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
      return callback({
        follows: {
          create: txFollowCreate,
        },
        pets: {
          update: txPetUpdate,
        },
      });
    });

    const res = await POST(new Request('http://localhost/api/pets/10/follow', { method: 'POST' }), {
      params: Promise.resolve({ id: '10' }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ followed_by_me: true, followers_count: 5 });

    expect(txFollowCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        follower_type: 'App\\Models\\User',
        follower_id: 7n,
        followable_type: 'App\\Models\\Pet',
        followable_id: 10n,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      }),
    });
    expect(txPetUpdate).toHaveBeenCalledWith({
      where: { id: 10n },
      data: { followers_count: { increment: 1 } },
      select: { followers_count: true },
    });
  });
});

