import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST, GET } from '@/app/api/posts/[id]/comments/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    comments: {
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    posts: {
      update: vi.fn(),
    },
    likes: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/posts/[id]/comments', () => {
  const userAuth = {
    isAuthed: true,
    user: { id: '5', name: 'User', email: 'user@example.com', role: 'user' as const },
  } as const;

  it('returns 401 when unauthenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/posts/10/comments', {
      method: 'POST',
      body: JSON.stringify({ body: 'test' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid post id', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/posts/invalid/comments', {
      method: 'POST',
      body: JSON.stringify({ body: 'test' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'invalid' }) });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid post id' });
  });

  it('returns 400 when body is empty', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/posts/10/comments', {
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

    const longBody = 'a'.repeat(1001);
    const req = new Request('http://localhost/api/posts/10/comments', {
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

    const req = new Request('http://localhost/api/posts/10/comments', {
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
      id: 100n,
      body: 'Great post!',
      likes_count: 0,
      created_at: new Date('2026-03-03'),
      user: { id: 5n, name: 'User' },
    });

    (prisma.posts.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      comments_count: 5,
    });

    const req = new Request('http://localhost/api/posts/10/comments', {
      method: 'POST',
      body: JSON.stringify({ body: 'Great post!' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.comment.id).toBe('100');
    expect(body.comment.body).toBe('Great post!');
    expect(body.comment.likes_count).toBe(0);
    expect(body.comment.liked_by_me).toBe(false);
    expect(body.comment.user.name).toBe('User');
    expect(body.comments_count).toBe(5);

    expect(prisma.comments.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        body: 'Great post!',
        user_id: 5n,
        commentable_type: 'App\\Models\\Post',
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

    expect(prisma.posts.update).toHaveBeenCalledWith({
      where: { id: 10n },
      data: { comments_count: { increment: 1 } },
      select: { comments_count: true },
    });
  });

  it('creates reply comment with parent_id', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.comments.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 50n,
    });

    (prisma.comments.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 101n,
      body: 'Thanks!',
      likes_count: 0,
      created_at: new Date('2026-03-03'),
      parent_id: 50n,
      user: { id: 5n, name: 'User' },
    });

    (prisma.posts.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      comments_count: 6,
    });

    const req = new Request('http://localhost/api/posts/10/comments', {
      method: 'POST',
      body: JSON.stringify({ body: 'Thanks!', parent_id: '50' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.comment.id).toBe('101');
    expect(body.comments_count).toBe(6);

    expect(prisma.comments.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        body: 'Thanks!',
        parent_id: 50n,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
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
      id: 102n,
      body: 'trimmed',
      likes_count: 0,
      created_at: new Date('2026-03-03'),
      user: { id: 5n, name: 'User' },
    });

    (prisma.posts.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      comments_count: 7,
    });

    const req = new Request('http://localhost/api/posts/10/comments', {
      method: 'POST',
      body: JSON.stringify({ body: '  trimmed  ' }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(200);

    expect(prisma.comments.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        body: 'trimmed',
      }),
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  });
});

describe('GET /api/posts/[id]/comments', () => {
  const userAuth = {
    isAuthed: true,
    user: { id: '5', name: 'User', email: 'user@example.com', role: 'user' as const },
  } as const;

  it('returns 400 for invalid post id', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/posts/invalid/comments');
    const res = await GET(req, { params: Promise.resolve({ id: 'invalid' }) });

    expect(res.status).toBe(400);
  });

  it('returns empty comments when post has no comments', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    (prisma.comments.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.comments.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new Request('http://localhost/api/posts/10/comments');
    const res = await GET(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.comments).toEqual([]);
    expect(body.commentsPagination.total).toBe(0);
  });

  it('returns root comments with default pagination', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    (prisma.comments.count as ReturnType<typeof vi.fn>).mockResolvedValue(2);
    (prisma.comments.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ id: 100n }, { id: 101n }])
      .mockResolvedValueOnce([
        { id: 100n, body: 'Root comment', likes_count: 5, created_at: new Date(), parent_id: null, user: { id: 1n, name: 'User1' } },
        { id: 101n, body: 'Another root', likes_count: 2, created_at: new Date(), parent_id: null, user: { id: 2n, name: 'User2' } },
      ]);

    const req = new Request('http://localhost/api/posts/10/comments');
    const res = await GET(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.comments).toHaveLength(2);
    expect(body.commentsPagination.current_page).toBe(1);
    expect(body.commentsPagination.per_page).toBe(10);
  });

  it('builds tree with nested children comments', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    (prisma.comments.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (prisma.comments.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ id: 100n }])
      .mockResolvedValueOnce([
        { id: 100n, body: 'Root', likes_count: 5, created_at: new Date(), parent_id: null, user: { id: 1n, name: 'U1' } },
        { id: 101n, body: 'Reply to root', likes_count: 2, created_at: new Date(), parent_id: 100n, user: { id: 2n, name: 'U2' } },
      ]);

    const req = new Request('http://localhost/api/posts/10/comments');
    const res = await GET(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.comments[0].children).toHaveLength(1);
    expect(body.comments[0].children[0].body).toBe('Reply to root');
  });

  it('marks liked comments for authenticated user', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.comments.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (prisma.comments.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ id: 100n }])
      .mockResolvedValueOnce([
        { id: 100n, body: 'Comment', likes_count: 5, created_at: new Date(), parent_id: null, user: { id: 1n, name: 'U1' } },
      ]);
    (prisma.likes.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ likeable_id: 100n }]);

    const req = new Request('http://localhost/api/posts/10/comments');
    const res = await GET(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.comments[0].liked_by_me).toBe(true);
  });
});
