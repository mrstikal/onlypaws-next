import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { publicUrl } from '@/utils/mediaUrl';
import { clampInt } from '@/utils/params';
import { bigIntToString } from '@/utils/bigint';
import { slugify } from '@/utils/slugify';
import { config } from '@/lib/config';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const page = clampInt(searchParams.get('page'), 1, 1, config.pagination.maxPage);
  const perPage = clampInt(
    searchParams.get('per_page'),
    config.pagination.defaultPerPage,
    config.pagination.minPerPage,
    config.pagination.maxPerPage
  );

  const sort = (searchParams.get('sort') ?? 'likes') as 'date' | 'likes' | 'comments';
  const dir = (searchParams.get('dir') ?? 'desc') as 'asc' | 'desc';
  const q = (searchParams.get('q') ?? '').trim();

  const where: Prisma.postsWhereInput = {};
  if (q) {
    where.OR = [
      { caption: { contains: q, mode: 'insensitive' } },
      { pet: { is: { name: { contains: q, mode: 'insensitive' } } } },
    ];
  }

  const orderBy: Prisma.postsOrderByWithRelationInput[] = [
    sort === 'date'
      ? { created_at: dir }
      : sort === 'comments'
        ? { comments_count: dir }
        : { likes_count: dir },
    { id: 'desc' },
  ];

  const skip = (page - 1) * perPage;
  const take = perPage;

  const [total, posts, recommendedPets] = await Promise.all([
    prisma.posts.count({ where }),
    prisma.posts.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            profile_picture: true,
            followers_count: true,
            likes_count: true,
            posts_count: true,
            comments_count: true,
          },
        },
        subscription_tiers: {
          select: { id: true, name: true, slug: true, price_monthly: true },
        },
      },
    }),
    prisma.pets.findMany({
      orderBy: [{ followers_count: 'desc' }, { id: 'desc' }],
      take: 8,
      select: {
        id: true,
        name: true,
        profile_picture: true,
        followers_count: true,
      },
    }),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / perPage));

  return NextResponse.json({
    posts: {
      data: posts.map((p) => ({
        id: bigIntToString(p.id),
        caption: p.caption,
        media_url: publicUrl('posts', p.media_url) ?? '',
        media_type: p.media_type,
        likes_count: p.likes_count,
        comments_count: p.comments_count,
        is_premium: p.is_premium,
        created_at: p.created_at,
        pet: p.pet
          ? {
              id: bigIntToString(p.pet.id),
              name: p.pet.name,
              profile_picture: publicUrl('pets', p.pet.profile_picture),
              followers_count: p.pet.followers_count,
              likes_count: p.pet.likes_count,
              posts_count: p.pet.posts_count,
              comments_count: p.pet.comments_count,
            }
          : null,

        required_tier: p.subscription_tiers ? { name: p.subscription_tiers.name } : null,
        required_tier_slug: p.subscription_tiers?.slug ?? 'free',
        locked: false,
      })),
      current_page: page,
      last_page: lastPage,
      total,
      per_page: perPage,
    },
    recommendedPets: recommendedPets.map((p) => ({
      id: bigIntToString(p.id),
      name: p.name,
      slug: slugify(String(p.name ?? '')) || `pet-${bigIntToString(p.id)}`,
      profile_picture: publicUrl('pets', p.profile_picture),
      followers_count: p.followers_count ?? 0,
    })),
  });
}