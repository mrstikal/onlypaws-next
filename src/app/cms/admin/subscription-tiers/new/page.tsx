// src/app/cms/admin/subscription-tiers/new/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import CmsSubscriptionTierForm from '@/components/cms/CmsSubscriptionTierForm';
import { ROUTES } from '@/constants/routes';

export default async function CmsSubscriptionTierCreatePage() {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');
  if (auth.user.role !== 'superadmin') redirect(ROUTES.CMS.ROOT);

  return <CmsSubscriptionTierForm mode="create" />;
}