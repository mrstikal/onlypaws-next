import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/subscription/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription_tiers: {
      findUnique: vi.fn(),
    },
    subscriptions: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/subscription', () => {
  const userAuth = {
    isAuthed: true,
    user: { id: '5', name: 'User', email: 'user@example.com', role: 'user' as const },
  } as const;

  it('returns 401 when unauthenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/subscription', {
      method: 'POST',
      body: JSON.stringify({ tierSlug: 'basic' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: 'Unauthorized' });
  });

  it('returns 400 for invalid tier slug', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/subscription', {
      method: 'POST',
      body: JSON.stringify({ tierSlug: 'invalid-tier' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: 'Invalid tier' });
  });

  it('returns 400 for empty tier slug', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/subscription', {
      method: 'POST',
      body: JSON.stringify({ tierSlug: '' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when tier does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.subscription_tiers.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/subscription', {
      method: 'POST',
      body: JSON.stringify({ tierSlug: 'basic' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: 'Tier not found' });
  });

  it('subscribes to free tier successfully', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.subscription_tiers.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1n,
      slug: 'free',
    });

    (prisma.subscriptions.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      user_id: 5n,
      subscription_tier_id: 1n,
    });

    const req = new Request('http://localhost/api/subscription', {
      method: 'POST',
      body: JSON.stringify({ tierSlug: 'free' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.viewerTierSlug).toBe('free');

    expect(prisma.subscriptions.upsert).toHaveBeenCalledWith({
      where: { user_id: 5n },
      create: expect.objectContaining({
        user_id: 5n,
        subscription_tier_id: 1n,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      }),
      update: expect.objectContaining({
        subscription_tier_id: 1n,
        updated_at: expect.any(Date),
      }),
    });
  });

  it('subscribes to basic tier successfully', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.subscription_tiers.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 2n,
      slug: 'basic',
    });

    (prisma.subscriptions.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      user_id: 5n,
      subscription_tier_id: 2n,
    });

    const req = new Request('http://localhost/api/subscription', {
      method: 'POST',
      body: JSON.stringify({ tierSlug: 'basic' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.viewerTierSlug).toBe('basic');
  });

  it('subscribes to vip tier successfully', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.subscription_tiers.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 3n,
      slug: 'vip',
    });

    (prisma.subscriptions.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      user_id: 5n,
      subscription_tier_id: 3n,
    });

    const req = new Request('http://localhost/api/subscription', {
      method: 'POST',
      body: JSON.stringify({ tierSlug: 'vip' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.viewerTierSlug).toBe('vip');
  });

  it('subscribes to ultra tier successfully', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.subscription_tiers.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 4n,
      slug: 'ultra',
    });

    (prisma.subscriptions.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      user_id: 5n,
      subscription_tier_id: 4n,
    });

    const req = new Request('http://localhost/api/subscription', {
      method: 'POST',
      body: JSON.stringify({ tierSlug: 'ultra' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.viewerTierSlug).toBe('ultra');
  });

  it('updates existing subscription when resubscribing to different tier', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.subscription_tiers.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 3n,
      slug: 'vip',
    });

    const upsertMock = vi.fn().mockResolvedValue({
      user_id: 5n,
      subscription_tier_id: 3n,
    });
    (prisma.subscriptions.upsert as ReturnType<typeof vi.fn>).mockImplementation(upsertMock);

    const req = new Request('http://localhost/api/subscription', {
      method: 'POST',
      body: JSON.stringify({ tierSlug: 'vip' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(upsertMock).toHaveBeenCalledWith({
      where: { user_id: 5n },
      create: expect.any(Object),
      update: expect.objectContaining({
        subscription_tier_id: 3n,
      }),
    });
  });
});

