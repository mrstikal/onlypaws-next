import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { deleteCmsLike } from '@/lib/server/cms/likes/commands';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    likes: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('cms likes commands', () => {
  const superadminActor = { id: '1', name: 'Admin', email: 'a@example.com', role: 'superadmin' as const };
  const userActor = { id: '2', name: 'User', email: 'u@example.com', role: 'user' as const };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deleteCmsLike blocks non-superadmin', async () => {
    vi.mocked(prisma.likes.findUnique).mockResolvedValue({
      id: 1n,
      user_id: 999n,
    } as never);

    await expect(deleteCmsLike(userActor, '1')).rejects.toThrow();
  });

  it('deleteCmsLike calls transaction for superadmin', async () => {
    vi.mocked(prisma.likes.findUnique).mockResolvedValue({ id: 2n, user_id: 3n } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined);

    await deleteCmsLike(superadminActor, '2');

    expect(prisma.likes.findUnique).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

