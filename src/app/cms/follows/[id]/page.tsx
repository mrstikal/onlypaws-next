// src/app/cms/follows/[id]/page.tsx
import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { isStaff } from '@/lib/cmsAuthz';
import { formatDateTimeCS } from '@/utils/datetime';
import DeleteFollowInlineButton from '@/components/cms/DeleteFollowInlineButton';
import { parseBigIntParam, bigIntToString } from '@/lib/cms/params';

export default async function CmsFollowViewPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');

  const { id } = await params;
  const followId = parseBigIntParam(id);
  if (!followId) notFound();

  const row = await prisma.follows.findUnique({
    where: { id: followId },
    select: {
      id: true,
      follower_type: true,
      follower_id: true,
      followable_type: true,
      followable_id: true,
      created_at: true,
    },
  });
  if (!row) notFound();

  const staff = isStaff(auth.user);

  // Scoping for user: must be follower User and follower_id = current user
  if (
    !staff &&
    !(row.follower_type.endsWith('\\User') && bigIntToString(row.follower_id) === auth.user.id)
  ) {
    notFound();
  }

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-sm text-gray-600">Sledování #{bigIntToString(row.id)}</h1>
          <p className="mt-1 text-lg font-semibold">Detail záznamu:</p>
        </div>

        {staff ? <DeleteFollowInlineButton
          followId={bigIntToString(row.id)}
          className="px-3 py-1.5 text-sm! font-semibold"
        /> : null}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Follower</div>
          <div className="mt-1 text-sm">
            {row.follower_type} · #{bigIntToString(row.follower_id)}
          </div>
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vytvořeno</div>
          <div className="mt-1 text-sm">{formatDateTimeCS(row.created_at ? new Date(row.created_at) : null)}</div>
        </div>

        <div className="rounded-md border border-gray-200 p-4 md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cíl</div>
          <div className="mt-1 text-sm">
            {row.followable_type} · #{bigIntToString(row.followable_id)}
          </div>
        </div>
      </div>
    </main>
  );
}