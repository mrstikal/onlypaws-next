import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PATCH, DELETE } from '@/app/api/cms/pets/[id]/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pets: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    breeds: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PATCH /api/cms/pets/[id]', () => {
  const userAuth = {
    isAuthed: true,
    user: { id: '5', name: 'User', email: 'user@example.com', role: 'user' as const },
  } as const;

  const staffAuth = {
    isAuthed: true,
    user: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin' as const },
  } as const;

  it('returns 401 when unauthenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/cms/pets/10', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid pet id', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/cms/pets/invalid', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: 'invalid' }) });
    expect(res.status).toBe(400);
  });

  it('returns 404 when pet does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/cms/pets/999', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '999' }) });
    expect(res.status).toBe(404);
  });

  it('returns 403 when user is not owner and not staff', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      user_id: 99n, // Different user
    });

    const req = new Request('http://localhost/api/cms/pets/10', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(403);
  });

  it('returns 400 when name is empty', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      user_id: 5n, // Owner
    });

    const req = new Request('http://localhost/api/cms/pets/10', {
      method: 'PATCH',
      body: JSON.stringify({ name: '' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Jméno je povinné' });
  });

  it('updates pet as owner', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      user_id: 5n, // Owner
    });

    (prisma.pets.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
    });

    const req = new Request('http://localhost/api/cms/pets/10', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Name', bio: 'New bio', age_years: 3 }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(200);

    expect(prisma.pets.update).toHaveBeenCalledWith({
      where: { id: 10n },
      data: expect.objectContaining({
        name: 'Updated Name',
        bio: 'New bio',
        age_years: 3,
      }),
      select: { id: true },
    });
  });

  it('updates pet as staff for any user', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      user_id: 99n, // Different user
    });

    (prisma.pets.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
    });

    const req = new Request('http://localhost/api/cms/pets/10', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(200);
  });

  it('handles breed validation', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      user_id: 5n,
    });

    (prisma.breeds.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/cms/pets/10', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Micka', breed_id: '999' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '10' }) });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Neplatné plemeno' });
  });
});

describe('DELETE /api/cms/pets/[id]', () => {
  const userAuth = {
    isAuthed: true,
    user: { id: '5', name: 'User', email: 'user@example.com', role: 'user' as const },
  } as const;

  const staffAuth = {
    isAuthed: true,
    user: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin' as const },
  } as const;

  it('returns 401 when unauthenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/cms/pets/10', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid pet id', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/cms/pets/invalid', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'invalid' }) });

    expect(res.status).toBe(400);
  });

  it('returns 404 when pet does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/cms/pets/999', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '999' }) });

    expect(res.status).toBe(404);
  });

  it('returns 403 when user is not owner and not staff', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      user_id: 99n, // Different user
    });

    const req = new Request('http://localhost/api/cms/pets/10', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(403);
  });

  it('deletes pet as owner', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      user_id: 5n, // Owner
    });

    (prisma.pets.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
    });

    const req = new Request('http://localhost/api/cms/pets/10', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(200);
    expect(prisma.pets.delete).toHaveBeenCalledWith({ where: { id: 10n } });
  });

  it('deletes pet as staff for any user', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      user_id: 99n, // Different user
    });

    (prisma.pets.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
    });

    const req = new Request('http://localhost/api/cms/pets/10', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(200);
  });
});

