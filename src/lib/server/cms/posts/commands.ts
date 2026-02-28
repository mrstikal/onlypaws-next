import type { AuthUser } from '@/lib/authTypes';
import { ApiError } from '@/lib/api/errors';
import { parseBigIntParam } from '@/lib/server/ids';
import { now, stampCreate, stampUpdate } from '@/lib/server/timestamps';
import { prisma } from '@/lib/prisma';
import { normalizeCmsMediaFileName } from '@/lib/server/cms/shared/media';
import { assertCmsNotStaff, assertCmsOwnerOrStaff } from '@/lib/server/cms/authz';

export async function createCmsPost(actor: AuthUser, rawBody: unknown) {
  assertCmsNotStaff(actor);

  const body = (rawBody ?? {}) as Record<string, unknown>;
  const petId = parseBigIntParam(body.pet_id);
  if (!petId) throw new ApiError('Neplatný mazlíček', 400);

  const caption = body.caption == null ? null : String(body.caption).trim();
  if (caption != null && caption.length > 2000) {
    throw new ApiError('Caption je příliš dlouhý', 400);
  }

  const mediaFileName = normalizeCmsMediaFileName('posts', body.media_url);
  if (!mediaFileName) throw new ApiError('Neplatný soubor', 400);

  const isPremium = Boolean(body.is_premium);
  const subscriptionTierIdRaw = body.subscription_tier_id ?? null;

  let tierId: bigint | null = null;
  if (isPremium) {
    if (!subscriptionTierIdRaw) {
      throw new ApiError('subscription_tier_id je povinný pro premium post', 400);
    }

    tierId = parseBigIntParam(subscriptionTierIdRaw);
    if (!tierId) throw new ApiError('Neplatný subscription_tier_id', 400);

    const tier = await prisma.subscription_tiers.findUnique({
      where: { id: tierId },
      select: { id: true },
    });
    if (!tier) throw new ApiError('Nenalezeno', 404);
  }

  const pet = await prisma.pets.findFirst({
    where: { id: petId, user_id: BigInt(actor.id) },
    select: { id: true },
  });
  if (!pet) throw new ApiError('Mazlíček nenalezen nebo nepatří vám', 404);

  const current = now();

  const created = await prisma.$transaction(async (tx) => {
    const post = await tx.posts.create({
      data: {
        pet_id: petId,
        caption,
        media_url: mediaFileName,
        media_type: 'image',
        is_premium: isPremium,
        subscription_tier_id: isPremium ? tierId : null,
        likes_count: 0,
        comments_count: 0,
        ...stampCreate(current),
      },
      select: { id: true },
    });

    await tx.pets.update({
      where: { id: petId },
      data: { posts_count: { increment: 1 } },
      select: { id: true },
    });

    return post;
  });

  return { id: created.id.toString() };
}

export async function updateCmsPost(actor: AuthUser, rawPostId: unknown, rawBody: unknown) {
  const postId = parseBigIntParam(rawPostId);
  if (!postId) throw new ApiError('Neplatné ID', 400);

  const post = await prisma.posts.findUnique({
    where: { id: postId },
    select: { id: true, pet_id: true, pet: { select: { user_id: true } } },
  });
  if (!post) throw new ApiError('Nenalezeno', 404);
  if (!post.pet) throw new ApiError('Pet nenalezen', 404);

  assertCmsOwnerOrStaff(actor, post.pet.user_id);

  const body = (rawBody ?? {}) as Record<string, unknown>;
  const caption = body.caption == null ? null : String(body.caption).trim();
  if (caption != null && caption.length > 2000) {
    throw new ApiError('Caption je příliš dlouhý', 400);
  }

  const isPremium = Boolean(body.is_premium);
  const subscriptionTierIdRaw = body.subscription_tier_id ?? null;

  let subscriptionTierId: bigint | null = null;
  if (isPremium) {
    if (!subscriptionTierIdRaw) {
      throw new ApiError('subscription_tier_id je povinný pro premium post', 400);
    }

    subscriptionTierId = parseBigIntParam(subscriptionTierIdRaw);
    if (!subscriptionTierId) throw new ApiError('Neplatný subscription_tier_id', 400);

    const tier = await prisma.subscription_tiers.findUnique({
      where: { id: subscriptionTierId },
      select: { id: true },
    });
    if (!tier) throw new ApiError('Nenalezeno', 404);
  }

  const mediaFileName = normalizeCmsMediaFileName('posts', body.media_url);
  if (!mediaFileName) throw new ApiError('Neplatný soubor', 400);

  const current = now();

  await prisma.posts.update({
    where: { id: postId },
    data: {
      caption,
      is_premium: isPremium,
      subscription_tier_id: isPremium ? subscriptionTierId : null,
      media_url: mediaFileName,
      media_type: 'image',
      ...stampUpdate(current),
    },
    select: { id: true },
  });
}

export async function deleteCmsPost(actor: AuthUser, rawPostId: unknown) {
  const postId = parseBigIntParam(rawPostId);
  if (!postId) throw new ApiError('Neplatné ID', 400);

  const post = await prisma.posts.findUnique({
    where: { id: postId },
    select: { id: true, pet_id: true, pet: { select: { user_id: true } } },
  });
  if (!post) throw new ApiError('Nenalezeno', 404);
  if (!post.pet) throw new ApiError('Pet nenalezen', 404);

  assertCmsOwnerOrStaff(actor, post.pet.user_id);

  await prisma.$transaction(async (tx) => {
    await tx.posts.delete({ where: { id: postId } });
    await tx.pets.update({
      where: { id: post.pet_id },
      data: { posts_count: { decrement: 1 } },
      select: { id: true },
    });
  });
}
