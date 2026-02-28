// src/app/cms/admin/subscription-tiers/[id]/edit/page.tsx
import React from 'react';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import CmsSubscriptionTierForm from '@/components/cms/CmsSubscriptionTierForm';
import { ROUTES } from '@/constants/routes';
import { parseBigIntParam } from '@/lib/cms/params';

export default async function CmsSubscriptionTierEditPage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');
  if (auth.user.role !== 'superadmin') redirect(ROUTES.CMS.ROOT);

  const { id } = await params;
  const tierId = parseBigIntParam(id);
  if (!tierId) notFound();

  const t = await prisma.subscription_tiers.findUnique({
    where: { id: tierId },
    select: { id: true, name: true, slug: true, price_monthly: true, description: true },
  });
  if (!t) notFound();

  return (
    <CmsSubscriptionTierForm
      mode="edit"
      tierId={t.id.toString()}
      initial={{
        name: t.name,
        slug: t.slug,
        price_monthly: t.price_monthly ?? 0,
        description: t.description ?? '',
      }}
    />
  );
}