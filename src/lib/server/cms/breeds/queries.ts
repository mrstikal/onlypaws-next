import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { bigIntToString } from '@/lib/server/ids';
import { parseDateRangeFilter } from '@/lib/server/cms/shared/dates';
import { formatPaginationParams, calculateLastPage } from '@/lib/server/cms/shared/pagination';
import { buildWhereClause } from '@/lib/server/cms/shared/whereBuilder';
import { buildOrderByWithMap } from '@/lib/server/cms/shared/orderBy';

export type CmsBreedRow = {
  id: string;
  name: string;
  species: string;
  api_id: string | null;
  created_at: string | null;
};

export type CmsBreedsSortKey = 'created_at' | 'id' | 'name' | 'species';
export type CmsBreedsSortDir = 'asc' | 'desc';

export async function loadBreedsPage(opts: {
  page: number;
  perPage: number;

  sortKey?: CmsBreedsSortKey;
  sortDir?: CmsBreedsSortDir;

  fromDate?: string | null; // YYYY-MM-DD
  untilDate?: string | null; // YYYY-MM-DD

  q?: string | null; // name search
  species?: 'dog' | 'cat' | null;
}) {
  const {
    page,
    perPage,
    sortKey = 'created_at',
    sortDir = 'desc',
    fromDate,
    untilDate,
    q,
    species,
  } = opts;

  const whereParts: Prisma.breedsWhereInput[] = [];

  const qTrim = String(q ?? '').trim();
  if (qTrim) whereParts.push({ name: { contains: qTrim, mode: 'insensitive' } });

  const dateFilter = parseDateRangeFilter(fromDate, untilDate);
  if (Object.keys(dateFilter).length > 0) {
    whereParts.push({ created_at: dateFilter as Prisma.DateTimeFilter });
  }

  if (species) whereParts.push({ species });

  const where = buildWhereClause(whereParts);

  const orderBy = buildOrderByWithMap(sortKey, sortDir, {
    created_at: { field: 'created_at', secondary: [{ id: 'desc' }] },
    id: { field: 'id' },
    name: { field: 'name', secondary: [{ id: 'desc' }] },
    species: { field: 'species', secondary: [{ name: 'asc' }, { id: 'desc' }] },
  }, [{ created_at: 'desc' }, { id: 'desc' }]);

  const { safePage, safePerPage, skip, take } = formatPaginationParams(page, perPage);

  const [total, rows] = await Promise.all([
    prisma.breeds.count({ where }),
    prisma.breeds.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        name: true,
        species: true,
        api_id: true,
        created_at: true,
      },
    }),
  ]);

  type BreedSelectResult = {
    id: bigint;
    name: string;
    species: 'dog' | 'cat';
    api_id: string | null;
    created_at: Date | null;
  };

  const mapped: CmsBreedRow[] = (rows as BreedSelectResult[]).map((r) => ({
    id: bigIntToString(r.id),
    name: r.name,
    species: r.species,
    api_id: r.api_id ?? null,
    created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
  }));

  const lastPage = calculateLastPage(total, safePerPage);
  return { total, page: safePage, perPage: safePerPage, lastPage, rows: mapped };
}

