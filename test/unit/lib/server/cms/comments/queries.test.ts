import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { loadCommentsPage } from '@/lib/server/cms/comments/queries';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    comments: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('comments queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps comment rows and trims body text', async () => {
    vi.mocked(prisma.comments.count).mockResolvedValue(1);
    vi.mocked(prisma.comments.findMany).mockResolvedValue([
      {
        id: 10n,
        body: 'A'.repeat(300),
        likes_count: 2,
        user_id: 5n,
        commentable_type: 'App\\Models\\Post',
        commentable_id: 7n,
        parent_id: null,
        created_at: new Date('2024-01-01T00:00:00.000Z'),
        user: { name: 'Eva', email: 'e@example.com' },
      },
    ] as never);

    const result = await loadCommentsPage({
      scope: 'mine',
      viewerUserId: 5n,
      page: 1,
      perPage: 20,
      type: 'post',
    });

    const row = result.rows[0];
    expect(row).toBeDefined();
    expect(row?.body.length ?? 0).toBeLessThanOrEqual(160);
  });
});
