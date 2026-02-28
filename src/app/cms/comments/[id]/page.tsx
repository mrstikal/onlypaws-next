// src/app/cms/comments/[id]/page.tsx
import React from 'react';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { isStaff } from '@/lib/cmsAuthz';
import { formatDateTimeCS } from '@/utils/datetime';
import DeleteCommentInlineButton from '@/components/cms/DeleteCommentInlineButton';
import { ROUTES } from '@/constants/routes';
import { parseBigIntParam, bigIntToString } from '@/lib/cms/params';

export default async function CmsCommentViewPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');

  const { id } = await params;
  const commentId = parseBigIntParam(id);
  if (!commentId) notFound();

  const c = await prisma.comments.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      body: true,
      likes_count: true,
      user_id: true,
      commentable_type: true,
      commentable_id: true,
      parent_id: true,
      created_at: true,
      updated_at: true,
      user: { select: { name: true, email: true } },
    },
  });
  if (!c) notFound();

  const staff = isStaff(auth.user);
  if (!staff && bigIntToString(c.user_id) !== auth.user.id) notFound();

  const userLabel = c.user?.name?.trim() || c.user?.email?.trim() || `Uživatel #${bigIntToString(c.user_id)}`;

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Komentář #{bigIntToString(c.id)}</h1>
          <p className="mt-1 text-sm text-gray-600">{userLabel}</p>
        </div>

        {staff ? (
          <div className="flex items-center gap-2">
            <Link
              href={ROUTES.CMS.commentEdit(bigIntToString(c.id))}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              Upravit
            </Link>
            <DeleteCommentInlineButton
              commentId={bigIntToString(c.id)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm! font-semibold text-gray-900 hover:bg-gray-50"
            />
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-md border border-gray-200 p-4 md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Text</div>
          <div className="mt-1 whitespace-pre-wrap text-sm">{c.body}</div>
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vytvořeno</div>
          <div className="mt-1 text-sm">{formatDateTimeCS(c.created_at)}</div>
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Lajky</div>
          <div className="mt-1 text-sm">{c.likes_count ?? 0}</div>
        </div>

        <div className="rounded-md border border-gray-200 p-4 md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cíl</div>
          <div className="mt-1 text-sm">
            {c.commentable_type} · #{bigIntToString(c.commentable_id)}
            {c.parent_id ? <div className="text-xs text-gray-600">Parent: #{bigIntToString(c.parent_id)}</div> : null}
          </div>
        </div>
      </div>
    </main>
  );
}