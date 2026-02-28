// src/app/cms/posts/[id]/edit/page.tsx
import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { isStaff } from '@/lib/cmsAuthz';
import CmsPostForm from '@/components/cms/CmsPostForm';
import { parseBigIntParam } from '@/lib/cms/params';

export default async function CmsPostEditPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');

  const { id } = await params;
  const postId = parseBigIntParam(id);
  if (!postId) notFound();

  const post = await prisma.posts.findUnique({
    where: { id: postId },
    select: {
      id: true,
      pet_id: true,
      caption: true,
      is_premium: true,
      subscription_tier_id: true,
      media_type: true,
      media_url: true,
      pet: { select: { user_id: true } },
    },
  });
  if (!post) notFound();

  const staff = isStaff(auth.user);
  const isOwner = post.pet?.user_id === BigInt(auth.user.id);
  if (!staff && !isOwner) notFound();

  const petsRaw = staff
    ? await prisma.pets.findMany({
      where: { id: post.pet_id },
      select: { id: true, name: true },
    })
    : await prisma.pets.findMany({
      where: { user_id: BigInt(auth.user.id) },
      orderBy: [{ id: 'desc' }],
      select: { id: true, name: true },
    });

  const tiersRaw = await prisma.subscription_tiers.findMany({
    orderBy: [{ price_monthly: 'asc' }, { id: 'asc' }],
    select: { id: true, name: true, slug: true },
  });

  const pets = petsRaw.map((p) => ({ id: p.id.toString(), name: p.name }));
  const tiers = tiersRaw.map((t) => ({ id: t.id.toString(), name: t.name, slug: t.slug }));

  return (
    <CmsPostForm
      mode="edit"
      postId={post.id.toString()}
      pets={pets}
      tiers={tiers}
      initial={{
        pet_id: post.pet_id.toString(),
        caption: post.caption ?? '',
        is_premium: Boolean(post.is_premium),
        subscription_tier_id: post.subscription_tier_id ? post.subscription_tier_id.toString() : null,
        media_type: post.media_type ?? 'image',
        media_url: post.media_url ?? '',
      }}
    />
  );
}