import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE } from '@/app/api/cms/follows/[id]/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    follows: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DELETE /api/cms/follows/[id]', () => {
  const staffAuth = {
    isAuthed: true,
    user: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin' as const },
  } as const;

  it('returns 401 when not authenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/cms/follows/10', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not staff', async () => {
    const { getAuth } = await import('@/lib/auth');
    const userAuth = {
      isAuthed: true,
      user: { id: '5', name: 'User', email: 'user@example.com', role: 'user' as const },
    } as const;
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/cms/follows/10', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid follow id', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    const req = new Request('http://localhost/api/cms/follows/invalid', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'invalid' }) });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Neplatné ID' });
  });

  it('returns 404 when follow does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    (prisma.follows.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/cms/follows/999', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '999' }) });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ error: 'Nenalezeno' });
  });

  it('deletes follow successfully', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(staffAuth);

    (prisma.follows.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
    });

    (prisma.follows.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
    });

    const req = new Request('http://localhost/api/cms/follows/10', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(prisma.follows.delete).toHaveBeenCalledWith({
      where: { id: 10n },
    });
  });
});

