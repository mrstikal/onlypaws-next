// src/app/cms/pets/new/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { isStaff } from '@/lib/cmsAuthz';
import CmsPetForm from '@/components/cms/CmsPetForm';
import { ROUTES } from '@/constants/routes';

export default async function CmsPetCreatePage() {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');
  if (isStaff(auth.user)) redirect(ROUTES.CMS.PETS);

  const breedsRaw = await prisma.breeds.findMany({
    orderBy: [{ species: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, species: true },
  });

  const breeds = breedsRaw.map((b) => ({ id: b.id.toString(), name: b.name, species: b.species }));

  return <CmsPetForm mode="create" breeds={breeds} />;
}