// src/app/cms/comments/[id]/edit/page.tsx
import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { isStaff } from '@/lib/cmsAuthz';
import CmsCommentEditForm from '@/components/cms/CmsCommentEditForm';
import { ROUTES } from '@/constants/routes';
import { parseBigIntParam } from '@/lib/cms/params';

export default async function CmsCommentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');
  if (!isStaff(auth.user)) redirect(ROUTES.CMS.COMMENTS);

  const { id } = await params;
  const commentId = parseBigIntParam(id);
  if (!commentId) notFound();

  const c = await prisma.comments.findUnique({
    where: { id: commentId },
    select: { id: true, body: true },
  });
  if (!c) notFound();

  return (
    <main className="p-6">
      <div className="max-w-3xl">
        <h1 className="text-lg font-semibold">Upravit komentář #{c.id.toString()}</h1>

        <CmsCommentEditForm commentId={c.id.toString()} initialBody={c.body} />
      </div>
    </main>
  );
}