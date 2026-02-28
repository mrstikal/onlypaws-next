import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { deleteCmsFollow } from '@/lib/server/cms/follows/commands';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    follows: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('cms follows commands', () => {
  const staffActor = { id: '1', name: 'Admin', email: 'a@example.com', role: 'admin' as const };
  const userActor = { id: '2', name: 'User', email: 'u@example.com', role: 'user' as const };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deleteCmsFollow blocks non-follower non-staff', async () => {
    vi.mocked(prisma.follows.findUnique).mockResolvedValue({
      id: 1n,
      follower_type: 'App\\Models\\User',
      follower_id: 999n,
    } as never);

    await expect(deleteCmsFollow(userActor, '1')).rejects.toMatchObject({
      status: 403,
      message: 'Zakázáno',
    });
  });

  it('deleteCmsFollow allows staff delete', async () => {
    vi.mocked(prisma.follows.findUnique).mockResolvedValue({
      id: 2n,
      follower_type: 'App\\Models\\User',
      follower_id: 3n,
    } as never);
    vi.mocked(prisma.follows.delete).mockResolvedValue({ id: 2n } as never);

    await deleteCmsFollow(staffActor, '2');

    expect(prisma.follows.delete).toHaveBeenCalledWith({ where: { id: 2n } });
  });
});

