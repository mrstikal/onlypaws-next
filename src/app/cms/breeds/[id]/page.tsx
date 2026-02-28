// src/app/cms/breeds/[id]/page.tsx
import React from 'react';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { isStaff } from '@/lib/cmsAuthz';
import { formatDateTimeCS } from '@/utils/datetime';
import DeleteBreedInlineButton from "@/components/cms/DeleteBreedInlineButton";
import { ROUTES } from '@/constants/routes';
import { parseBigIntParam } from '@/lib/cms/params';

export default async function CmsBreedViewPage({params}: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');
  if (!isStaff(auth.user)) redirect(ROUTES.CMS.ROOT);

  const {id} = await params;
  const breedId = parseBigIntParam(id);
  if (!breedId) notFound();

  const b = await prisma.breeds.findUnique({
    where: {id: breedId},
    select: {id: true, name: true, species: true, api_id: true, description: true, created_at: true, updated_at: true},
  });
  if (!b) notFound();

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-sm text-gray-600">Plemeno #{b.id.toString()}</h1>
          <p className="mt-1 text-lg font-semibold">{b.name}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={ROUTES.CMS.breedEdit(b.id.toString())}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            Upravit
          </Link>

          <DeleteBreedInlineButton
            breedId={String(b.id)}
            className="px-3 py-1.5 text-sm! font-semibold"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Druh</div>
          <div className="mt-1 text-sm">{b.species}</div>
        </div>

        <div className="rounded-md border border-gray-200 p-4 md:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Popis</div>
          <div className="mt-1 whitespace-pre-wrap text-sm">{b.description ?? '—'}</div>
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vytvořeno</div>
          <div className="mt-1 text-sm">{formatDateTimeCS(b.created_at)}</div>
        </div>

        <div className="rounded-md border border-gray-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Upraveno</div>
          <div className="mt-1 text-sm">{formatDateTimeCS(b.updated_at)}</div>
        </div>
      </div>
    </main>
  );
}