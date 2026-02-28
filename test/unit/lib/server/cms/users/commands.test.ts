import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { deleteCmsUser } from '@/lib/server/cms/users/commands';
import { ApiError } from '@/lib/api/errors';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('cms users commands', () => {
  const superadminActor = { id: '1', name: 'Admin', email: 'a@example.com', role: 'superadmin' as const };
  const userActor = { id: '2', name: 'User', email: 'u@example.com', role: 'user' as const };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deleteCmsUser blocks non-superadmin', async () => {
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: 5n } as never);

    await expect(deleteCmsUser(userActor, '5')).rejects.toThrow();
  });

  it('deleteCmsUser returns 404 when user does not exist', async () => {
    vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

    try {
      await deleteCmsUser(superadminActor, '999');
      expect.unreachable('Should have thrown an error');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.message).toContain('nenalezen');
      expect(apiError.status).toBe(404);
    }

    expect(prisma.users.delete).not.toHaveBeenCalled();
  });

  it('deleteCmsUser allows superadmin delete', async () => {
    vi.mocked(prisma.users.findUnique).mockResolvedValue({ id: 6n } as never);
    vi.mocked(prisma.users.delete).mockResolvedValue({ id: 6n } as never);

    await deleteCmsUser(superadminActor, '6');

    expect(prisma.users.delete).toHaveBeenCalled();
  });
});

