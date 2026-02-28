// src/app/cms/admin/users/[id]/edit/page.tsx
import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import CmsUserRoleForm from '@/components/cms/CmsUserRoleForm';
import { ROUTES } from '@/constants/routes';
import { parseBigIntParam } from '@/lib/cms/params';

export default async function CmsAdminUserEdit({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');
  if (auth.user.role !== 'superadmin') redirect(ROUTES.CMS.ROOT);

  const { id } = await params;
  const userId = parseBigIntParam(id);
  if (!userId) redirect(ROUTES.CMS.ADMIN.USERS);

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user) redirect(ROUTES.CMS.ADMIN.USERS);

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Edit user #{user.id.toString()}</h1>
          <p className="mt-1 text-sm text-gray-600">Změna role (superadmin)</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            href={ROUTES.CMS.ADMIN.user(user.id.toString())}
          >
            Zpět
          </Link>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-gray-200 bg-white p-4">
        <div className="text-sm text-gray-700">
          <div>
            <span className="font-semibold">Name:</span> {user.name}
          </div>
          <div>
            <span className="font-semibold">Email:</span> {user.email}
          </div>
        </div>

        <div className="mt-4">
          <CmsUserRoleForm userId={user.id.toString()} initialRole={user.role} />
        </div>
      </div>
    </main>
  );
}