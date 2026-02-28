// src/app/api/posts/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publicUrl } from '@/utils/mediaUrl';
import { bigIntToString, parseBigIntParam } from '@/utils/bigint';
import { notFoundResponse, errorResponse } from '@/lib/apiResponse';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const postId = parseBigIntParam(id);
  if (!postId) return errorResponse('Neplatné ID');

  const post = await prisma.posts.findUnique({
    where: { id: postId },
    select: {
      id: true,
      caption: true,
      media_url: true,
      media_type: true,
      is_premium: true,
      likes_count: true,
      comments_count: true,
      created_at: true,
      pet: { select: { id: true, name: true } },
      subscription_tiers: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!post) return notFoundResponse('Příspěvek nenalezen');

  return NextResponse.json({
    post: {
      id: bigIntToString(post.id),
      caption: post.caption ?? null,
      media_url: publicUrl('posts', post.media_url) ?? '',
      media_type: post.media_type ?? 'image',
      is_premium: Boolean(post.is_premium),
      likes_count: post.likes_count ?? 0,
      comments_count: post.comments_count ?? 0,
      created_at: post.created_at ? new Date(post.created_at).toISOString() : null,
      pet: post.pet ? { id: bigIntToString(post.pet.id), name: post.pet.name } : null,
      required_tier: post.subscription_tiers ? { id: bigIntToString(post.subscription_tiers.id), name: post.subscription_tiers.name, slug: post.subscription_tiers.slug } : null,
    },
  });
}