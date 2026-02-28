import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/pets/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pets: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/pets', () => {
  it('returns paginated pets with default params', async () => {
    (prisma.pets.count as ReturnType<typeof vi.fn>).mockResolvedValue(2);
    (prisma.pets.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 1n,
        name: 'Micka',
        profile_picture: null,
        likes_count: 10,
        followers_count: 5,
        comments_count: 3,
        created_at: new Date('2026-01-01'),
        breeds: { name: 'Labrador', species: 'dog' },
      },
      {
        id: 2n,
        name: 'Alik',
        profile_picture: 'alik.jpg',
        likes_count: 8,
        followers_count: 4,
        comments_count: 2,
        created_at: new Date('2026-01-02'),
        breeds: { name: 'Siamese', species: 'cat' },
      },
    ]);

    const req = new Request('http://localhost/api/pets');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.pets.data).toHaveLength(2);
    expect(body.pets.data[0].name).toBe('Micka');
    expect(body.pets.data[0].breed.name).toBe('Labrador');
    expect(body.pets.current_page).toBe(1);
    expect(body.filters.species).toBe('all');
    expect(body.filters.sort).toBe('likes');
  });

  it('filters pets by species via breed', async () => {
    (prisma.pets.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (prisma.pets.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new Request('http://localhost/api/pets?species=dog');
    await GET(req);

    expect(prisma.pets.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          breeds: { is: { species: 'dog' } },
        }),
      })
    );
  });

  it('filters pets by search query', async () => {
    (prisma.pets.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (prisma.pets.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new Request('http://localhost/api/pets?q=micka');
    await GET(req);

    expect(prisma.pets.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: 'micka', mode: 'insensitive' },
        }),
      })
    );
  });

  it('sorts pets by followers when specified', async () => {
    (prisma.pets.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.pets.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new Request('http://localhost/api/pets?sort=followers&dir=asc');
    await GET(req);

    expect(prisma.pets.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ followers_count: 'asc' }, { id: 'desc' }],
      })
    );
  });

  it('sorts pets by created date when specified', async () => {
    (prisma.pets.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.pets.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new Request('http://localhost/api/pets?sort=created');
    await GET(req);

    expect(prisma.pets.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      })
    );
  });

  it('handles pagination correctly', async () => {
    (prisma.pets.count as ReturnType<typeof vi.fn>).mockResolvedValue(50);
    (prisma.pets.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new Request('http://localhost/api/pets?page=2&per_page=10');
    const res = await GET(req);

    const body = await res.json();
    expect(body.pets.current_page).toBe(2);
    expect(body.pets.per_page).toBe(10);
    expect(body.pets.last_page).toBe(5);

    expect(prisma.pets.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      })
    );
  });

  it('handles pets without breed', async () => {
    (prisma.pets.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (prisma.pets.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 1n,
        name: 'Rex',
        profile_picture: null,
        likes_count: 0,
        followers_count: 0,
        comments_count: 0,
        created_at: null,
        breeds: null,
      },
    ]);

    const req = new Request('http://localhost/api/pets');
    const res = await GET(req);

    const body = await res.json();
    expect(body.pets.data[0].breed).toBeNull();
  });
});

