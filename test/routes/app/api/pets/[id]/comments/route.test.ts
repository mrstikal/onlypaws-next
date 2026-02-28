import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/pets/[id]/comments/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    comments: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    pets: {
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/pets/[id]/comments', () => {
  const userAuth = {
    isAuthed: true,
    user: { id: '6', name: 'User', email: 'user@example.com', role: 'user' as const },
  } as const;

  it('returns 401 when unauthenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/pets/10/comments', {
      method: 'POST',
      body: JSON.stringify({ body: 'test' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid pet id', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/pets/invalid/comments', {
      method: 'POST',
      body: JSON.stringify({ body: 'test' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'invalid' }) });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid pet id' });
  });

  it('returns 400 when body is empty', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/pets/10/comments', {
      method: 'POST',
      body: JSON.stringify({ body: '' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Body is required' });
  });

  it('returns 400 when body exceeds 1000 chars', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const longBody = 'b'.repeat(1001);
    const req = new Request('http://localhost/api/pets/10/comments', {
      method: 'POST',
      body: JSON.stringify({ body: longBody }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Body too long' });
  });

  it('returns 400 when parent_id does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.comments.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/pets/10/comments', {
      method: 'POST',
      body: JSON.stringify({ body: 'reply', parent_id: '999' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid parent_id' });
  });

  it('creates comment without parent_id and increments counter', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.comments.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 110n,
      body: 'Cute pet!',
      likes_count: 0,
      created_at: new Date('2026-03-03'),
      user: { id: 6n, name: 'User' },
    });

    (prisma.pets.update as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const req = new Request('http://localhost/api/pets/10/comments', {
      method: 'POST',
      body: JSON.stringify({ body: 'Cute pet!' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.comment.id).toBe('110');
    expect(body.comment.body).toBe('Cute pet!');
    expect(body.comment.likes_count).toBe(0);
    expect(body.comment.liked_by_me).toBe(false);
    expect(body.comment.user.name).toBe('User');

    expect(prisma.comments.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        body: 'Cute pet!',
        user_id: 6n,
        commentable_type: 'App\\Models\\Pet',
        commentable_id: 10n,
        parent_id: null,
        likes_count: 0,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      }),
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    expect(prisma.pets.update).toHaveBeenCalledWith({
      where: { id: 10n },
      data: { comments_count: { increment: 1 } },
    });
  });

  it('creates reply comment with parent_id', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.comments.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 60n,
    });

    (prisma.comments.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 111n,
      body: 'Indeed!',
      likes_count: 0,
      created_at: new Date('2026-03-03'),
      parent_id: 60n,
      user: { id: 6n, name: 'User' },
    });

    (prisma.pets.update as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const req = new Request('http://localhost/api/pets/10/comments', {
      method: 'POST',
      body: JSON.stringify({ body: 'Indeed!', parent_id: '60' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.comment.id).toBe('111');

    expect(prisma.comments.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        body: 'Indeed!',
        parent_id: 60n,
      }),
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  });

  it('trims whitespace from body', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.comments.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 112n,
      body: 'clean',
      likes_count: 0,
      created_at: new Date('2026-03-03'),
      user: { id: 6n, name: 'User' },
    });

    (prisma.pets.update as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const req = new Request('http://localhost/api/pets/10/comments', {
      method: 'POST',
      body: JSON.stringify({ body: '   clean   ' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(200);

    expect(prisma.comments.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        body: 'clean',
      }),
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  });
});

