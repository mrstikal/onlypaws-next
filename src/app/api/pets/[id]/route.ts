import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publicUrl } from '@/utils/mediaUrl';
import { getAuth } from '@/lib/auth';
import { bigIntToString, parseBigIntParam } from '@/lib/server/ids';
import { isStaffRole } from '@/lib/server/roles';
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

function buildTree(rows: CommentRow[]): UiComment[] {
  const byId = new Map<string, UiComment>();
  const roots: UiComment[] = [];

  for (const r of rows) {
    const idStr = bigIntToString(r.id);
    byId.set(idStr, {
      id: idStr,
      body: r.body,
      likes_count: r.likes_count ?? 0,
      liked_by_me: false,
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

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  const { searchParams } = new URL(req.url);
  const cpage = clampInt(searchParams.get('cpage'), 1, 1, 10_000);
  const perPage = 10;

  const { id } = await ctx.params;
  const petId = parseBigIntParam(id);

  if (!petId) {
    return NextResponse.json({ error: 'Invalid pet id' }, { status: 400 });
  }

  const pet = await prisma.pets.findUnique({
    where: { id: petId },
    include: {
      breeds: { select: { name: true, species: true } },
    },
  });

  if (!pet) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const viewerId = auth.isAuthed ? BigInt(auth.user.id) : null;
  const viewerIsStaff = auth.isAuthed ? isStaffRole(auth.user.role) : false;
  const viewerIsOwner = viewerId ? pet.user_id === viewerId : false;

  const canFollow = Boolean(auth.isAuthed && !viewerIsStaff && !viewerIsOwner);
  const canLikePet = Boolean(auth.isAuthed && !viewerIsStaff && !viewerIsOwner);
  const canLikeComments = Boolean(auth.isAuthed && !viewerIsStaff);
  const canLikePosts = Boolean(auth.isAuthed && !viewerIsStaff && !viewerIsOwner);

  const followerType = POLYMORPHIC_MODEL_NAMES.USER;
  const followableType = POLYMORPHIC_MODEL_NAMES.PET;
  const likeableTypePet = POLYMORPHIC_MODEL_NAMES.PET;
  const likeableTypePost = POLYMORPHIC_MODEL_NAMES.POST;
  const likeableTypeComment = POLYMORPHIC_MODEL_NAMES.COMMENT;
  const commentableTypePet = POLYMORPHIC_MODEL_NAMES.PET;

  const [followRow, likeRow, posts, totalRoots, rootsPage] = await Promise.all([
    viewerId
      ? prisma.follows.findFirst({
        where: {
          follower_type: followerType,
          follower_id: viewerId,
          followable_type: followableType,
          followable_id: petId,
        },
        select: { id: true },
      })
      : Promise.resolve(null),

    viewerId
      ? prisma.likes.findFirst({
        where: {
          user_id: viewerId,
          likeable_type: likeableTypePet,
          likeable_id: petId,
        },
        select: { id: true },
      })
      : Promise.resolve(null),

    prisma.posts.findMany({
      where: { pet_id: petId },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: 24,
      include: {
        pet: { select: { name: true } },
        subscription_tiers: { select: { name: true, slug: true } },
      },
    }),

    prisma.comments.count({
      where: { commentable_type: commentableTypePet, commentable_id: petId, parent_id: null },
    }),

    // Load only root comments for the current page (IDs only)
    prisma.comments.findMany({
      where: { commentable_type: commentableTypePet, commentable_id: petId, parent_id: null },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      skip: (cpage - 1) * perPage,
      take: perPage,
      select: { id: true },
    }),
  ]);

  const rootIds = rootsPage.map((r) => r.id);

  // Load full data for roots + their immediate children (1-level)
  const [rootRows, childRows] = rootIds.length > 0
    ? await Promise.all([
        prisma.comments.findMany({
          where: { id: { in: rootIds } },
          orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
          include: { user: { select: { id: true, name: true } } },
        }),
        prisma.comments.findMany({
          where: { parent_id: { in: rootIds } },
          orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
          include: { user: { select: { id: true, name: true } } },
        }),
      ])
    : [[], []];

  const allComments = [...rootRows, ...childRows];

  const postIds = posts.map((p) => p.id as bigint);
  const likedPostIds =
    viewerId && postIds.length
      ? new Set(
        (
          await prisma.likes.findMany({
            where: {
              user_id: viewerId,
              likeable_type: likeableTypePost,
              likeable_id: { in: postIds },
            },
            select: { likeable_id: true },
          })
        ).map((r) => r.likeable_id.toString()),
      )
      : new Set<string>();

  // Collect comment IDs only from the loaded comments (roots + children)
  const commentIds = allComments.map((c) => c.id as bigint);
  const likedCommentIds =
    viewerId && commentIds.length
      ? new Set(
        (
          await prisma.likes.findMany({
            where: {
              user_id: viewerId,
              likeable_type: likeableTypeComment,
              likeable_id: { in: commentIds },
            },
            select: { likeable_id: true },
          })
        ).map((r) => r.likeable_id.toString()),
      )
      : new Set<string>();

  const rootsTree = buildTree(allComments);

  const markLiked = (nodes: UiComment[]) => {
    for (const n of nodes) {
      n.liked_by_me = likedCommentIds.has(n.id);
      if (n.children.length) markLiked(n.children);
    }
  };
  markLiked(rootsTree);

  const commentsLastPage = Math.max(1, Math.ceil(totalRoots / perPage));

  return NextResponse.json({
    pet: {
      id: bigIntToString(pet.id),
      name: pet.name,
      bio: pet.bio ?? null,
      profile_picture: publicUrl('pets', pet.profile_picture),
      likes_count: pet.likes_count ?? 0,
      comments_count: pet.comments_count ?? 0,
      followers_count: pet.followers_count ?? 0,
      breed: pet.breeds ? { name: pet.breeds.name, species: pet.breeds.species } : null,

      liked_by_me: Boolean(likeRow),
      followed_by_me: Boolean(followRow),
      can_like: canLikePet,
      can_follow: canFollow,
      is_owner: viewerIsOwner,
    },

    posts: posts.map((p) => ({
      id: bigIntToString(p.id),
      caption: p.caption,
      media_url: publicUrl('posts', p.media_url) ?? '',
      media_type: p.media_type,
      likes_count: p.likes_count,
      comments_count: p.comments_count,
      is_premium: p.is_premium,
      locked: false,
      created_at: p.created_at ? new Date(p.created_at).toISOString() : null,
      pet: p.pet ? { name: p.pet.name } : null,
      required_tier: p.subscription_tiers ? { name: p.subscription_tiers.name } : null,
      required_tier_slug: p.subscription_tiers?.slug ?? 'free',

      liked_by_me: likedPostIds.has(p.id.toString()),
      can_like: canLikePosts,
    })),

    comments: rootsTree,
    commentsPagination: {
      current_page: cpage,
      last_page: commentsLastPage,
      per_page: perPage,
      total: totalRoots,
    },

    isAuthed: auth.isAuthed,
    can_comment: auth.isAuthed,
    currentUserId: auth.isAuthed ? auth.user.id : null,
    can_like_comments: canLikeComments,
  });
}