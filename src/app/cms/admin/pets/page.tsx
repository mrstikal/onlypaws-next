// src/app/cms/admin/pets/page.tsx
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { isStaff } from '@/lib/cmsAuthz';
import { ROUTES } from '@/constants/routes';

export default async function CmsAdminPetsIndex() {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');
  if (!isStaff(auth.user)) redirect(ROUTES.CMS.ROOT);

  redirect(ROUTES.CMS.PETS);
}