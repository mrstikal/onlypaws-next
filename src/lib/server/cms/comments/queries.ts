import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { bigIntToString } from '@/lib/server/ids';
import { clip, parseDateRangeFilter } from '@/lib/server/cms/shared/dates';
import { formatPaginationParams, calculateLastPage } from '@/lib/server/cms/shared/pagination';
import { buildWhereClause } from '@/lib/server/cms/shared/whereBuilder';
import { buildOrderByWithMap } from '@/lib/server/cms/shared/orderBy';
import { kindToModelType } from '@/lib/server/cms/polymorphic';

export type CmsCommentRow = {
  id: string;
  user_id: string;
  user_label: string | null;

  commentable_type: string;
  commentable_id: string;
  parent_id: string | null;

  body: string;
  likes_count: number;

  created_at: string | null;
};

export type CmsCommentsSortKey = 'created_at' | 'id' | 'user_id' | 'likes_count' | 'commentable_type' | 'commentable_id';
export type CmsCommentsSortDir = 'asc' | 'desc';
export type CmsCommentsTypeFilter = 'post' | 'pet';

export async function loadCommentsPage(opts: {
  scope: 'mine' | 'all';
  viewerUserId: bigint;
  page: number;
  perPage: number;

  sortKey?: CmsCommentsSortKey;
  sortDir?: CmsCommentsSortDir;

  fromDate?: string | null; // YYYY-MM-DD
  untilDate?: string | null; // YYYY-MM-DD

  q?: string | null; // search in body
  userSearch?: string | null; // author name/email (staff only)
  type?: CmsCommentsTypeFilter | null; // post/pet
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
    type,
  } = opts;

  const whereParts: Prisma.commentsWhereInput[] = [];

  if (scope === 'mine') {
    whereParts.push({ user_id: viewerUserId });
  }

  const dateFilter = parseDateRangeFilter(fromDate, untilDate);
  if (Object.keys(dateFilter).length > 0) {
    whereParts.push({ created_at: dateFilter as Prisma.DateTimeFilter });
  }

  const qTrim = String(q ?? '').trim();
  if (qTrim) {
    whereParts.push({ body: { contains: qTrim, mode: 'insensitive' } });
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

  if (type) {
    const modelType = kindToModelType(type);
    if (modelType) {
      whereParts.push({ commentable_type: modelType });
    }
  }

  const where = buildWhereClause(whereParts);

  const orderBy = buildOrderByWithMap(sortKey, sortDir, {
    created_at: { field: 'created_at', secondary: [{ id: 'desc' }] },
    id: { field: 'id' },
    user_id: { field: 'user_id', secondary: [{ id: 'desc' }] },
    likes_count: { field: 'likes_count', secondary: [{ id: 'desc' }] },
    commentable_type: { field: 'commentable_type', secondary: [{ commentable_id: 'desc' }, { id: 'desc' }] },
    commentable_id: { field: 'commentable_id', secondary: [{ id: 'desc' }] },
  }, [{ created_at: 'desc' }, { id: 'desc' }]);

  const { safePage, safePerPage, skip, take } = formatPaginationParams(page, perPage);

  const [total, rows] = await Promise.all([
    prisma.comments.count({ where }),
    prisma.comments.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        body: true,
        likes_count: true,
        user_id: true,
        commentable_type: true,
        commentable_id: true,
        parent_id: true,
        created_at: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  type CommentSelectResult = {
    id: bigint;
    body: string | null;
    likes_count: number | null;
    user_id: bigint;
    commentable_type: string;
    commentable_id: bigint;
    parent_id: bigint | null;
    created_at: Date | null;
    user: { name: string; email: string } | null;
  };

  const mapped: CmsCommentRow[] = (rows as CommentSelectResult[]).map((r) => {
    const userLabel = r.user?.name?.trim() || r.user?.email?.trim() || null;

    return {
      id: bigIntToString(r.id),
      user_id: bigIntToString(r.user_id),
      user_label: userLabel,
      commentable_type: r.commentable_type,
      commentable_id: bigIntToString(r.commentable_id),
      parent_id: r.parent_id ? bigIntToString(r.parent_id) : null,
      body: clip(r.body ?? '', 160),
      likes_count: r.likes_count ?? 0,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
    };
  });

  const lastPage = calculateLastPage(total, safePerPage);
  return { total, page: safePage, perPage: safePerPage, lastPage, rows: mapped };
}

