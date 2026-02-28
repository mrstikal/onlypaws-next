import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { bigIntToString } from '@/lib/server/ids';
import { clip, parseDateRangeFilter } from '@/lib/server/cms/shared/dates';
import { formatPaginationParams, calculateLastPage } from '@/lib/server/cms/shared/pagination';
import { buildWhereClause } from '@/lib/server/cms/shared/whereBuilder';
import { buildOrderByWithMap } from '@/lib/server/cms/shared/orderBy';
import { likeableKind, kindToModelType } from '@/lib/server/cms/polymorphic';

export type CmsLikeRow = {
  id: string;
  user_id: string;
  user_label: string | null;
  likeable_type: string;
  likeable_id: string;
  likeable_label: string;
  created_at: string | null;
};

export type CmsLikesTypeFilter = 'post' | 'pet' | 'comment';

export type CmsLikesSortKey = 'created_at' | 'id' | 'user_id' | 'likeable_type' | 'likeable_id';
export type CmsLikesSortDir = 'asc' | 'desc';

export async function loadLikesPage(opts: {
  scope: 'mine' | 'all';
  viewerUserId: bigint;
  page: number;
  perPage: number;

  sortKey?: CmsLikesSortKey;
  sortDir?: CmsLikesSortDir;

  fromDate?: string | null; // YYYY-MM-DD
  untilDate?: string | null; // YYYY-MM-DD
  userSearch?: string | null; // search user name/email
  likeableType?: string | null;
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
    likeableType,
  } = opts;

  const whereParts: Prisma.likesWhereInput[] = [];

  if (scope === 'mine') {
    whereParts.push({ user_id: viewerUserId });
  }

  const dateFilter = parseDateRangeFilter(fromDate, untilDate);
  if (Object.keys(dateFilter).length > 0) {
    whereParts.push({ created_at: dateFilter as Prisma.DateTimeFilter });
  }

  const s = String(userSearch ?? '').trim();
  if (s) {
    whereParts.push({
      OR: [
        { user: { name: { contains: s, mode: 'insensitive' } } },
        { user: { email: { contains: s, mode: 'insensitive' } } },
      ],
    });
  }

  if (likeableType) {
    const modelType = kindToModelType(likeableType);
    if (modelType) {
      whereParts.push({ likeable_type: modelType });
    }
  }

  const where = buildWhereClause(whereParts);

  const orderBy = buildOrderByWithMap(sortKey, sortDir, {
    created_at: { field: 'created_at', secondary: [{ id: 'desc' }] },
    id: { field: 'id' },
    user_id: { field: 'user_id', secondary: [{ id: 'desc' }] },
    likeable_type: { field: 'likeable_type', secondary: [{ likeable_id: 'desc' }, { id: 'desc' }] },
    likeable_id: { field: 'likeable_id', secondary: [{ id: 'desc' }] },
  }, [{ created_at: 'desc' }, { id: 'desc' }]);

  const { safePage, safePerPage, skip, take } = formatPaginationParams(page, perPage);

  const [total, rows] = await Promise.all([
    prisma.likes.count({ where }),
    prisma.likes.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        user_id: true,
        likeable_type: true,
        likeable_id: true,
        created_at: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  type LikeSelectResult = {
    id: bigint;
    user_id: bigint;
    likeable_type: string;
    likeable_id: bigint;
    created_at: Date | null;
    user: { name: string; email: string } | null;
  };

  const postIds: bigint[] = [];
  const petIds: bigint[] = [];
  const commentIds: bigint[] = [];

  for (const r of rows) {
    const kind = likeableKind(r.likeable_type);
    if (kind === 'post') postIds.push(r.likeable_id);
    else if (kind === 'pet') petIds.push(r.likeable_id);
    else if (kind === 'comment') commentIds.push(r.likeable_id);
  }

  const [posts, pets, comments] = await Promise.all([
    postIds.length
      ? prisma.posts.findMany({
          where: { id: { in: postIds } },
          select: { id: true, caption: true, pet: { select: { name: true } } },
        })
      : Promise.resolve([]),
    petIds.length
      ? prisma.pets.findMany({
          where: { id: { in: petIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    commentIds.length
      ? prisma.comments.findMany({
          where: { id: { in: commentIds } },
          select: { id: true, body: true },
        })
      : Promise.resolve([]),
  ]);

  const postById = new Map(posts.map((p) => [p.id.toString(), p]));
  const petById = new Map(pets.map((p) => [p.id.toString(), p]));
  const commentById = new Map(comments.map((c) => [c.id.toString(), c]));

  const mapped: CmsLikeRow[] = (rows as LikeSelectResult[]).map((r) => {
    const userLabel = r.user?.name?.trim() || r.user?.email?.trim() || null;

    const kind = likeableKind(r.likeable_type);
    const likeableIdStr = bigIntToString(r.likeable_id);

    let likeableLabel = `${r.likeable_type} #${likeableIdStr}`;
    if (kind === 'pet') {
      const pet = petById.get(likeableIdStr);
      if (pet) likeableLabel = pet.name || `Pet #${likeableIdStr}`;
    } else if (kind === 'post') {
      const post = postById.get(likeableIdStr);
      if (post) {
        const base = post.caption ? clip(post.caption, 80) : `Post #${likeableIdStr}`;
        likeableLabel = post.pet?.name ? `${post.pet.name}: ${base}` : base;
      }
    } else if (kind === 'comment') {
      const c = commentById.get(likeableIdStr);
      if (c) likeableLabel = c.body ? clip(c.body, 80) : `Comment #${likeableIdStr}`;
    }

    return {
      id: bigIntToString(r.id),
      user_id: bigIntToString(r.user_id),
      user_label: userLabel,
      likeable_type: r.likeable_type,
      likeable_id: likeableIdStr,
      likeable_label: likeableLabel,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
    };
  });

  const lastPage = calculateLastPage(total, safePerPage);

  return {
    total,
    page: safePage,
    perPage: safePerPage,
    lastPage,
    rows: mapped,
  };
}

