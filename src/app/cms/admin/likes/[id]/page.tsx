// src/app/cms/admin/likes/[id]/page.tsx
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { isStaff } from '@/lib/cmsAuthz';
import { ROUTES } from '@/constants/routes';

export default async function CmsAdminLikesView({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');
  if (!isStaff(auth.user)) redirect(ROUTES.CMS.ROOT);

  const { id } = await params;
  redirect(ROUTES.CMS.like(id));
}