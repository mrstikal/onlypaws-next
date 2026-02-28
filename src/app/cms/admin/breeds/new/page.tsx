// src/app/cms/admin/breeds/new/page.tsx
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { isStaff } from '@/lib/cmsAuthz';

export default async function CmsAdminBreedsNew() {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');
  if (!isStaff(auth.user)) redirect('/cms');

  redirect('/cms/breeds/new');
}