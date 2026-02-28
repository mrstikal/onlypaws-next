import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { publicUrl } from '@/utils/mediaUrl';
import { bigIntToString } from '@/lib/server/ids';
import { parseDateRangeFilter } from '@/lib/server/cms/shared/dates';
import { formatPaginationParams, calculateLastPage } from '@/lib/server/cms/shared/pagination';
import { buildWhereClause } from '@/lib/server/cms/shared/whereBuilder';
import { buildOrderByWithMap } from '@/lib/server/cms/shared/orderBy';

export type CmsPetRow = {
  id: string;
  name: string;
  user_id: string;
  user_label: string | null;
  species: 'dog' | 'cat' | null;
  breed_name: string | null;
  profile_picture: string | null;
  followers_count: number;
  posts_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string | null;
};

export type CmsPetsSortKey = 'created_at' | 'id' | 'name' | 'user_id' | 'likes_count' | 'followers_count' | 'posts_count';
export type CmsPetsSortDir = 'asc' | 'desc';

export async function loadPetsPage(opts: {
  scope: 'mine' | 'all';
  viewerUserId: bigint;
  page: number;
  perPage: number;

  sortKey?: CmsPetsSortKey;
  sortDir?: CmsPetsSortDir;

  fromDate?: string | null; // YYYY-MM-DD
  untilDate?: string | null; // YYYY-MM-DD

  q?: string | null; // search by pet name
  userSearch?: string | null; // search owner (name/email)
  species?: 'dog' | 'cat' | null;
}) {
  const {
    scope,
    viewerUserId,
    page,
    perPage,
    sortKey = 'created_at',
    sortDir = 'desc',
    fromDate,
    untilDate,
    q,
    userSearch,
    species,
  } = opts;

  const whereParts: Prisma.petsWhereInput[] = [];

  if (scope === 'mine') {
    whereParts.push({ user_id: viewerUserId });
  }

  const qTrim = String(q ?? '').trim();
  if (qTrim) {
    whereParts.push({ name: { contains: qTrim, mode: 'insensitive' } });
  }

  const dateFilter = parseDateRangeFilter(fromDate, untilDate);
  if (Object.keys(dateFilter).length > 0) {
    whereParts.push({ created_at: dateFilter as Prisma.DateTimeFilter });
  }

  const u = String(userSearch ?? '').trim();
  if (u) {
    whereParts.push({
      OR: [
        { user: { name: { contains: u, mode: 'insensitive' } } },
        { user: { email: { contains: u, mode: 'insensitive' } } },
      ],
    });
  }

  if (species) {
    whereParts.push({ breeds: { is: { species } } });
  }

  const where = buildWhereClause(whereParts);

  const orderBy = buildOrderByWithMap(sortKey, sortDir, {
    created_at: { field: 'created_at', secondary: [{ id: 'desc' }] },
    id: { field: 'id' },
    name: { field: 'name', secondary: [{ id: 'desc' }] },
    user_id: { field: 'user_id', secondary: [{ id: 'desc' }] },
    likes_count: { field: 'likes_count', secondary: [{ id: 'desc' }] },
    followers_count: { field: 'followers_count', secondary: [{ id: 'desc' }] },
    posts_count: { field: 'posts_count', secondary: [{ id: 'desc' }] },
  }, [{ created_at: 'desc' }, { id: 'desc' }]);

  const { safePage, safePerPage, skip, take } = formatPaginationParams(page, perPage);

  const [total, rows] = await Promise.all([
    prisma.pets.count({ where }),
    prisma.pets.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        name: true,
        user_id: true,
        created_at: true,
        profile_picture: true,
        likes_count: true,
        followers_count: true,
        posts_count: true,
        comments_count: true,
        user: { select: { name: true, email: true } },
        breeds: { select: { name: true, species: true } },
      },
    }),
  ]);

  type PetSelectResult = {
    id: bigint;
    name: string;
    user_id: bigint;
    created_at: Date | null;
    profile_picture: string | null;
    likes_count: number | null;
    followers_count: number | null;
    posts_count: number | null;
    comments_count: number | null;
    user: { name: string; email: string } | null;
    breeds: { name: string; species: 'dog' | 'cat' } | null;
  };

  const mapped: CmsPetRow[] = (rows as PetSelectResult[]).map((r) => {
    const userLabel = r.user?.name?.trim() || r.user?.email?.trim() || null;

    return {
      id: bigIntToString(r.id),
      name: r.name,
      user_id: bigIntToString(r.user_id),
      user_label: userLabel,
      species: (r.breeds?.species as 'dog' | 'cat' | null) ?? null,
      breed_name: r.breeds?.name ?? null,
      profile_picture: publicUrl('pets', r.profile_picture),
      followers_count: r.followers_count ?? 0,
      posts_count: r.posts_count ?? 0,
      likes_count: r.likes_count ?? 0,
      comments_count: r.comments_count ?? 0,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
    };
  });

  const lastPage = calculateLastPage(total, safePerPage);

  return { total, page: safePage, perPage: safePerPage, lastPage, rows: mapped };
}

