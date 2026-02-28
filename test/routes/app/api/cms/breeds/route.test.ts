import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/cms/breeds/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    breeds: {
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

describe('POST /api/cms/breeds', () => {
  const adminAuth = {
    isAuthed: true,
    user: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin' as const },
  } as const;

  const userAuth = {
    isAuthed: true,
    user: { id: '2', name: 'User', email: 'user@example.com', role: 'user' as const },
  } as const;

  it('returns 401 when not authenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/cms/breeds', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', species: 'dog' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not staff', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/cms/breeds', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', species: 'dog' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 400 when name is missing', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(adminAuth);

    const req = new Request('http://localhost/api/cms/breeds', {
      method: 'POST',
      body: JSON.stringify({ name: '', species: 'dog' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('Název je povinný');
  });

  it('returns 400 when species is invalid', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(adminAuth);

    const req = new Request('http://localhost/api/cms/breeds', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', species: 'bird' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain('Neplatný druh');
  });

  it('creates breed and returns id on success', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(adminAuth);

    (prisma.breeds.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 42n,
    });

    const req = new Request('http://localhost/api/cms/breeds', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Labrador',
        species: 'dog',
        api_id: 'lab-001',
        description: 'Friendly dog',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe('42');

    expect(prisma.breeds.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Labrador',
        species: 'dog',
        api_id: 'lab-001',
        description: 'Friendly dog',
      }),
      select: { id: true },
    });
  });

  it('handles null optional fields', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(adminAuth);

    (prisma.breeds.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 43n,
    });

    const req = new Request('http://localhost/api/cms/breeds', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Persian',
        species: 'cat',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(prisma.breeds.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Persian',
        species: 'cat',
        api_id: null,
        description: null,
      }),
      select: { id: true },
    });
  });
});

