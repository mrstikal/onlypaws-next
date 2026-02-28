import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { slugify } from '@/utils/slugify';
import { publicUrl } from '@/utils/mediaUrl';
import { clampInt } from '@/utils/params';
import { bigIntToString } from '@/utils/bigint';
import { config } from '@/lib/config';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const page = clampInt(searchParams.get('page'), 1, 1, config.pagination.maxPage);
  const perPage = clampInt(
    searchParams.get('per_page'),
    18,
    config.pagination.minPerPage,
    config.pagination.maxPerPage
  );

  const species = (searchParams.get('species') ?? 'all') as 'all' | 'dog' | 'cat';
  const sort = (searchParams.get('sort') ?? 'likes') as 'likes' | 'followers' | 'created';
  const dir = (searchParams.get('dir') ?? 'desc') as 'asc' | 'desc';
  const q = (searchParams.get('q') ?? '').trim();

  const where: Prisma.petsWhereInput = {};
  if (q) where.name = { contains: q, mode: 'insensitive' };

  if (species !== 'all') {
    where.breeds = { is: { species } };
  }

  const orderBy: Prisma.petsOrderByWithRelationInput[] = [
    sort === 'created'
      ? { created_at: dir }
      : sort === 'followers'
        ? { followers_count: dir }
        : { likes_count: dir },
    { id: 'desc' },
  ];

  const skip = (page - 1) * perPage;
  const take = perPage;

  const [total, pets] = await Promise.all([
    prisma.pets.count({ where }),
    prisma.pets.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        breeds: { select: { name: true, species: true } },
      },
    }),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / perPage));

  return NextResponse.json({
    pets: {
      data: pets.map((p) => ({
        id: bigIntToString(p.id),
        name: p.name,
        slug: slugify(String(p.name ?? '')) || `pet-${bigIntToString(p.id)}`,
        profile_picture: publicUrl('pets', p.profile_picture),
        likes_count: p.likes_count ?? 0,
        followers_count: p.followers_count ?? 0,
        comments_count: p.comments_count ?? 0,
        created_at: p.created_at ? new Date(p.created_at).toISOString() : null,
        breed: p.breeds ? { name: p.breeds.name, species: p.breeds.species } : null,
      })),
      current_page: page,
      last_page: lastPage,
      total,
      per_page: perPage,
    },
    filters: { species, sort, dir, q },
  });
}