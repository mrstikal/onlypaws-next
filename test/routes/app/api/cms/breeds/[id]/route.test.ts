import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PATCH, DELETE } from '@/app/api/cms/breeds/[id]/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    breeds: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    pets: {
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

const adminAuth = {
  isAuthed: true,
  user: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin' as const },
} as const;

describe('PATCH /api/cms/breeds/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/cms/breeds/1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated', species: 'dog' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when breed not found', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(adminAuth);

    (prisma.breeds.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/cms/breeds/999', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated', species: 'dog' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '999' }) });
    expect(res.status).toBe(404);
  });

  it('updates breed successfully', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(adminAuth);

    (prisma.breeds.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1n });
    (prisma.breeds.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1n });

    const req = new Request('http://localhost/api/cms/breeds/1', {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'Updated Labrador',
        species: 'dog',
        description: 'Updated description',
      }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(prisma.breeds.update).toHaveBeenCalledWith({
      where: { id: 1n },
      data: expect.objectContaining({
        name: 'Updated Labrador',
        species: 'dog',
        description: 'Updated description',
      }),
      select: { id: true },
    });
  });
});

describe('DELETE /api/cms/breeds/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/cms/breeds/1', { method: 'DELETE' });

    const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 409 when breed is used by pets', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(adminAuth);

    (prisma.pets.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 10n });

    const req = new Request('http://localhost/api/cms/breeds/1', { method: 'DELETE' });

    const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(409);

    const body = await res.json();
    expect(body.error).toContain('se používá');
  });

  it('returns 404 when breed not found', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(adminAuth);

    (prisma.pets.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.breeds.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/cms/breeds/999', { method: 'DELETE' });

    const res = await DELETE(req, { params: Promise.resolve({ id: '999' }) });
    expect(res.status).toBe(404);
  });

  it('deletes breed successfully', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(adminAuth);

    (prisma.pets.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.breeds.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1n });
    (prisma.breeds.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1n });

    const req = new Request('http://localhost/api/cms/breeds/1', { method: 'DELETE' });

    const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(prisma.breeds.delete).toHaveBeenCalledWith({
      where: { id: 1n },
    });
  });
});

