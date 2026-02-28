import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PATCH, DELETE } from '@/app/api/cms/posts/[id]/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    posts: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    subscription_tiers: {
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

describe('PATCH /api/cms/posts/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null } as const);

    const req = new Request('http://localhost/api/cms/posts/1', {
      method: 'PATCH',
      body: JSON.stringify({ media_url: 'a.jpg' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) });

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid id', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({
      isAuthed: true,
      user: { id: '1', name: 'User', email: 'u@example.com', role: 'user' },
    } as const);

    const req = new Request('http://localhost/api/cms/posts/not-a-number', {
      method: 'PATCH',
      body: JSON.stringify({ media_url: 'a.jpg' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: 'not-a-number' }) });

    expect(res.status).toBe(400);
  });

  it('returns 404 when post does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({
      isAuthed: true,
      user: { id: '1', name: 'User', email: 'u@example.com', role: 'user' },
    } as const);
    vi.mocked(prisma.posts.findUnique).mockResolvedValue(null);

    const req = new Request('http://localhost/api/cms/posts/10', {
      method: 'PATCH',
      body: JSON.stringify({ media_url: 'a.jpg' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(404);
  });

  it('returns 403 for non-owner non-staff', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({
      isAuthed: true,
      user: { id: '1', name: 'User', email: 'u@example.com', role: 'user' },
    } as const);
    vi.mocked(prisma.posts.findUnique).mockResolvedValue({
      id: 10n,
      pet_id: 2n,
      pet: { user_id: 999n },
    } as never);

    const req = new Request('http://localhost/api/cms/posts/10', {
      method: 'PATCH',
      body: JSON.stringify({ media_url: 'a.jpg' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid media_url', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({
      isAuthed: true,
      user: { id: '1', name: 'User', email: 'u@example.com', role: 'user' },
    } as const);
    vi.mocked(prisma.posts.findUnique).mockResolvedValue({
      id: 10n,
      pet_id: 2n,
      pet: { user_id: 1n },
    } as never);

    const req = new Request('http://localhost/api/cms/posts/10', {
      method: 'PATCH',
      body: JSON.stringify({ media_url: '../../../etc/passwd' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(400);
  });

  it('returns 400 for premium update without subscription_tier_id', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({
      isAuthed: true,
      user: { id: '1', name: 'User', email: 'u@example.com', role: 'user' },
    } as const);
    vi.mocked(prisma.posts.findUnique).mockResolvedValue({
      id: 10n,
      pet_id: 2n,
      pet: { user_id: 1n },
    } as never);

    const req = new Request('http://localhost/api/cms/posts/10', {
      method: 'PATCH',
      body: JSON.stringify({ media_url: 'a.jpg', is_premium: true }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: expect.stringContaining('subscription_tier_id je povinný pro premium post'),
    });
  });

  it('returns 404 for premium update with unknown tier', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({
      isAuthed: true,
      user: { id: '1', name: 'User', email: 'u@example.com', role: 'user' },
    } as const);
    vi.mocked(prisma.posts.findUnique).mockResolvedValue({
      id: 10n,
      pet_id: 2n,
      pet: { user_id: 1n },
    } as never);
    vi.mocked(prisma.subscription_tiers.findUnique).mockResolvedValue(null);

    const req = new Request('http://localhost/api/cms/posts/10', {
      method: 'PATCH',
      body: JSON.stringify({ media_url: 'a.jpg', is_premium: true, subscription_tier_id: '999' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(404);
  });

  it('updates post for owner and normalizes posts/ prefix', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({
      isAuthed: true,
      user: { id: '5', name: 'Owner', email: 'o@example.com', role: 'user' },
    } as const);
    vi.mocked(prisma.posts.findUnique).mockResolvedValue({
      id: 20n,
      pet_id: 2n,
      pet: { user_id: 5n },
    } as never);
    vi.mocked(prisma.subscription_tiers.findUnique).mockResolvedValue({ id: 3n } as never);
    vi.mocked(prisma.posts.update).mockResolvedValue({ id: 20n } as never);

    const req = new Request('http://localhost/api/cms/posts/20', {
      method: 'PATCH',
      body: JSON.stringify({
        media_url: 'posts/photo.jpg',
        caption: ' Hello ',
        is_premium: true,
        subscription_tier_id: '3',
      }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '20' }) });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });

    expect(prisma.posts.update).toHaveBeenCalledWith({
      where: { id: 20n },
      data: expect.objectContaining({
        caption: 'Hello',
        is_premium: true,
        subscription_tier_id: 3n,
        media_url: 'photo.jpg',
        media_type: 'image',
      }),
      select: { id: true },
    });
  });
});

describe('DELETE /api/cms/posts/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null } as const);

    const res = await DELETE(new Request('http://localhost/api/cms/posts/1', { method: 'DELETE' }), {
      params: Promise.resolve({ id: '1' }),
    });

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid id', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({
      isAuthed: true,
      user: { id: '1', name: 'User', email: 'u@example.com', role: 'user' },
    } as const);

    const res = await DELETE(new Request('http://localhost/api/cms/posts/x', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'x' }),
    });

    expect(res.status).toBe(400);
  });

  it('returns 403 for non-owner non-staff', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({
      isAuthed: true,
      user: { id: '1', name: 'User', email: 'u@example.com', role: 'user' },
    } as const);
    vi.mocked(prisma.posts.findUnique).mockResolvedValue({
      id: 7n,
      pet_id: 70n,
      pet: { user_id: 2n },
    } as never);

    const res = await DELETE(new Request('http://localhost/api/cms/posts/7', { method: 'DELETE' }), {
      params: Promise.resolve({ id: '7' }),
    });

    expect(res.status).toBe(403);
  });

  it('deletes post for staff user', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({
      isAuthed: true,
      user: { id: '99', name: 'Admin', email: 'a@example.com', role: 'admin' },
    } as const);
    vi.mocked(prisma.posts.findUnique).mockResolvedValue({
      id: 8n,
      pet_id: 80n,
      pet: { user_id: 2n },
    } as never);

    const txPostDelete = vi.fn().mockResolvedValue({ id: 8n });
    const txPetUpdate = vi.fn().mockResolvedValue({ id: 80n });
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
      return callback({
        posts: { delete: txPostDelete },
        pets: { update: txPetUpdate },
      });
    });

    const res = await DELETE(new Request('http://localhost/api/cms/posts/8', { method: 'DELETE' }), {
      params: Promise.resolve({ id: '8' }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(txPostDelete).toHaveBeenCalledWith({ where: { id: 8n } });
    expect(txPetUpdate).toHaveBeenCalledWith({
      where: { id: 80n },
      data: { posts_count: { decrement: 1 } },
      select: { id: true },
    });
  });
});

