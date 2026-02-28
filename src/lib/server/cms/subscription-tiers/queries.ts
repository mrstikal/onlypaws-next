import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { bigIntToString } from '@/lib/server/ids';
import { parseDateRangeFilter } from '@/lib/server/cms/shared/dates';
import { formatPaginationParams, calculateLastPage } from '@/lib/server/cms/shared/pagination';
import { buildWhereClause } from '@/lib/server/cms/shared/whereBuilder';
import { buildOrderByWithMap } from '@/lib/server/cms/shared/orderBy';

export type CmsTierRow = {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  created_at: string | null;
};

export type CmsTiersSortKey = 'created_at' | 'id' | 'name' | 'slug' | 'price_monthly';
export type CmsTiersSortDir = 'asc' | 'desc';

export async function loadSubscriptionTiersPage(opts: {
  page: number;
  perPage: number;

  sortKey?: CmsTiersSortKey;
  sortDir?: CmsTiersSortDir;

  fromDate?: string | null; // YYYY-MM-DD
  untilDate?: string | null; // YYYY-MM-DD
  q?: string | null; // name/slug
}) {
  const {
    page,
    perPage,
    sortKey = 'price_monthly',
    sortDir = 'asc',
    fromDate,
    untilDate,
    q,
  } = opts;

  const whereParts: Prisma.subscription_tiersWhereInput[] = [];

  const qTrim = String(q ?? '').trim();
  if (qTrim) {
    whereParts.push({
      OR: [
        { name: { contains: qTrim, mode: 'insensitive' } },
        { slug: { contains: qTrim, mode: 'insensitive' } },
      ],
    });
  }

  const dateFilter = parseDateRangeFilter(fromDate, untilDate);
  if (Object.keys(dateFilter).length > 0) {
    whereParts.push({ created_at: dateFilter as Prisma.DateTimeFilter });
  }

  const where = buildWhereClause(whereParts);

  const orderBy = buildOrderByWithMap(sortKey, sortDir, {
    price_monthly: { field: 'price_monthly', secondary: [{ id: 'asc' }] },
    created_at: { field: 'created_at', secondary: [{ id: 'desc' }] },
    id: { field: 'id' },
    name: { field: 'name', secondary: [{ id: 'desc' }] },
    slug: { field: 'slug', secondary: [{ id: 'desc' }] },
  }, [{ price_monthly: 'asc' }, { id: 'asc' }]);

  const { safePage, safePerPage, skip, take } = formatPaginationParams(page, perPage);

  const [total, rows] = await Promise.all([
    prisma.subscription_tiers.count({ where }),
    prisma.subscription_tiers.findMany({
      where,
      orderBy,
      skip,
      take,
      select: { id: true, name: true, slug: true, price_monthly: true, created_at: true },
    }),
  ]);

  type TierSelectResult = {
    id: bigint;
    name: string;
    slug: string;
    price_monthly: number;
    created_at: Date | null;
  };

  const mapped: CmsTierRow[] = (rows as TierSelectResult[]).map((r) => ({
    id: bigIntToString(r.id),
    name: r.name,
    slug: r.slug,
    price_monthly: r.price_monthly ?? 0,
    created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
  }));

  const lastPage = calculateLastPage(total, safePerPage);
  return { total, page: safePage, perPage: safePerPage, lastPage, rows: mapped };
}

