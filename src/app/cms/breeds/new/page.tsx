// src/app/cms/breeds/new/page.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { isStaff } from '@/lib/cmsAuthz';
import CmsBreedForm from '@/components/cms/CmsBreedForm';
import { ROUTES } from '@/constants/routes';

export default async function CmsBreedCreatePage() {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');
  if (!isStaff(auth.user)) redirect(ROUTES.CMS.ROOT);

  return <CmsBreedForm mode="create" />;
}