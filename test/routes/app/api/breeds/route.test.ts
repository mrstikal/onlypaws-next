import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/breeds/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    breeds: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/breeds', () => {
  it('returns paginated breeds with default params', async () => {
    (prisma.breeds.count as ReturnType<typeof vi.fn>).mockResolvedValue(5);
    (prisma.breeds.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 1n,
        name: 'Labrador',
        species: 'dog',
        description: 'Friendly dog',
        _count: { pets: 3 },
        pets: [],
      },
      {
        id: 2n,
        name: 'Siamese',
        species: 'cat',
        description: 'Elegant cat',
        _count: { pets: 2 },
        pets: [],
      },
    ]);

    const req = new Request('http://localhost/api/breeds');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.breeds.data).toHaveLength(2);
    expect(body.breeds.data[0].name).toBe('Labrador');
    expect(body.breeds.data[0].pets_count).toBe(3);
    expect(body.breeds.current_page).toBe(1);
    expect(body.filters.species).toBe('all');
  });

  it('filters breeds by species', async () => {
    (prisma.breeds.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (prisma.breeds.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 1n,
        name: 'Labrador',
        species: 'dog',
        description: null,
        _count: { pets: 0 },
        pets: [],
      },
    ]);

    const req = new Request('http://localhost/api/breeds?species=dog');
    const res = await GET(req);

    const body = await res.json();
    expect(body.filters.species).toBe('dog');
    expect(prisma.breeds.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ species: 'dog' }),
      })
    );
  });

  it('filters breeds by search query', async () => {
    (prisma.breeds.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (prisma.breeds.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new Request('http://localhost/api/breeds?q=retriever');
    await GET(req);

    expect(prisma.breeds.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: 'retriever', mode: 'insensitive' },
        }),
      })
    );
  });

  it('filters breeds with pets', async () => {
    (prisma.breeds.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (prisma.breeds.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new Request('http://localhost/api/breeds?has_pets=with');
    await GET(req);

    expect(prisma.breeds.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ pets: { some: {} } }),
      })
    );
  });

  it('handles pagination correctly', async () => {
    (prisma.breeds.count as ReturnType<typeof vi.fn>).mockResolvedValue(50);
    (prisma.breeds.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new Request('http://localhost/api/breeds?page=2&per_page=10');
    const res = await GET(req);

    const body = await res.json();
    expect(body.breeds.current_page).toBe(2);
    expect(body.breeds.per_page).toBe(10);
    expect(body.breeds.last_page).toBe(5);

    expect(prisma.breeds.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      })
    );
  });
});

