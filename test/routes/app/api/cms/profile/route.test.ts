import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PATCH } from '@/app/api/cms/profile/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    users: {
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PATCH /api/cms/profile', () => {
  const userAuth = {
    isAuthed: true,
    user: { id: '5', name: 'OldName', email: 'user@example.com', role: 'user' as const },
  } as const;

  it('returns 401 when not authenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/cms/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'NewName' }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is empty', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/cms/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: '' }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Jméno je povinné' });
  });

  it('returns 400 when name exceeds 255 chars', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const longName = 'a'.repeat(256);
    const req = new Request('http://localhost/api/cms/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: longName }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Jméno je příliš dlouhé' });
  });

  it('updates user profile successfully', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.users.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 5n,
      name: 'NewName',
      email: 'user@example.com',
      role: 'user',
    });

    const req = new Request('http://localhost/api/cms/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'NewName' }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.user.id).toBe('5');
    expect(body.user.name).toBe('NewName');
    expect(body.user.email).toBe('user@example.com');
    expect(body.user.role).toBe('user');

    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: 5n },
      data: expect.objectContaining({
        name: 'NewName',
        updated_at: expect.any(Date),
      }),
      select: { id: true, name: true, email: true, role: true },
    });
  });

  it('trims whitespace from name', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.users.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 5n,
      name: 'Trimmed',
      email: 'user@example.com',
      role: 'user',
    });

    const req = new Request('http://localhost/api/cms/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: '  Trimmed  ' }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);

    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: 5n },
      data: expect.objectContaining({
        name: 'Trimmed',
        updated_at: expect.any(Date),
      }),
      select: { id: true, name: true, email: true, role: true },
    });
  });

  it('preserves user role in response', async () => {
    const { getAuth } = await import('@/lib/auth');
    const adminAuth = {
      isAuthed: true,
      user: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin' as const },
    } as const;
    vi.mocked(getAuth).mockResolvedValue(adminAuth);

    (prisma.users.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1n,
      name: 'AdminName',
      email: 'admin@example.com',
      role: 'admin',
    });

    const req = new Request('http://localhost/api/cms/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'AdminName' }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.user.role).toBe('admin');
  });
});

