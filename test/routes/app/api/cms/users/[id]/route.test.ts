import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PATCH, DELETE } from '@/app/api/cms/users/[id]/route';

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(),
}));

vi.mock('@/lib/server/cms/users/commands', () => ({
  updateCmsUserRole: vi.fn(),
  deleteCmsUser: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PATCH /api/cms/users/[id]', () => {
  const superadminAuth = {
    isAuthed: true,
    user: { id: '1', name: 'Superadmin', email: 'super@example.com', role: 'superadmin' as const },
  } as const;

  it('returns 401 when not authenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/cms/users/5', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'admin' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not superadmin', async () => {
    const { getAuth } = await import('@/lib/auth');
    const { updateCmsUserRole } = await import('@/lib/server/cms/users/commands');
    const { ForbiddenError } = await import('@/lib/api/errors');
    const adminAuth = {
      isAuthed: true,
      user: { id: '2', name: 'Admin', email: 'admin@example.com', role: 'admin' as const },
    } as const;
    vi.mocked(getAuth).mockResolvedValue(adminAuth);
    vi.mocked(updateCmsUserRole).mockRejectedValue(new ForbiddenError('Zakázáno'));

    const req = new Request('http://localhost/api/cms/users/5', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'admin' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid user id', async () => {
    const { getAuth } = await import('@/lib/auth');
    const { updateCmsUserRole } = await import('@/lib/server/cms/users/commands');
    const { ApiError } = await import('@/lib/api/errors');
    vi.mocked(getAuth).mockResolvedValue(superadminAuth);
    vi.mocked(updateCmsUserRole).mockRejectedValue(new ApiError('Neplatné ID', 400));

    const req = new Request('http://localhost/api/cms/users/invalid', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'admin' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: 'invalid' }) });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Neplatné ID' });
  });

  it('returns 400 for invalid role', async () => {
    const { getAuth } = await import('@/lib/auth');
    const { updateCmsUserRole } = await import('@/lib/server/cms/users/commands');
    const { ApiError } = await import('@/lib/api/errors');
    vi.mocked(getAuth).mockResolvedValue(superadminAuth);
    vi.mocked(updateCmsUserRole).mockRejectedValue(new ApiError('Neplatná role', 400));

    const req = new Request('http://localhost/api/cms/users/5', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'invalid_role' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Neplatná role' });
  });

  it('updates user role to admin', async () => {
    const { getAuth } = await import('@/lib/auth');
    const { updateCmsUserRole } = await import('@/lib/server/cms/users/commands');
    vi.mocked(getAuth).mockResolvedValue(superadminAuth);

    vi.mocked(updateCmsUserRole).mockResolvedValue({
      id: '5',
      role: 'admin',
    });

    const req = new Request('http://localhost/api/cms/users/5', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'admin' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.id).toBe('5');
    expect(body.role).toBe('admin');

    expect(updateCmsUserRole).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'superadmin' }),
      '5',
      expect.objectContaining({ role: 'admin' })
    );
  });

  it('updates user role to user', async () => {
    const { getAuth } = await import('@/lib/auth');
    const { updateCmsUserRole } = await import('@/lib/server/cms/users/commands');
    vi.mocked(getAuth).mockResolvedValue(superadminAuth);

    vi.mocked(updateCmsUserRole).mockResolvedValue({
      id: '5',
      role: 'user',
    });

    const req = new Request('http://localhost/api/cms/users/5', {
      method: 'PATCH',
      body: JSON.stringify({ role: 'user' }),
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: '5' }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.role).toBe('user');
  });
});

describe('DELETE /api/cms/users/[id]', () => {
  const superadminAuth = {
    isAuthed: true,
    user: { id: '1', name: 'Superadmin', email: 'super@example.com', role: 'superadmin' as const },
  } as const;

  it('returns 401 when not authenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/cms/users/5', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '5' }) });

    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not superadmin', async () => {
    const { getAuth } = await import('@/lib/auth');
    const { deleteCmsUser } = await import('@/lib/server/cms/users/commands');
    const { ForbiddenError } = await import('@/lib/api/errors');
    const adminAuth = {
      isAuthed: true,
      user: { id: '2', name: 'Admin', email: 'admin@example.com', role: 'admin' as const },
    } as const;
    vi.mocked(getAuth).mockResolvedValue(adminAuth);
    vi.mocked(deleteCmsUser).mockRejectedValue(new ForbiddenError('Zakázáno'));

    const req = new Request('http://localhost/api/cms/users/5', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '5' }) });

    expect(res.status).toBe(403);
  });

  it('returns 400 when trying to delete self', async () => {
    const { getAuth } = await import('@/lib/auth');
    const { deleteCmsUser } = await import('@/lib/server/cms/users/commands');
    const { ApiError } = await import('@/lib/api/errors');
    vi.mocked(getAuth).mockResolvedValue(superadminAuth);
    vi.mocked(deleteCmsUser).mockRejectedValue(new ApiError('Nemůžete smazat sami sebe', 400));

    const req = new Request('http://localhost/api/cms/users/1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Nemůžete smazat sami sebe' });
  });

  it('returns 400 for invalid user id', async () => {
    const { getAuth } = await import('@/lib/auth');
    const { deleteCmsUser } = await import('@/lib/server/cms/users/commands');
    const { ApiError } = await import('@/lib/api/errors');
    vi.mocked(getAuth).mockResolvedValue(superadminAuth);
    vi.mocked(deleteCmsUser).mockRejectedValue(new ApiError('Neplatné ID', 400));

    const req = new Request('http://localhost/api/cms/users/invalid', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'invalid' }) });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Neplatné ID' });
  });

  it('returns 404 when user does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    const { deleteCmsUser } = await import('@/lib/server/cms/users/commands');
    const { ApiError } = await import('@/lib/api/errors');
    vi.mocked(getAuth).mockResolvedValue(superadminAuth);

    vi.mocked(deleteCmsUser).mockRejectedValue(new ApiError('Uživatel nenalezen', 404));

    const req = new Request('http://localhost/api/cms/users/999', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '999' }) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('nenalezen');
  });

  it('deletes user successfully', async () => {
    const { getAuth } = await import('@/lib/auth');
    const { deleteCmsUser } = await import('@/lib/server/cms/users/commands');
    vi.mocked(getAuth).mockResolvedValue(superadminAuth);

    vi.mocked(deleteCmsUser).mockResolvedValue(undefined);

    const req = new Request('http://localhost/api/cms/users/5', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: '5' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(deleteCmsUser).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'superadmin' }),
      '5'
    );
  });
});

