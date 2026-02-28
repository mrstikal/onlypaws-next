import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/utils/slugify';
import OnlyPawsShell from '@/components/onlypaws/OnlyPawsShell';
import PostShowContent from './PostShowContent';
import { publicUrl } from '@/utils/mediaUrl';
import { getAuth } from '@/lib/auth';
import { POLYMORPHIC_MODEL_NAMES } from '@/lib/server/cms/polymorphic';
import { isStaffRole } from '@/lib/server/roles';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = { id: string; slug: string };


export default async function PostShowPage({ params }: { params: Promise<Params> }) {
  const auth = await getAuth();

  const { id, slug } = await params;

  let postId: bigint;
  try {
    postId = BigInt(id);
  } catch {
    notFound();
  }

  let post;
  try {
    post = await prisma.posts.findUnique({
      where: { id: postId },
      select: {
        id: true,
        caption: true,
        media_url: true,
        is_premium: true,
        likes_count: true,
        comments_count: true,
        pet: { select: { id: true, name: true, user_id: true } },
        subscription_tiers: { select: { id: true, name: true, slug: true, price_monthly: true } },
      },
    });
  } catch (error) {
    console.error(`Error fetching post ${id}:`, error);
    notFound();
  }

  if (!post) notFound();

  const base = `${post.pet?.name ?? 'pet'} ${post.caption ?? 'post'} ${post.id.toString()}`;
  const expectedSlug = slugify(base) || `post-${post.id.toString()}`;

  if (slug !== expectedSlug) {
    redirect(`/posts/${post.id.toString()}/${expectedSlug}`);
  }

  const viewerIsStaff = auth.isAuthed ? isStaffRole(auth.user.role) : false;
  const viewerId = auth.isAuthed ? BigInt(auth.user.id) : null;
  const viewerIsOwner = viewerId ? post.pet?.user_id === viewerId : false;

  const canLikePost = Boolean(auth.isAuthed && !viewerIsStaff && !viewerIsOwner);

  const likeableTypePost = POLYMORPHIC_MODEL_NAMES.POST;

  const likedByMe = auth.isAuthed
    ? Boolean(
        await prisma.likes.findFirst({
          where: {
            user_id: BigInt(auth.user.id),
            likeable_type: likeableTypePost,
            likeable_id: postId,
          },
          select: { id: true },
        }),
      )
    : false;

  // --- PREMIUM GATING (správně podle viewer tieru) ---
  const requiredTier = post.subscription_tiers;

  const viewerSubscription = auth.isAuthed
    ? await prisma.subscriptions.findUnique({
        where: { user_id: BigInt(auth.user.id) },
        select: { subscription_tier_id: true },
      })
    : null;

  const viewerTier = viewerSubscription?.subscription_tier_id
    ? await prisma.subscription_tiers.findUnique({
        where: { id: viewerSubscription.subscription_tier_id },
        select: { id: true, slug: true, price_monthly: true },
      })
    : null;

  const viewerTierPrice = viewerTier?.price_monthly ?? null;
  const requiredTierPrice = requiredTier?.price_monthly ?? null;

  const viewerMeetsTier =
    !post.is_premium ||
    !requiredTier ||
    viewerIsStaff ||
    viewerIsOwner ||
    (viewerTierPrice !== null && requiredTierPrice !== null && viewerTierPrice >= requiredTierPrice);

  const locked = Boolean(post.is_premium && requiredTier && !viewerMeetsTier);
  // --- /PREMIUM GATING ---

  const commentableTypePost = POLYMORPHIC_MODEL_NAMES.POST;
  const perPage = 10;
  let totalRoots = 0;
  let roots: Array<{
    id: bigint;
    body: string;
    likes_count: number | null;
    created_at: Date | null;
    user: { id: bigint; name: string } | null;
  }> = [];
  try {
    totalRoots = await prisma.comments.count({
      where: { commentable_type: commentableTypePost, commentable_id: postId, parent_id: null },
    });
    roots = await prisma.comments.findMany({
      where: { commentable_type: commentableTypePost, commentable_id: postId, parent_id: null },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: perPage,
      include: { user: { select: { id: true, name: true } } },
    });
  } catch (error) {
    console.error(`Error fetching comments for post ${id}:`, error);
    totalRoots = 0;
    roots = [];
  }

  const lastPage = Math.max(1, Math.ceil(totalRoots / perPage));

  // @TODO: liked_by_me for comments
  const rootComments = roots.map((c) => ({
    id: Number(c.id.toString()),
    body: c.body,
    likes_count: c.likes_count ?? 0,
    liked_by_me: false,
    created_at: c.created_at ? new Date(c.created_at).toISOString() : '',
    user: c.user ? { id: c.user.id.toString(), name: c.user.name } : { id: '0', name: 'Unknown' },
    children: [],
  }));

  return (
    <OnlyPawsShell active="feed">
      <main className="op-container-narrow py-8">
        <PostShowContent
          id={post.id.toString()}
          slug={expectedSlug}
          post={{
            id: post.id.toString(),
            slug: expectedSlug,
            caption: post.caption ?? undefined,
            media_url: publicUrl('posts', post.media_url) ?? '',
            is_premium: Boolean(post.is_premium),
            locked,
            likes_count: post.likes_count ?? 0,
            liked_by_me: likedByMe,
            can_like: canLikePost,
            comments_count: post.comments_count ?? 0,
            pet: post.pet ? { id: post.pet.id.toString(), name: post.pet.name } : undefined,
            required_tier: requiredTier ? { name: requiredTier.name } : null,
            required_tier_slug: requiredTier?.slug ?? 'free',
            likers: [],
          }}
          comments={rootComments}
          commentsPagination={{ current_page: 1, last_page: lastPage, per_page: perPage, total: totalRoots }}
          isAuthed={auth.isAuthed}
          currentUserId={auth.isAuthed ? auth.user.id : null}
          canLikeComments={Boolean(auth.isAuthed && !viewerIsStaff)} // staff nemá práva, i kdyby byl authed, tak ne!
        />
      </main>
    </OnlyPawsShell>
  );
}