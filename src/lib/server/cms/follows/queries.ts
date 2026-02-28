import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { bigIntToString } from '@/lib/server/ids';
import { parseDateRangeFilter } from '@/lib/server/cms/shared/dates';
import { formatPaginationParams, calculateLastPage } from '@/lib/server/cms/shared/pagination';
import { buildWhereClause } from '@/lib/server/cms/shared/whereBuilder';
import { buildOrderByWithMap } from '@/lib/server/cms/shared/orderBy';
import { POLYMORPHIC_MODEL_NAMES, modelTypeToKind } from '@/lib/server/cms/polymorphic';

export type CmsFollowRow = {
  id: string;
  follower_type: string;
  follower_id: string;
  follower_label: string;

  followable_type: string;
  followable_id: string;
  followable_label: string;

  created_at: string | null;
};

export type CmsFollowsTypeFilter = 'pet' | 'user';
export type CmsFollowsSortKey = 'created_at' | 'id' | 'follower_id' | 'followable_id' | 'followable_type';
export type CmsFollowsSortDir = 'asc' | 'desc';

/**
 * Určí typ followable entity (pet/user).
 * Používá centrální polymorfní konverzi, ale rozšířenou o support pro User.
 * @param type - DB typ (např. 'App\\Models\\Pet', 'App\\Models\\User')
 * @returns 'pet' | 'user' | 'unknown'
 */
function followableKind(type: string): 'pet' | 'user' | 'unknown' {
  const trimmed = type.trim();
  // Využití centrální logiky pro pet
  const kind = modelTypeToKind(trimmed);
  if (kind === 'pet') return 'pet';

  // Rozšíření pro User (follow může být na user, ale user není v PolymorphicKind)
  if (trimmed === POLYMORPHIC_MODEL_NAMES.USER || trimmed.endsWith('\\User')) return 'user';

  return 'unknown';
}

export async function loadFollowsPage(opts: {
  scope: 'mine' | 'all';
  viewerUserId: bigint;
  page: number;
  perPage: number;

  sortKey?: CmsFollowsSortKey;
  sortDir?: CmsFollowsSortDir;

  fromDate?: string | null; // YYYY-MM-DD
  untilDate?: string | null; // YYYY-MM-DD

  userSearch?: string | null; // hledání follower user name/email (jen staff)
  type?: CmsFollowsTypeFilter | null; // filtr followable typu
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
    userSearch,
    type,
  } = opts;

  const whereParts: Prisma.followsWhereInput[] = [];

  if (scope === 'mine') {
    whereParts.push({
      follower_type: POLYMORPHIC_MODEL_NAMES.USER,
      follower_id: viewerUserId,
    });
  }

  const dateFilter = parseDateRangeFilter(fromDate, untilDate);
  if (Object.keys(dateFilter).length > 0) {
    whereParts.push({ created_at: dateFilter as Prisma.DateTimeFilter });
  }

  if (type) {
    const map: Record<CmsFollowsTypeFilter, string> = {
      pet: POLYMORPHIC_MODEL_NAMES.PET,
      user: POLYMORPHIC_MODEL_NAMES.USER,
    };
    whereParts.push({ followable_type: map[type] });
  }

  // Format pagination params early (needed for early return on empty search)
  const { safePage, safePerPage, skip, take } = formatPaginationParams(page, perPage);

  // Handle userSearch BEFORE building where clause - search for matching user IDs first
  const uSearch = String(userSearch ?? '').trim();
  let userSearchIds: bigint[] | null = null;

  if (uSearch) {
    const matchingUsers = await prisma.users.findMany({
      where: {
        OR: [
          { name: { contains: uSearch, mode: 'insensitive' } },
          { email: { contains: uSearch, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
      take: 200,
    });

    if (matchingUsers.length === 0) {
      // No matching users found, return empty result
      return {
        total: 0,
        page: safePage,
        perPage: safePerPage,
        lastPage: 1,
        rows: [],
      };
    }

    userSearchIds = matchingUsers.map((u) => u.id);
    // Add filter to where: follower must be one of the matching users
    whereParts.push({
      follower_type: POLYMORPHIC_MODEL_NAMES.USER,
      follower_id: { in: userSearchIds },
    });
  }

  const where = buildWhereClause(whereParts);

  const orderBy = buildOrderByWithMap(sortKey, sortDir, {
    created_at: { field: 'created_at', secondary: [{ id: 'desc' }] },
    id: { field: 'id' },
    follower_id: { field: 'follower_id', secondary: [{ id: 'desc' }] },
    followable_id: { field: 'followable_id', secondary: [{ id: 'desc' }] },
    followable_type: { field: 'followable_type', secondary: [{ followable_id: 'desc' }, { id: 'desc' }] },
  }, [{ created_at: 'desc' }, { id: 'desc' }]);


  const [total, rows] = await Promise.all([
    prisma.follows.count({ where }),
    prisma.follows.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        follower_type: true,
        follower_id: true,
        followable_type: true,
        followable_id: true,
        created_at: true,
      },
    }),
  ]);

  type FollowSelectResult = {
    id: bigint;
    follower_type: string;
    follower_id: bigint;
    followable_type: string;
    followable_id: bigint;
    created_at: Date | null;
  };

  const followerUserIds: bigint[] = [];
  const followablePetIds: bigint[] = [];
  const followableUserIds: bigint[] = [];

  for (const r of rows) {
    if (r.follower_type === POLYMORPHIC_MODEL_NAMES.USER) followerUserIds.push(r.follower_id);

    const k = followableKind(r.followable_type);
    if (k === 'pet') followablePetIds.push(r.followable_id);
    else if (k === 'user') followableUserIds.push(r.followable_id);
  }


  const [followerUsers, followablePets, followableUsers] = await Promise.all([
    followerUserIds.length
      ? prisma.users.findMany({
          where: { id: { in: followerUserIds } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
    followablePetIds.length
      ? prisma.pets.findMany({
          where: { id: { in: followablePetIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    followableUserIds.length
      ? prisma.users.findMany({
          where: { id: { in: followableUserIds } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
  ]);

  const followerUserById = new Map(followerUsers.map((u) => [u.id.toString(), u]));
  const petById = new Map(followablePets.map((p) => [p.id.toString(), p]));
  const userById = new Map(followableUsers.map((u) => [u.id.toString(), u]));

  const mapped: CmsFollowRow[] = (rows as FollowSelectResult[]).map((r) => {
    const followerIdStr = bigIntToString(r.follower_id);
    const followableIdStr = bigIntToString(r.followable_id);

    let followerLabel = `${r.follower_type} #${followerIdStr}`;
    if (r.follower_type === POLYMORPHIC_MODEL_NAMES.USER) {
      const u = followerUserById.get(followerIdStr);
      followerLabel = u?.name?.trim() || u?.email?.trim() || `Uživatel #${followerIdStr}`;
    }

    let followableLabel = `${r.followable_type} #${followableIdStr}`;
    const k = followableKind(r.followable_type);
    if (k === 'pet') {
      const p = petById.get(followableIdStr);
      followableLabel = p?.name?.trim() || `Mazlíček #${followableIdStr}`;
    } else if (k === 'user') {
      const u = userById.get(followableIdStr);
      followableLabel = u?.name?.trim() || u?.email?.trim() || `Uživatel #${followableIdStr}`;
    }

    return {
      id: bigIntToString(r.id),
      follower_type: r.follower_type,
      follower_id: followerIdStr,
      follower_label: followerLabel,
      followable_type: r.followable_type,
      followable_id: followableIdStr,
      followable_label: followableLabel,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
    };
  });


  const lastPage = calculateLastPage(total, safePerPage);

  return { total, page: safePage, perPage: safePerPage, lastPage, rows: mapped };
}

