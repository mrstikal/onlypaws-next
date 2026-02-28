// src/app/cms/likes/[id]/page.tsx
import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { isStaff } from '@/lib/cmsAuthz';
import DeleteLikeButton from '@/components/cms/DeleteLikeButton';
import { formatDateTimeCS } from '@/utils/datetime';
import { ROUTES } from '@/constants/routes';
import { parseBigIntParam, bigIntToString } from '@/lib/cms/params';

export default async function CmsLikeViewPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');

  const { id } = await params;
  const likeId = parseBigIntParam(id);
  if (!likeId) notFound();

  const like = await prisma.likes.findUnique({
    where: { id: likeId },
    select: {
      id: true,
      user_id: true,
      likeable_type: true,
      likeable_id: true,
      created_at: true,
      user: { select: { name: true, email: true } },
    },
  });

  if (!like) notFound();

  const staff = isStaff(auth.user);

  if (!staff && bigIntToString(like.user_id) !== auth.user.id) notFound();

  const userLabel = like.user?.name?.trim() || like.user?.email?.trim() || `Uživatel #${bigIntToString(like.user_id)}`;

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-sm text-gray-600">Like #{bigIntToString(like.id)}</h1>
          <p className="mt-1 text-lg font-semibold">Detail záznamu:</p>
        </div>

        {staff ? <DeleteLikeButton likeId={bigIntToString(like.id)} onDeletedHref={ROUTES.CMS.LIKES} /> : null}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">User</div>
          <div className="mt-1 text-sm">{userLabel}</div>
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vytvořeno</div>
          <div className="mt-1 text-sm">{formatDateTimeCS(like.created_at)}</div>
        </div>

        <div className="rounded-md border border-gray-200 p-4 md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cíl</div>
          <div className="mt-1 text-sm">
            <div>Type: {like.likeable_type}</div>
            <div>ID: {bigIntToString(like.likeable_id)}</div>
          </div>
        </div>
      </div>
    </main>
  );
}