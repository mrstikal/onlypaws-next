// src/app/cms/posts/new/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import { isStaff } from '@/lib/cmsAuthz';
import CmsPostForm from '@/components/cms/CmsPostForm';
import { ROUTES } from '@/constants/routes';

export default async function CmsPostCreatePage() {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');
  if (isStaff(auth.user)) redirect(ROUTES.CMS.POSTS); // staff nesmí vytvářet

  const petsRaw = await prisma.pets.findMany({
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

  if (pets.length === 0) redirect(ROUTES.CMS.PETS);

  return <CmsPostForm mode="create" pets={pets} tiers={tiers} />;
}