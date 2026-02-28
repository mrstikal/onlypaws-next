import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PATCH, DELETE } from '@/app/api/cms/comments/[id]/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    comments: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    posts: {
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    pets: {
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PATCH /api/cms/comments/[id]', () => {
  const staffAuth = {
    isAuthed: true,
    user: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin' as const },
  } as const;

  it('returns 401 when not authenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/cms/comments/10', {
      method: 'PATCH',
      body: JSON.stringify({ body: 'updated' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not staff', async () => {
    const { getAuth } = await import('@/lib/auth');
    const userAuth = {
      isAuthed: true,
      user: { id: '5', name: 'User', email: 'user@example.com', role: 'user' as const },
    } as const;
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/cms/comments/10', {
      method: 'PATCH',
      body: JSON.stringify({ body: 'updated' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid comment id', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    const req = new Request('http://localhost/api/cms/comments/invalid', {
      method: 'PATCH',
      body: JSON.stringify({ body: 'updated' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: 'invalid' }) });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Neplatné ID' });
  });

  it('returns 404 when comment does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    (prisma.comments.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/cms/comments/999', {
      method: 'PATCH',
      body: JSON.stringify({ body: 'updated' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '999' }) });
    expect(res.status).toBe(404);
  });

  it('returns 400 when body is empty', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    (prisma.comments.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10n });

    const req = new Request('http://localhost/api/cms/comments/10', {
      method: 'PATCH',
      body: JSON.stringify({ body: '' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Text je povinný' });
  });

  it('returns 400 when body exceeds 1000 chars', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    (prisma.comments.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10n });

    const longBody = 'a'.repeat(1001);
    const req = new Request('http://localhost/api/cms/comments/10', {
      method: 'PATCH',
      body: JSON.stringify({ body: longBody }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Text je příliš dlouhý' });
  });

  it('updates comment successfully', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    (prisma.comments.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10n });
    (prisma.comments.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10n });

    const req = new Request('http://localhost/api/cms/comments/10', {
      method: 'PATCH',
      body: JSON.stringify({ body: 'Updated comment' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(prisma.comments.update).toHaveBeenCalledWith({
      where: { id: 10n },
      data: expect.objectContaining({ body: 'Updated comment' }),
      select: { id: true },
    });
  });
});

describe('DELETE /api/cms/comments/[id]', () => {
  const staffAuth = {
    isAuthed: true,
    user: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin' as const },
  } as const;

  it('returns 401 when not authenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/cms/comments/10', { method: 'DELETE' });
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

    const req = new Request('http://localhost/api/cms/comments/10', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid comment id', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    const req = new Request('http://localhost/api/cms/comments/invalid', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'invalid' }) });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Neplatné ID' });
  });

  it('returns 404 when comment does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    (prisma.comments.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/cms/comments/999', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '999' }) });

    expect(res.status).toBe(404);
  });

  it('deletes comment and decrements post counter', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    (prisma.comments.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      commentable_type: 'App\\Models\\Post',
      commentable_id: 100n,
    });

    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([{ cnt: 1n }]);

    const txCommentsDelete = vi.fn().mockResolvedValue({ id: 10n });
    const txPostsUpdate = vi.fn().mockResolvedValue({ id: 100n });
    const txPostsUpdateMany = vi.fn().mockResolvedValue({ count: 0 });

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
      return callback({
        comments: {
          delete: txCommentsDelete,
        },
        posts: {
          update: txPostsUpdate,
          updateMany: txPostsUpdateMany,
        },
      });
    });

    const req = new Request('http://localhost/api/cms/comments/10', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(txCommentsDelete).toHaveBeenCalledWith({ where: { id: 10n } });
    expect(txPostsUpdate).toHaveBeenCalledWith({
      where: { id: 100n },
      data: { comments_count: { decrement: 1 } },
      select: { id: true },
    });
  });

  it('deletes comment and decrements pet counter', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    (prisma.comments.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 11n,
      commentable_type: 'App\\Models\\Pet',
      commentable_id: 50n,
    });

    (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([{ cnt: 3n }]);

    const txCommentsDelete = vi.fn().mockResolvedValue({ id: 11n });
    const txPetsUpdate = vi.fn().mockResolvedValue({ id: 50n });
    const txPetsUpdateMany = vi.fn().mockResolvedValue({ count: 0 });

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
      return callback({
        comments: {
          delete: txCommentsDelete,
        },
        pets: {
          update: txPetsUpdate,
          updateMany: txPetsUpdateMany,
        },
      });
    });

    const req = new Request('http://localhost/api/cms/comments/11', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '11' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(txPetsUpdate).toHaveBeenCalledWith({
      where: { id: 50n },
      data: { comments_count: { decrement: 3 } },
      select: { id: true },
    });
  });
});

