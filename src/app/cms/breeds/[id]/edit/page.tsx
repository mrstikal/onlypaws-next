// src/app/cms/breeds/[id]/edit/page.tsx
import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { isStaff } from '@/lib/cmsAuthz';
import CmsBreedForm from '@/components/cms/CmsBreedForm';
import { ROUTES } from '@/constants/routes';
import { parseBigIntParam } from '@/lib/cms/params';

export default async function CmsBreedEditPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');
  if (!isStaff(auth.user)) redirect(ROUTES.CMS.ROOT);

  const { id } = await params;
  const breedId = parseBigIntParam(id);
  if (!breedId) notFound();

  const b = await prisma.breeds.findUnique({
    where: { id: breedId },
    select: { id: true, name: true, species: true, api_id: true, description: true },
  });
  if (!b) notFound();

  return (
    <CmsBreedForm
      mode="edit"
      breedId={b.id.toString()}
      initial={{
        name: b.name,
        species: b.species === 'cat' ? 'cat' : 'dog',
        api_id: b.api_id ?? '',
        description: b.description ?? '',
      }}
    />
  );
}