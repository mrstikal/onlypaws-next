import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE } from '@/app/api/cms/likes/[id]/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    likes: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    posts: {
      update: vi.fn(),
    },
    pets: {
      update: vi.fn(),
    },
    comments: {
      update: vi.fn(),
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

describe('DELETE /api/cms/likes/[id]', () => {
  const staffAuth = {
    isAuthed: true,
    user: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin' as const },
  } as const;

  it('returns 401 when not authenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/cms/likes/10', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not staff', async () => {
    const { getAuth } = await import('@/lib/auth');
    const userAuth = {
      isAuthed: true,
      user: { id: '5', name: 'User', email: 'user@example.com', role: 'user' as const },
    } as const;
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/cms/likes/10', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid like id', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    const req = new Request('http://localhost/api/cms/likes/invalid', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'invalid' }) });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid like id' });
  });

  it('returns 404 when like does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    (prisma.likes.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/cms/likes/999', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '999' }) });

    expect(res.status).toBe(404);
  });

  it('deletes like on post and decrements likes_count', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    (prisma.likes.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      likeable_type: 'App\\Models\\Post',
      likeable_id: 100n,
    });

    const txLikesDelete = vi.fn().mockResolvedValue({ id: 10n });
    const txPostsUpdate = vi.fn().mockResolvedValue({ id: 100n });

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
      return callback({
        likes: { delete: txLikesDelete },
        posts: { update: txPostsUpdate },
        pets: { update: vi.fn() },
        comments: { update: vi.fn() },
      });
    });

    const req = new Request('http://localhost/api/cms/likes/10', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(txLikesDelete).toHaveBeenCalledWith({ where: { id: 10n } });
    expect(txPostsUpdate).toHaveBeenCalledWith({
      where: { id: 100n },
      data: { likes_count: { decrement: 1 } },
      select: { id: true },
    });
  });

  it('deletes like on pet and decrements likes_count', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    (prisma.likes.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 11n,
      likeable_type: 'App\\Models\\Pet',
      likeable_id: 50n,
    });

    const txLikesDelete = vi.fn().mockResolvedValue({ id: 11n });
    const txPetsUpdate = vi.fn().mockResolvedValue({ id: 50n });

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
      return callback({
        likes: { delete: txLikesDelete },
        posts: { update: vi.fn() },
        pets: { update: txPetsUpdate },
        comments: { update: vi.fn() },
      });
    });

    const req = new Request('http://localhost/api/cms/likes/11', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '11' }) });

    expect(res.status).toBe(200);

    expect(txPetsUpdate).toHaveBeenCalledWith({
      where: { id: 50n },
      data: { likes_count: { decrement: 1 } },
      select: { id: true },
    });
  });

  it('deletes like on comment and decrements likes_count', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    (prisma.likes.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 12n,
      likeable_type: 'App\\Models\\Comment',
      likeable_id: 75n,
    });

    const txLikesDelete = vi.fn().mockResolvedValue({ id: 12n });
    const txCommentsUpdate = vi.fn().mockResolvedValue({ id: 75n });

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
      return callback({
        likes: { delete: txLikesDelete },
        posts: { update: vi.fn() },
        pets: { update: vi.fn() },
        comments: { update: txCommentsUpdate },
      });
    });

    const req = new Request('http://localhost/api/cms/likes/12', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '12' }) });

    expect(res.status).toBe(200);

    expect(txCommentsUpdate).toHaveBeenCalledWith({
      where: { id: 75n },
      data: { likes_count: { decrement: 1 } },
      select: { id: true },
    });
  });
});

