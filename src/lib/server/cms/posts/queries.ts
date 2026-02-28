import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { publicUrl } from '@/utils/mediaUrl';
import { bigIntToString } from '@/lib/server/ids';
import { clip, parseDateRangeFilter } from '@/lib/server/cms/shared/dates';
import { formatPaginationParams, calculateLastPage } from '@/lib/server/cms/shared/pagination';
import { buildWhereClause } from '@/lib/server/cms/shared/whereBuilder';
import { buildOrderByWithMap } from '@/lib/server/cms/shared/orderBy';

export type CmsPostRow = {
  id: string;
  pet_id: string;
  pet_name: string | null;

  owner_user_id: string;
  owner_user_label: string | null;

  caption: string | null;
  is_premium: boolean;
  media_type: string;
  media_url: string;

  likes_count: number;
  comments_count: number;

  created_at: string | null;
};

export type CmsPostsSortKey =
  | 'created_at'
  | 'id'
  | 'pet_id'
  | 'likes_count'
  | 'comments_count'
  | 'is_premium'
  | 'media_type';

export type CmsPostsSortDir = 'asc' | 'desc';

export async function loadPostsPage(opts: {
  scope: 'mine' | 'all';
  viewerUserId: bigint;
  page: number;
  perPage: number;

  sortKey?: CmsPostsSortKey;
  sortDir?: CmsPostsSortDir;

  fromDate?: string | null; // YYYY-MM-DD
  untilDate?: string | null; // YYYY-MM-DD

  q?: string | null; // caption / pet name
  userSearch?: string | null; // owner user name/email (staff only)
  premium?: 'all' | 'free' | 'premium';
  mediaType?: 'all' | 'image' | 'video';
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
    premium = 'all',
    mediaType = 'all',
  } = opts;

  const whereParts: Prisma.postsWhereInput[] = [];

  if (scope === 'mine') {
    // Post belongs to user through pet.user_id
    whereParts.push({ pet: { user_id: viewerUserId } });
  }

  const dateFilter = parseDateRangeFilter(fromDate, untilDate);
  if (Object.keys(dateFilter).length > 0) {
    whereParts.push({ created_at: dateFilter as Prisma.DateTimeFilter });
  }

  const qTrim = String(q ?? '').trim();
  if (qTrim) {
    whereParts.push({
      OR: [
        { caption: { contains: qTrim, mode: 'insensitive' } },
        { pet: { is: { name: { contains: qTrim, mode: 'insensitive' } } } },
      ],
    });
  }

  const u = String(userSearch ?? '').trim();
  if (u) {
    whereParts.push({
      OR: [
        { pet: { is: { user: { is: { name: { contains: u, mode: 'insensitive' } } } } } },
        { pet: { is: { user: { is: { email: { contains: u, mode: 'insensitive' } } } } } },
      ],
    });
  }

  if (premium === 'premium') whereParts.push({ is_premium: true });
  if (premium === 'free') whereParts.push({ is_premium: false });

  if (mediaType !== 'all') whereParts.push({ media_type: mediaType });

  const where = buildWhereClause(whereParts);

  const orderBy = buildOrderByWithMap(sortKey, sortDir, {
    created_at: { field: 'created_at', secondary: [{ id: 'desc' }] },
    id: { field: 'id' },
    pet_id: { field: 'pet_id', secondary: [{ id: 'desc' }] },
    likes_count: { field: 'likes_count', secondary: [{ id: 'desc' }] },
    comments_count: { field: 'comments_count', secondary: [{ id: 'desc' }] },
    is_premium: { field: 'is_premium', secondary: [{ id: 'desc' }] },
    media_type: { field: 'media_type', secondary: [{ id: 'desc' }] },
  }, [{ created_at: 'desc' }, { id: 'desc' }]);

  const { safePage, safePerPage, skip, take } = formatPaginationParams(page, perPage);

  const [total, rows] = await Promise.all([
    prisma.posts.count({ where }),
    prisma.posts.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        id: true,
        pet_id: true,
        caption: true,
        is_premium: true,
        media_url: true,
        media_type: true,
        likes_count: true,
        comments_count: true,
        created_at: true,
        pet: { select: { name: true, user_id: true, user: { select: { name: true, email: true } } } },
      },
    }),
  ]);

  type PostSelectResult = {
    id: bigint;
    pet_id: bigint;
    caption: string | null;
    is_premium: boolean;
    media_url: string;
    media_type: string;
    likes_count: number | null;
    comments_count: number | null;
    created_at: Date | null;
    pet: {
      name: string;
      user_id: bigint;
      user: { name: string; email: string } | null;
    };
  };

  const mapped: CmsPostRow[] = (rows as PostSelectResult[]).map((r) => {
    const ownerLabel = r.pet?.user?.name?.trim() || r.pet?.user?.email?.trim() || null;

    return {
      id: bigIntToString(r.id),
      pet_id: bigIntToString(r.pet_id),
      pet_name: r.pet?.name ?? null,

      owner_user_id: r.pet?.user_id ? bigIntToString(r.pet.user_id) : '0',
      owner_user_label: ownerLabel,

      caption: r.caption ? clip(r.caption, 120) : null,
      is_premium: Boolean(r.is_premium),
      media_type: r.media_type ?? 'image',
      media_url: publicUrl('posts', r.media_url) ?? '',

      likes_count: r.likes_count ?? 0,
      comments_count: r.comments_count ?? 0,

      created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
    };
  });

  const lastPage = calculateLastPage(total, safePerPage);

  return { total, page: safePage, perPage: safePerPage, lastPage, rows: mapped };
}

