// src/app/cms/admin/users/[id]/page.tsx
import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import DeleteUserInlineButton from '@/components/cms/DeleteUserInlineButton';
import { ROUTES } from '@/constants/routes';
import { parseBigIntParam } from '@/lib/cms/params';

export default async function CmsAdminUserView({ params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');
  if (auth.user.role !== 'superadmin') redirect(ROUTES.CMS.ROOT);

  const { id } = await params;
  const userId = parseBigIntParam(id);
  if (!userId) redirect(ROUTES.CMS.ADMIN.USERS);

  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      email_verified_at: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!user) redirect(ROUTES.CMS.ADMIN.USERS);

  const idStr = user.id.toString();
  const isSelf = auth.user.id === idStr;

  return (
    <main className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Uživatel #{idStr}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            href={ROUTES.CMS.ADMIN.userEdit(idStr)}
          >
            Upravit roli
          </Link>

          {isSelf ? (
            <div className="text-xs font-semibold text-gray-500" title="Sebe sama smazat nelze">
              Nelze smazat sebe
            </div>
          ) : (
            <DeleteUserInlineButton
              userId={idStr}
              className="px-3 py-1.5 text-sm! font-semibold"
            />
          )}

          <Link className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50" href={ROUTES.CMS.ADMIN.USERS}>
            Zpět
          </Link>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-gray-200">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-200 bg-white">
          <tr>
            <td className="w-56 bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Jméno</td>
            <td className="px-3 py-2">{user.name}</td>
          </tr>
          <tr>
            <td className="bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Email</td>
            <td className="px-3 py-2">{user.email}</td>
          </tr>
          <tr>
            <td className="bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Role</td>
            <td className="px-3 py-2">{user.role}</td>
          </tr>
          <tr>
            <td className="bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Email ověřen</td>
            <td className="px-3 py-2">{user.email_verified_at ? 'ano' : 'ne'}</td>
          </tr>
          <tr>
            <td className="bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Vytvořen</td>
            <td className="px-3 py-2">{user.created_at ? new Date(user.created_at).toLocaleString('cs-CZ') : '—'}</td>
          </tr>
          <tr>
            <td className="bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Upraven</td>
            <td className="px-3 py-2">{user.updated_at ? new Date(user.updated_at).toLocaleString('cs-CZ') : '—'}</td>
          </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}