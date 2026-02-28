import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createCmsSubscriptionTier, deleteCmsSubscriptionTier } from '@/lib/server/cms/subscription-tiers/commands';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription_tiers: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('cms subscription-tiers commands', () => {
  const superadminActor = { id: '1', name: 'Admin', email: 'a@example.com', role: 'superadmin' as const };
  const userActor = { id: '2', name: 'User', email: 'u@example.com', role: 'user' as const };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createCmsSubscriptionTier blocks non-superadmin', async () => {
    await expect(createCmsSubscriptionTier(userActor, { name: 'VIP', slug: 'vip' })).rejects.toThrow();
  });

  it('createCmsSubscriptionTier creates tier for superadmin', async () => {
    vi.mocked(prisma.subscription_tiers.create).mockResolvedValue({ id: 10n } as never);

    const result = await createCmsSubscriptionTier(superadminActor, {
      name: 'Premium',
      slug: 'premium',
      price_monthly: 299,
    });

    expect(result).toEqual({ id: '10' });
  });

  it('deleteCmsSubscriptionTier blocks non-superadmin', async () => {
    vi.mocked(prisma.subscription_tiers.findUnique).mockResolvedValue({ id: 5n } as never);

    await expect(deleteCmsSubscriptionTier(userActor, '5')).rejects.toThrow();
  });
});

