import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/utils/slugify';
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
  const hasPets = (searchParams.get('has_pets') ?? 'all') as 'all' | 'with' | 'without';
  const q = (searchParams.get('q') ?? '').trim();

  const where: Record<string, unknown> = {};

  if (species !== 'all') where.species = species;
  if (q) where.name = { contains: q, mode: 'insensitive' };

  if (hasPets === 'with') where.pets = { some: {} };
  if (hasPets === 'without') where.pets = { none: {} };

  const skip = (page - 1) * perPage;
  const take = perPage;

  const [total, breeds] = await Promise.all([
    prisma.breeds.count({ where }),
    prisma.breeds.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take,
      include: {
        pets: {
          select: {
            id: true,
            name: true,
            profile_picture: true,
          },
          orderBy: { id: 'desc' },
          take: 8,
        },
        _count: { select: { pets: true } },
      },
    }),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / perPage));

  return NextResponse.json({
    breeds: {
      data: breeds.map((b) => ({
        id: bigIntToString(b.id),
        name: b.name,
        species: b.species,
        description: b.description,
        pets_count: b._count?.pets ?? 0,
        pets: (b.pets ?? []).map((p) => {
          const name = String(p.name ?? '');
          return {
            id: bigIntToString(p.id),
            name,
            slug: slugify(name),
            profile_picture: p.profile_picture ?? null,
          };
        }),
      })),
      current_page: page,
      last_page: lastPage,
      total,
      per_page: perPage,
    },
    filters: {
      species,
      has_pets: hasPets,
      q,
    },
  });
}