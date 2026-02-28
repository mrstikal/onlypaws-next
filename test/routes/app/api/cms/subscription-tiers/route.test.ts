import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/cms/subscription-tiers/route';
import { PATCH, DELETE } from '@/app/api/cms/subscription-tiers/[id]/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription_tiers: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    posts: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/cms/subscription-tiers', () => {
  const superadminAuth = {
    isAuthed: true,
    user: { id: '1', name: 'Superadmin', email: 'super@example.com', role: 'superadmin' as const },
  } as const;

  it('returns 401 when not authenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/cms/subscription-tiers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Basic', slug: 'basic', price_monthly: 99 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not superadmin', async () => {
    const { getAuth } = await import('@/lib/auth');
    const adminAuth = {
      isAuthed: true,
      user: { id: '2', name: 'Admin', email: 'admin@example.com', role: 'admin' as const },
    } as const;
    vi.mocked(getAuth).mockResolvedValue(adminAuth);

    const req = new Request('http://localhost/api/cms/subscription-tiers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Basic', slug: 'basic', price_monthly: 99 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 400 when name is missing', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(superadminAuth);

    const req = new Request('http://localhost/api/cms/subscription-tiers', {
      method: 'POST',
      body: JSON.stringify({ name: '', slug: 'basic', price_monthly: 99 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Název je povinný' });
  });

  it('returns 400 when slug is invalid', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(superadminAuth);

    const req = new Request('http://localhost/api/cms/subscription-tiers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Basic', slug: 'invalid slug!', price_monthly: 99 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Neplatný slug' });
  });

  it('returns 400 when price is out of range', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(superadminAuth);

    const req = new Request('http://localhost/api/cms/subscription-tiers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Basic', slug: 'basic', price_monthly: -50 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Neplatná cena' });
  });

  it('creates subscription tier successfully', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(superadminAuth);

    (prisma.subscription_tiers.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 2n,
    });

    const req = new Request('http://localhost/api/cms/subscription-tiers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Basic', slug: 'basic', price_monthly: 99.5, description: 'Basic tier' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe('2');

    expect(prisma.subscription_tiers.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Basic',
        slug: 'basic',
        price_monthly: 99,
        description: 'Basic tier',
      }),
      select: { id: true },
    });
  });

  it('truncates price to integer', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(superadminAuth);

    (prisma.subscription_tiers.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 3n,
    });

    const req = new Request('http://localhost/api/cms/subscription-tiers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Premium', slug: 'premium', price_monthly: 199.99 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(prisma.subscription_tiers.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        price_monthly: 199,
      }),
      select: { id: true },
    });
  });
});

describe('PATCH /api/cms/subscription-tiers/[id]', () => {
  const superadminAuth = {
    isAuthed: true,
    user: { id: '1', name: 'Superadmin', email: 'super@example.com', role: 'superadmin' as const },
  } as const;

  it('returns 401 when not authenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/cms/subscription-tiers/2', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated', slug: 'updated', price_monthly: 149 }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '2' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when tier does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(superadminAuth);

    (prisma.subscription_tiers.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/cms/subscription-tiers/999', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated', slug: 'updated', price_monthly: 149 }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '999' }) });
    expect(res.status).toBe(404);
  });

  it('updates subscription tier successfully', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(superadminAuth);

    (prisma.subscription_tiers.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 2n,
    });

    (prisma.subscription_tiers.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 2n,
    });

    const req = new Request('http://localhost/api/cms/subscription-tiers/2', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Premium', slug: 'premium', price_monthly: 199, description: 'Premium tier' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '2' }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(prisma.subscription_tiers.update).toHaveBeenCalledWith({
      where: { id: 2n },
      data: expect.objectContaining({
        name: 'Premium',
        slug: 'premium',
        price_monthly: 199,
        description: 'Premium tier',
      }),
      select: { id: true },
    });
  });
});

describe('DELETE /api/cms/subscription-tiers/[id]', () => {
  const superadminAuth = {
    isAuthed: true,
    user: { id: '1', name: 'Superadmin', email: 'super@example.com', role: 'superadmin' as const },
  } as const;

  it('returns 401 when not authenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/cms/subscription-tiers/2', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '2' }) });

    expect(res.status).toBe(401);
  });

  it('returns 409 when tier is used by posts', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(superadminAuth);

    (prisma.posts.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10n });

    const req = new Request('http://localhost/api/cms/subscription-tiers/2', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '2' }) });

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({ error: 'Tier se používá u postů' });
  });

  it('returns 404 when tier does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(superadminAuth);

    (prisma.posts.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.subscription_tiers.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/cms/subscription-tiers/999', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '999' }) });

    expect(res.status).toBe(404);
  });

  it('deletes subscription tier successfully', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(superadminAuth);

    (prisma.posts.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.subscription_tiers.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 2n,
    });
    (prisma.subscription_tiers.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 2n,
    });

    const req = new Request('http://localhost/api/cms/subscription-tiers/2', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '2' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(prisma.subscription_tiers.delete).toHaveBeenCalledWith({
      where: { id: 2n },
    });
  });
});

