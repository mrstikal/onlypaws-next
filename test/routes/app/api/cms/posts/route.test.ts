import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/cms/posts/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pets: {
      findFirst: vi.fn(),
      update: vi.fn(),
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

describe('POST /api/cms/posts', () => {
  const userAuth = {
    isAuthed: true,
    user: { id: '1', name: 'User', email: 'user@example.com', role: 'user' as const },
  } as const;

  const staffAuth = {
    isAuthed: true,
    user: { id: '2', name: 'Admin', email: 'admin@example.com', role: 'admin' as const },
  } as const;

  it('returns 401 when not authenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null } as const);

    const req = new Request('http://localhost/api/cms/posts', {
      method: 'POST',
      body: JSON.stringify({ pet_id: '1', media_url: 'test.jpg' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is staff', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    const req = new Request('http://localhost/api/cms/posts', {
      method: 'POST',
      body: JSON.stringify({ pet_id: '1', media_url: 'test.jpg' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 400 when pet_id is invalid', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/cms/posts', {
      method: 'POST',
      body: JSON.stringify({ pet_id: 'invalid', media_url: 'test.jpg' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('Neplatný mazlíček');
  });

  it('returns 400 when media_url is invalid', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/cms/posts', {
      method: 'POST',
      body: JSON.stringify({ pet_id: '1', media_url: '../../../etc/passwd' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('Neplatný soubor');
  });

  it('returns 404 when pet not found or not owned by user', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.pets.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/cms/posts', {
      method: 'POST',
      body: JSON.stringify({ pet_id: '999', media_url: 'test.jpg' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('returns 400 for premium post without subscription_tier_id', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/cms/posts', {
      method: 'POST',
      body: JSON.stringify({
        pet_id: '10',
        media_url: 'premium.jpg',
        is_premium: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('subscription_tier_id je povinný pro premium post');
  });

  it('returns 404 for premium post with unknown tier', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);
    (prisma.subscription_tiers.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/cms/posts', {
      method: 'POST',
      body: JSON.stringify({
        pet_id: '10',
        media_url: 'premium.jpg',
        is_premium: true,
        subscription_tier_id: '999',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('creates post successfully for valid input', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.pets.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10n });

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
      return callback({
        posts: {
          create: vi.fn().mockResolvedValue({ id: 42n }),
        },
        pets: {
          update: vi.fn().mockResolvedValue({ id: 10n }),
        },
      });
    });

    const req = new Request('http://localhost/api/cms/posts', {
      method: 'POST',
      body: JSON.stringify({
        pet_id: '10',
        media_url: 'posts/my-photo.jpg',
        caption: 'Beautiful day!',
        is_premium: false,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe('42');
  });

  it('handles premium posts with tier', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.subscription_tiers.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 2n });
    (prisma.pets.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10n });

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
      return callback({
        posts: {
          create: vi.fn().mockResolvedValue({ id: 99n }),
        },
        pets: {
          update: vi.fn().mockResolvedValue({ id: 10n }),
        },
      });
    });

    const req = new Request('http://localhost/api/cms/posts', {
      method: 'POST',
      body: JSON.stringify({
        pet_id: '10',
        media_url: 'premium.jpg',
        is_premium: true,
        subscription_tier_id: '2',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});

