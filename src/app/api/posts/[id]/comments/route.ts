import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { bigIntToString, parseBigIntParam } from '@/lib/server/ids';
import { hasLength, trimToString } from '@/lib/server/validation';
import { now, stampCreate } from '@/lib/server/timestamps';
import { POLYMORPHIC_MODEL_NAMES } from '@/lib/server/cms/polymorphic';

function clampInt(value: string | null, def: number, min: number, max: number) {
  const n = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

type UiComment = {
  id: string;
  body: string;
  likes_count: number;
  liked_by_me: boolean;
  created_at: string | null;
  user: { id: string; name: string } | null;
  children: UiComment[];
};

type CommentRow = {
  id: bigint;
  body: string;
  likes_count: number;
  created_at: Date | null;
  parent_id: bigint | null;
  user: { id: bigint; name: string } | null;
};

function buildTreeForPost(rows: CommentRow[], likedByMeIds: Set<string>) {
  const byId = new Map<string, UiComment>();
  const roots: UiComment[] = [];

  for (const r of rows) {
    const idStr = bigIntToString(r.id);
    byId.set(idStr, {
      id: idStr,
      body: r.body,
      likes_count: r.likes_count ?? 0,
      liked_by_me: likedByMeIds.has(idStr),
      created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
      user: r.user ? { id: bigIntToString(r.user.id), name: r.user.name } : null,
      children: [],
    });
  }

  for (const r of rows) {
    const idStr = bigIntToString(r.id);
    const node = byId.get(idStr);
    if (!node) continue;

    const parentIdStr = r.parent_id ? bigIntToString(r.parent_id) : null;
    if (parentIdStr && byId.has(parentIdStr)) {
      byId.get(parentIdStr)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * GET: root comments pagination for a post
 * returns { comments: rootCommentsWithChildren[], commentsPagination }
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();

  const { id } = await ctx.params;
  const postId = parseBigIntParam(id);
  if (!postId) return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const cpage = clampInt(searchParams.get('cpage'), 1, 1, 10_000);
  const perPage = clampInt(searchParams.get('per_page'), 10, 5, 50);

  const commentableTypePost = 'App\\Models\\Post';

  // 1) count roots
  const totalRoots = await prisma.comments.count({
    where: {
      commentable_type: commentableTypePost,
      commentable_id: postId,
      parent_id: null,
    },
  });

  const lastPage = Math.max(1, Math.ceil(totalRoots / perPage));

  // 2) load roots page
  const roots = await prisma.comments.findMany({
    where: {
      commentable_type: commentableTypePost,
      commentable_id: postId,
      parent_id: null,
    },
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    skip: (cpage - 1) * perPage,
    take: perPage,
    select: { id: true },
  });

  const rootIds = roots.map((r) => r.id);
  if (rootIds.length === 0) {
    return NextResponse.json({
      comments: [],
      commentsPagination: { current_page: cpage, last_page: lastPage, per_page: perPage, total: totalRoots },
    });
  }

  // 3) load root rows WITH data + children (1-level only) for these specific roots
  const rootRows = await prisma.comments.findMany({
    where: {
      id: { in: rootIds },
    },
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    include: { user: { select: { id: true, name: true } } },
  });

  const childRows = await prisma.comments.findMany({
    where: {
      parent_id: { in: rootIds },
    },
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    include: { user: { select: { id: true, name: true } } },
  });

  // combine root + children for tree building
  const allRows = [...rootRows, ...childRows];

  // collect all comment IDs for liked_by_me lookup
  const allCommentIds = allRows.map((r) => r.id);

  // liked_by_me for comments (only for the specific comments we loaded)
  const likedByMeIds = new Set<string>();
  if (auth.isAuthed && allCommentIds.length > 0) {
    const likeableTypeComment = 'App\\Models\\Comment';
    const likes = await prisma.likes.findMany({
      where: {
        user_id: BigInt(auth.user.id),
        likeable_type: likeableTypeComment,
        likeable_id: { in: allCommentIds },
      },
      select: { likeable_id: true },
    });

    for (const l of likes) likedByMeIds.add(bigIntToString(l.likeable_id));
  }

  return NextResponse.json({
    comments: buildTreeForPost(allRows, likedByMeIds),
    commentsPagination: {
      current_page: cpage,
      last_page: lastPage,
      per_page: perPage,
      total: totalRoots,
    },
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  const postId = parseBigIntParam(id);
  if (!postId) return NextResponse.json({ error: 'Invalid post id' }, { status: 400 });

  const bodyJson = await req.json().catch(() => null);
  const body = trimToString(bodyJson?.body);
  const parentIdRaw = bodyJson?.parent_id ?? null;

  if (!hasLength(body, 1, 1000)) {
    return NextResponse.json({ error: body.length === 0 ? 'Body is required' : 'Body too long' }, { status: 400 });
  }

  const parentId = parentIdRaw ? parseBigIntParam(parentIdRaw) : null;

  const commentableTypePost = POLYMORPHIC_MODEL_NAMES.POST;

  // basic safety: parent must belong to same post (if provided)
  if (parentId) {
    const parent = await prisma.comments.findFirst({
      where: {
        id: parentId,
        commentable_type: commentableTypePost,
        commentable_id: postId,
      },
      select: { id: true },
    });
    if (!parent) return NextResponse.json({ error: 'Invalid parent_id' }, { status: 400 });
  }

  const createdAt = now();

  const created = await prisma.comments.create({
    data: {
      body,
      user_id: BigInt(auth.user.id),
      commentable_type: commentableTypePost,
      commentable_id: postId,
      parent_id: parentId,
      likes_count: 0,
      ...stampCreate(createdAt),
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  const updatedPost = await prisma.posts.update({
    where: { id: postId },
    data: { comments_count: { increment: 1 } },
    select: { comments_count: true },
  });

  return NextResponse.json({
    comment: {
      id: bigIntToString(created.id),
      body: created.body,
      likes_count: created.likes_count ?? 0,
      liked_by_me: false,
      created_at: created.created_at ? new Date(created.created_at).toISOString() : null,
      user: created.user ? { id: bigIntToString(created.user.id), name: created.user.name } : null,
      children: [],
    },
    comments_count: updatedPost.comments_count ?? 0,
  });
}