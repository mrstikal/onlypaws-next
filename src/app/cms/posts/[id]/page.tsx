// src/app/cms/posts/[id]/page.tsx
import React from 'react';
import Image from 'next/image';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { isStaff } from '@/lib/cmsAuthz';
import { formatDateTimeCS } from '@/utils/datetime';
import { publicUrl } from '@/utils/mediaUrl';
import DeletePostInlineButton from '@/components/cms/DeletePostInlineButton';
import Link from 'next/link';
import { ROUTES } from '@/constants/routes';
import { parseBigIntParam, bigIntToString } from '@/lib/cms/params';

export default async function CmsPostViewPage({ params }: { params: Promise<{ id: string }> }) {
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
      media_url: true,
      media_type: true,
      is_premium: true,
      likes_count: true,
      comments_count: true,
      created_at: true,
      pet: {
        select: {
          id: true,
          name: true,
          user_id: true,
          user: { select: { name: true, email: true } },
        },
      },
      subscription_tiers: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!post) notFound();

  const staff = isStaff(auth.user);
  const ownerId = post.pet?.user_id ? bigIntToString(post.pet.user_id) : null;

  if (!staff && ownerId !== auth.user.id) notFound();

  const ownerLabel = post.pet?.user?.name?.trim() || post.pet?.user?.email?.trim() || (ownerId ? `Uživatel #${ownerId}` : '—');

  const mediaUrl = publicUrl('posts', post.media_url) ?? '';

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Post #{bigIntToString(post.id)}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Mazlíček: {post.pet?.name ?? '—'} (#{bigIntToString(post.pet_id)}) · Uživatel: {ownerLabel}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={ROUTES.CMS.postEdit(bigIntToString(post.id))}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            Upravit
          </Link>

          <DeletePostInlineButton
            postId={bigIntToString(post.id)}
            className="px-3 py-1.5 text-sm! font-semibold"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-md border border-gray-200 p-4 md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Média</div>
          <div className="mt-2">
            <div className="overflow-hidden rounded-md border border-gray-200 bg-gray-50">
              {mediaUrl ? <Image src={mediaUrl} alt="" className="max-h-[520px] w-full object-contain" width={520} height={520} /> : null}
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Typ: {post.media_type ?? '—'} · {post.is_premium ? 'Premium' : 'Free'}
            </div>
          </div>
        </div>

        <div className="rounded-md border border-gray-200 p-4 md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Caption</div>
          <div className="mt-1 whitespace-pre-wrap text-sm">{post.caption ?? '—'}</div>
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vytvořeno</div>
          <div className="mt-1 text-sm">{formatDateTimeCS(post.created_at ? new Date(post.created_at) : null)}</div>
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Počty</div>
          <div className="mt-1 text-sm">
            Lajky: {post.likes_count ?? 0} · Komentáře: {post.comments_count ?? 0}
          </div>
        </div>

        <div className="rounded-md border border-gray-200 p-4 md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subscription tier</div>
          <div className="mt-1 text-sm">{post.subscription_tiers?.name ?? '—'}</div>
        </div>
      </div>
    </main>
  );
}