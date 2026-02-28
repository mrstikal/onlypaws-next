import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { updateCmsProfile } from '@/lib/server/cms/profile/commands';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    users: {
      update: vi.fn(),
    },
  },
}));

describe('cms profile commands', () => {
  const userActor = { id: '2', name: 'User', email: 'u@example.com', role: 'user' as const };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updateCmsProfile updates current user profile', async () => {
    vi.mocked(prisma.users.update).mockResolvedValue({ id: 2n } as never);

    await updateCmsProfile(userActor, { name: 'Updated Name' });

    expect(prisma.users.update).toHaveBeenCalled();
  });
});

