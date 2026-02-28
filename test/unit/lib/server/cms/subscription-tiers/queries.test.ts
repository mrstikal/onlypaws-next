import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { loadSubscriptionTiersPage } from '@/lib/server/cms/subscription-tiers/queries';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription_tiers: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('subscription tiers queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps tier rows and keeps default sort', async () => {
    vi.mocked(prisma.subscription_tiers.count).mockResolvedValue(1);
    vi.mocked(prisma.subscription_tiers.findMany).mockResolvedValue([
      {
        id: 1n,
        name: 'VIP',
        slug: 'vip',
        price_monthly: 199,
        created_at: new Date('2024-01-01T00:00:00.000Z'),
      },
    ] as never);

    const result = await loadSubscriptionTiersPage({ page: 1, perPage: 20, q: 'vip' });

    expect(prisma.subscription_tiers.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 })
    );
    expect(result.rows[0]).toMatchObject({
      id: '1',
      name: 'VIP',
      slug: 'vip',
      price_monthly: 199,
    });
  });
});

