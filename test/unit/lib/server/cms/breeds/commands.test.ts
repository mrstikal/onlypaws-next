import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createCmsBreed, deleteCmsBreed, updateCmsBreed } from '@/lib/server/cms/breeds/commands';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    breeds: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    pets: {
      findFirst: vi.fn(),
    },
  },
}));

describe('cms breeds commands', () => {
  const staffActor = { id: '1', name: 'Admin', email: 'a@example.com', role: 'admin' as const };
  const userActor = { id: '2', name: 'User', email: 'u@example.com', role: 'user' as const };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createCmsBreed blocks non-staff users', async () => {
    await expect(createCmsBreed(userActor, { name: 'x', species: 'dog' })).rejects.toMatchObject({
      status: 403,
      message: 'Zakázáno',
    });
  });

  it('createCmsBreed creates new breed', async () => {
    vi.mocked(prisma.breeds.create).mockResolvedValue({ id: 77n } as never);

    const result = await createCmsBreed(staffActor, {
      name: 'Labrador',
      species: 'dog',
      api_id: 'api-1',
    });

    expect(result).toEqual({ id: '77' });
  });

  it('deleteCmsBreed returns conflict when breed is used by pets', async () => {
    vi.mocked(prisma.pets.findFirst).mockResolvedValue({ id: 9n } as never);

    await expect(deleteCmsBreed(staffActor, '5')).rejects.toMatchObject({
      status: 409,
      message: 'Plemeno se používá u mazlíčků',
    });
  });

  it('updateCmsBreed updates existing breed', async () => {
    vi.mocked(prisma.breeds.findUnique).mockResolvedValue({ id: 5n } as never);
    vi.mocked(prisma.breeds.update).mockResolvedValue({ id: 5n } as never);

    await updateCmsBreed(staffActor, '5', { name: 'British Shorthair', species: 'cat' });

    expect(prisma.breeds.update).toHaveBeenCalledWith({
      where: { id: 5n },
      data: expect.objectContaining({ name: 'British Shorthair', species: 'cat' }),
      select: { id: true },
    });
  });
});

