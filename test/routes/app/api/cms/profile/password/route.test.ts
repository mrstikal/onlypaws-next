import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PATCH } from '@/app/api/cms/profile/password/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    sessions: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(),
  SESSION_COOKIE_NAME: 'auth_session',
}));

vi.mock('bcryptjs');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PATCH /api/cms/profile/password', () => {
  const userAuth = {
    isAuthed: true,
    user: { id: '5', name: 'User', email: 'user@example.com', role: 'user' as const },
  } as const;

  it('returns 401 when unauthenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/cms/profile/password', {
      method: 'PATCH',
      body: JSON.stringify({
        current_password: 'old123',
        new_password: 'new12345',
        new_password_confirm: 'new12345',
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when current_password is missing', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/cms/profile/password', {
      method: 'PATCH',
      body: JSON.stringify({
        current_password: '',
        new_password: 'new12345',
        new_password_confirm: 'new12345',
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Aktuální heslo je povinné' });
  });

  it('returns 400 when new_password is missing', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/cms/profile/password', {
      method: 'PATCH',
      body: JSON.stringify({
        current_password: 'old123',
        new_password: '',
        new_password_confirm: '',
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Nové heslo je povinné' });
  });

  it('returns 400 when passwords do not match', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/cms/profile/password', {
      method: 'PATCH',
      body: JSON.stringify({
        current_password: 'old123',
        new_password: 'new12345',
        new_password_confirm: 'different123',
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Nová hesla se neshodují' });
  });

  it('returns 400 when new password is too short', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    const req = new Request('http://localhost/api/cms/profile/password', {
      method: 'PATCH',
      body: JSON.stringify({
        current_password: 'old123',
        new_password: 'short',
        new_password_confirm: 'short',
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Nové heslo musí mít alespoň 8 znaků' });
  });

  it('returns 400 when current password is incorrect', async () => {
    const { getAuth } = await import('@/lib/auth');
    const bcrypt = await import('bcryptjs');

    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 5n,
      password: 'hashed_old_password',
    });

    vi.mocked(bcrypt.compare as unknown as typeof bcrypt.compare).mockResolvedValue(false as never);

    const req = new Request('http://localhost/api/cms/profile/password', {
      method: 'PATCH',
      body: JSON.stringify({
        current_password: 'wrong_password',
        new_password: 'new12345',
        new_password_confirm: 'new12345',
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Aktuální heslo není správně' });
  });

  it('changes password successfully', async () => {
    const { getAuth } = await import('@/lib/auth');
    const bcrypt = await import('bcryptjs');

    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 5n,
      password: 'hashed_old_password',
    });

    vi.mocked(bcrypt.compare as unknown as typeof bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(bcrypt.hash as unknown as typeof bcrypt.hash).mockResolvedValue('hashed_new_password' as never);

    (prisma.users.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 5n,
    });

    (prisma.sessions.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
      count: 2,
    });

    const req = new Request('http://localhost/api/cms/profile/password', {
      method: 'PATCH',
      body: JSON.stringify({
        current_password: 'old12345',
        new_password: 'new12345',
        new_password_confirm: 'new12345',
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id: 5n },
      data: expect.objectContaining({
        password: 'hashed_new_password',
      }),
      select: { id: true },
    });

    expect(prisma.sessions.deleteMany).toHaveBeenCalledWith({
      where: { user_id: 5n },
    });
  });

  it('returns 404 when user not found', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/cms/profile/password', {
      method: 'PATCH',
      body: JSON.stringify({
        current_password: 'old12345',
        new_password: 'new12345',
        new_password_confirm: 'new12345',
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(404);
  });
});

