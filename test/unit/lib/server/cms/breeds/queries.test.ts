import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { loadBreedsPage } from '@/lib/server/cms/breeds/queries';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    breeds: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('breeds queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps breeds page response', async () => {
    vi.mocked(prisma.breeds.count).mockResolvedValue(1);
    vi.mocked(prisma.breeds.findMany).mockResolvedValue([
      {
        id: 3n,
        name: 'Labrador',
        species: 'dog',
        api_id: 'dog-1',
        created_at: new Date('2024-01-03T00:00:00.000Z'),
      },
    ] as never);

    const result = await loadBreedsPage({ page: 1, perPage: 20, q: 'lab' });

    expect(prisma.breeds.count).toHaveBeenCalled();
    expect(result.rows[0]).toMatchObject({
      id: '3',
      name: 'Labrador',
      species: 'dog',
      api_id: 'dog-1',
    });
  });
});

