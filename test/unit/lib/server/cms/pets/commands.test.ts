import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createCmsPet, deleteCmsPet, updateCmsPet } from '@/lib/server/cms/pets/commands';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    breeds: {
      findUnique: vi.fn(),
    },
    pets: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('cms pets commands', () => {
  const userActor = { id: '5', name: 'User', email: 'u@example.com', role: 'user' as const };
  const staffActor = { id: '1', name: 'Admin', email: 'a@example.com', role: 'admin' as const };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createCmsPet blocks staff users', async () => {
    await expect(createCmsPet(staffActor, { name: 'A' })).rejects.toMatchObject({
      status: 403,
      message: 'Zakázáno',
    });
  });

  it('createCmsPet creates pet and normalizes pets/ prefix', async () => {
    vi.mocked(prisma.breeds.findUnique).mockResolvedValue({ id: 7n } as never);
    vi.mocked(prisma.pets.create).mockResolvedValue({ id: 100n } as never);

    const result = await createCmsPet(userActor, {
      name: '  Micka ',
      breed_id: '7',
      profile_picture: 'pets/micka.jpg',
    });

    expect(result).toEqual({ id: '100' });
    expect(prisma.pets.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        user_id: 5n,
        name: 'Micka',
        breed_id: 7n,
        profile_picture: 'micka.jpg',
      }),
      select: { id: true },
    });
  });

  it('updateCmsPet rejects invalid avatar file', async () => {
    vi.mocked(prisma.pets.findUnique).mockResolvedValue({ id: 2n, user_id: 5n } as never);

    await expect(updateCmsPet(userActor, '2', { name: 'M', profile_picture: '../x' })).rejects.toMatchObject({
      status: 400,
      message: 'Neplatný avatar',
    });
  });

  it('deleteCmsPet allows staff delete', async () => {
    vi.mocked(prisma.pets.findUnique).mockResolvedValue({ id: 2n, user_id: 99n } as never);
    vi.mocked(prisma.pets.delete).mockResolvedValue({ id: 2n } as never);

    await deleteCmsPet(staffActor, '2');

    expect(prisma.pets.delete).toHaveBeenCalledWith({ where: { id: 2n } });
  });
});

