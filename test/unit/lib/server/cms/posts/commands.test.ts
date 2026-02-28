import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createCmsPost, deleteCmsPost, updateCmsPost } from '@/lib/server/cms/posts/commands';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pets: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    posts: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    subscription_tiers: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('cms posts commands', () => {
  const userActor = { id: '10', name: 'User', email: 'u@example.com', role: 'user' as const };
  const staffActor = { id: '11', name: 'Admin', email: 'a@example.com', role: 'admin' as const };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createCmsPost blocks staff users', async () => {
    await expect(createCmsPost(staffActor, { pet_id: '1', media_url: 'a.jpg' })).rejects.toMatchObject({
      status: 403,
      message: 'Zakázáno',
    });
  });

  it('createCmsPost rejects premium posts without tier id', async () => {
    await expect(
      createCmsPost(userActor, {
        pet_id: '22',
        media_url: 'posts/dog.jpg',
        is_premium: true,
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'subscription_tier_id je povinný pro premium post',
    });
  });

  it('createCmsPost rejects premium posts with missing tier', async () => {
    vi.mocked(prisma.subscription_tiers.findUnique).mockResolvedValue(null);

    await expect(
      createCmsPost(userActor, {
        pet_id: '22',
        media_url: 'posts/dog.jpg',
        is_premium: true,
        subscription_tier_id: '999',
      }),
    ).rejects.toMatchObject({
      status: 404,
      message: 'Nenalezeno',
    });
  });

  it('createCmsPost creates post and normalizes posts/ prefix', async () => {
    vi.mocked(prisma.pets.findFirst).mockResolvedValue({ id: 22n } as never);
    vi.mocked(prisma.$transaction).mockResolvedValue({ id: 44n });

    const result = await createCmsPost(userActor, {
      pet_id: '22',
      media_url: 'posts/dog.jpg',
      caption: ' hello ',
      is_premium: false,
    });

    expect(result).toEqual({ id: '44' });
    expect(prisma.pets.findFirst).toHaveBeenCalledWith({
      where: { id: 22n, user_id: 10n },
      select: { id: true },
    });
  });

  it('updateCmsPost rejects non-owner non-staff', async () => {
    vi.mocked(prisma.posts.findUnique).mockResolvedValue({
      id: 1n,
      pet_id: 2n,
      pet: { user_id: 999n },
    } as never);

    await expect(updateCmsPost(userActor, '1', { media_url: 'x.jpg' })).rejects.toMatchObject({
      status: 403,
      message: 'Zakázáno',
    });
  });

  it('updateCmsPost rejects premium update without tier id', async () => {
    vi.mocked(prisma.posts.findUnique).mockResolvedValue({
      id: 1n,
      pet_id: 2n,
      pet: { user_id: 10n },
    } as never);

    await expect(
      updateCmsPost(userActor, '1', {
        media_url: 'x.jpg',
        is_premium: true,
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'subscription_tier_id je povinný pro premium post',
    });
  });

  it('updateCmsPost rejects premium update with missing tier', async () => {
    vi.mocked(prisma.posts.findUnique).mockResolvedValue({
      id: 1n,
      pet_id: 2n,
      pet: { user_id: 10n },
    } as never);
    vi.mocked(prisma.subscription_tiers.findUnique).mockResolvedValue(null);

    await expect(
      updateCmsPost(userActor, '1', {
        media_url: 'x.jpg',
        is_premium: true,
        subscription_tier_id: '999',
      }),
    ).rejects.toMatchObject({
      status: 404,
      message: 'Nenalezeno',
    });
  });

  it('deleteCmsPost deletes post and decrements posts_count for staff', async () => {
    vi.mocked(prisma.posts.findUnique).mockResolvedValue({
      id: 3n,
      pet_id: 20n,
      pet: { user_id: 20n },
    } as never);

    const txPostsDelete = vi.fn().mockResolvedValue({ id: 3n });
    const txPetsUpdate = vi.fn().mockResolvedValue({ id: 20n });

    await deleteCmsPost(staffActor, '3');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const txCallback = (prisma.$transaction as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | ((tx: any) => Promise<unknown>)
      | undefined;

    expect(txCallback).toBeTypeOf('function');
    await txCallback?.({
      posts: { delete: txPostsDelete },
      pets: { update: txPetsUpdate },
    });

    expect(txPostsDelete).toHaveBeenCalledWith({ where: { id: 3n } });
    expect(txPetsUpdate).toHaveBeenCalledWith({
      where: { id: 20n },
      data: { posts_count: { decrement: 1 } },
      select: { id: true },
    });
  });
});
