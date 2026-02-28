import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/cms/pets/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    breeds: {
      findUnique: vi.fn(),
    },
    pets: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/cms/pets', () => {
  const userAuth = {
    isAuthed: true,
    user: { id: '5', name: 'User', email: 'user@example.com', role: 'user' as const },
  } as const;

  const staffAuth = {
    isAuthed: true,
    user: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin' as const },
  } as const;

  it('returns 401 when not authenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/cms/pets', {
      method: 'POST',
      body: JSON.stringify({ name: 'Micka' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is staff', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    const req = new Request('http://localhost/api/cms/pets', {
      method: 'POST',
      body: JSON.stringify({ name: 'Micka' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 400 when name is missing', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/cms/pets', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Jméno je povinné' });
  });

  it('returns 400 when name exceeds 255 chars', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const longName = 'a'.repeat(256);
    const req = new Request('http://localhost/api/cms/pets', {
      method: 'POST',
      body: JSON.stringify({ name: longName }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Jméno je příliš dlouhé' });
  });

  it('returns 400 when age_years is invalid', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/cms/pets', {
      method: 'POST',
      body: JSON.stringify({ name: 'Micka', age_years: -1 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Neplatný věk (roky)' });
  });

  it('returns 400 when age_months is out of range', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/cms/pets', {
      method: 'POST',
      body: JSON.stringify({ name: 'Micka', age_months: 12 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Neplatný věk (měsíce)' });
  });

  it('returns 400 when profile_picture has invalid format', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/cms/pets', {
      method: 'POST',
      body: JSON.stringify({ name: 'Micka', profile_picture: '../../../etc/passwd' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Neplatný avatar' });
  });

  it('returns 400 when breed_id does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.breeds.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/cms/pets', {
      method: 'POST',
      body: JSON.stringify({ name: 'Micka', breed_id: '999' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Neplatné plemeno' });
  });

  it('creates pet with minimal data', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.pets.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 42n,
    });

    const req = new Request('http://localhost/api/cms/pets', {
      method: 'POST',
      body: JSON.stringify({ name: 'Micka' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe('42');

    expect(prisma.pets.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user_id: 5n,
        name: 'Micka',
        bio: null,
        age_years: null,
        age_months: null,
        breed_id: null,
        profile_picture: null,
        followers_count: 0,
        posts_count: 0,
        likes_count: 0,
        comments_count: 0,
      }),
      select: { id: true },
    });
  });

  it('creates pet with full data including breed and profile picture', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.breeds.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10n });
    (prisma.pets.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 43n,
    });

    const req = new Request('http://localhost/api/cms/pets', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Alik',
        bio: 'Friendly cat',
        age_years: 3,
        age_months: 6,
        breed_id: '10',
        profile_picture: 'pets/alik.jpg',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe('43');

    expect(prisma.pets.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user_id: 5n,
        name: 'Alik',
        bio: 'Friendly cat',
        age_years: 3,
        age_months: 6,
        breed_id: 10n,
        profile_picture: 'alik.jpg',
      }),
      select: { id: true },
    });
  });

  it('normalizes profile_picture filename by removing pets/ prefix', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.pets.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 44n,
    });

    const req = new Request('http://localhost/api/cms/pets', {
      method: 'POST',
      body: JSON.stringify({ name: 'Micka', profile_picture: 'pets/micka_profile.jpg' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(prisma.pets.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        profile_picture: 'micka_profile.jpg',
      }),
      select: { id: true },
    });
  });

  it('trims whitespace from name and bio', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.pets.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 45n,
    });

    const req = new Request('http://localhost/api/cms/pets', {
      method: 'POST',
      body: JSON.stringify({ name: '  Micka  ', bio: '  Cute dog  ' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(prisma.pets.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Micka',
        bio: 'Cute dog',
      }),
      select: { id: true },
    });
  });
});

