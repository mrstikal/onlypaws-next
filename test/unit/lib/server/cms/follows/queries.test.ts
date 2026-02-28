import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { loadFollowsPage } from '@/lib/server/cms/follows/queries';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    follows: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    users: {
      findMany: vi.fn(),
    },
    pets: {
      findMany: vi.fn(),
    },
  },
}));

describe('follows queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps follower and followable labels', async () => {
    vi.mocked(prisma.follows.count).mockResolvedValue(1);
    vi.mocked(prisma.follows.findMany).mockResolvedValue([
      {
        id: 2n,
        follower_type: 'App\\Models\\User',
        follower_id: 10n,
        followable_type: 'App\\Models\\Pet',
        followable_id: 20n,
        created_at: new Date('2024-01-01T00:00:00.000Z'),
      },
    ] as never);

    vi.mocked(prisma.users.findMany)
      .mockResolvedValueOnce([{ id: 10n, name: 'Follower', email: 'f@example.com' }] as never)
      .mockResolvedValueOnce([] as never);
    vi.mocked(prisma.pets.findMany).mockResolvedValue([{ id: 20n, name: 'Micka' }] as never);

    const result = await loadFollowsPage({
      scope: 'all',
      viewerUserId: 1n,
      page: 1,
      perPage: 20,
    });

    expect(result.rows[0]).toMatchObject({
      id: '2',
      follower_id: '10',
      followable_id: '20',
      follower_label: 'Follower',
      followable_label: 'Micka',
    });
  });

  it('returns empty result when userSearch finds no matching users', async () => {
    // First call for userSearch user lookup returns empty
    vi.mocked(prisma.users.findMany).mockResolvedValueOnce([] as never);

    const result = await loadFollowsPage({
      scope: 'all',
      viewerUserId: 1n,
      page: 1,
      perPage: 20,
      userSearch: 'nonexistent',
    });

    expect(result.total).toBe(0);
    expect(result.rows).toEqual([]);
    expect(result.lastPage).toBe(1);
    // Should NOT call follows.count or follows.findMany
    expect(vi.mocked(prisma.follows.count)).not.toHaveBeenCalled();
    expect(vi.mocked(prisma.follows.findMany)).not.toHaveBeenCalled();
  });
});
