import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { updateCmsComment } from '@/lib/server/cms/comments/commands';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    comments: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('cms comments commands', () => {
  const staffActor = { id: '1', name: 'Admin', email: 'a@example.com', role: 'admin' as const };
  const userActor = { id: '2', name: 'User', email: 'u@example.com', role: 'user' as const };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updateCmsComment blocks non-author non-staff', async () => {
    vi.mocked(prisma.comments.findUnique).mockResolvedValue({
      id: 1n,
      user_id: 999n,
    } as never);

    await expect(updateCmsComment(userActor, '1', { body: 'x' })).rejects.toThrow();
  });

  it('updateCmsComment allows staff update', async () => {
    vi.mocked(prisma.comments.findUnique).mockResolvedValue({
      id: 2n,
      user_id: 999n,
    } as never);
    vi.mocked(prisma.comments.update).mockResolvedValue({ id: 2n } as never);

    await updateCmsComment(staffActor, '2', { body: 'updated' });

    expect(prisma.comments.update).toHaveBeenCalled();
  });
});

