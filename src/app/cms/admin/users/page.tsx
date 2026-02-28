// src/app/cms/admin/users/page.tsx
import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuth } from '@/lib/auth';
import DeleteUserInlineButton from '@/components/cms/DeleteUserInlineButton';
import { ROUTES } from '@/constants/routes';
import { clampInt, asString } from '@/lib/cms/params';

export default async function CmsAdminUsersPage({
                                                  searchParams,
                                                }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');
  if (auth.user.role !== 'superadmin') redirect(ROUTES.CMS.ROOT);

  const sp = await searchParams;

  const page = clampInt(asString(sp.page), 1, 1, 10_000);
  const perPage = clampInt(asString(sp.per_page), 20, 5, 100);
  const q = (asString(sp.q) ?? '').trim();

  const where = q
    ? {
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { email: { contains: q, mode: 'insensitive' as const } },
      ],
    }
    : {};

  const [total, rows] = await Promise.all([
    prisma.users.count({ where }),
    prisma.users.findMany({
      where,
      orderBy: [{ id: 'desc' }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: { id: true, name: true, email: true, role: true, created_at: true },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / perPage));

  const buildHref = (nextPage: number) => {
    const usp = new URLSearchParams();
    usp.set('page', String(nextPage));
    usp.set('per_page', String(perPage));
    if (q) usp.set('q', q);
    return `${ROUTES.CMS.ADMIN.USERS}?${usp.toString()}`;
  };

  return (
    <main className="p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Uživatelé</h1>
        </div>
        <div className="text-sm text-gray-600">Celkem: {total}</div>
      </div>

      <form
        className="mt-4 grid grid-cols-1 gap-3 rounded-md border border-gray-200 bg-white p-3 md:grid-cols-6"
        method="GET"
        action={ROUTES.CMS.ADMIN.USERS}
      >
        <input type="hidden" name="per_page" value={String(perPage)} />
        <label className="block md:col-span-3">
          <div className="text-xs font-semibold text-gray-600">Hledání (jméno/email)</div>
          <input
            name="q"
            defaultValue={q}
            placeholder="Hledat…"
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
        </label>

        <label className="block md:col-span-1">
          <div className="text-xs font-semibold text-gray-600">Na stránku</div>
          <input
            name="page"
            defaultValue={String(page)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
        </label>

        <div className="md:col-span-6 flex flex-wrap items-center gap-2">
          <button className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800" type="submit">
            Filtrovat
          </button>
          <Link className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-50" href={ROUTES.CMS.ADMIN.USERS}>
            Reset
          </Link>
        </div>
      </form>

      <div className="mt-3 overflow-hidden rounded-md border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
          <tr>
            <th className="px-3 py-2">ID</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2 text-right">Akce</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.map((u) => {
              const id = u.id.toString();
              const isSelf = auth.user.id === id;

              return (
                <tr key={id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link className="text-blue-700 hover:underline" href={ROUTES.CMS.ADMIN.user(id)}>
                      {id}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{u.role}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-900 hover:bg-gray-50"
                        href={ROUTES.CMS.ADMIN.userEdit(id)}
                      >
                        Upravit
                      </Link>

                      {isSelf ? (
                        <span className="text-xs font-semibold text-gray-500" title="Sebe sama smazat nelze">
                          Nelze smazat sebe
                        </span>
                      ) : (
                        <DeleteUserInlineButton userId={id} />
                      )}

                    </div>
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-sm text-gray-600" colSpan={5}>
                  Nic nenalezeno.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="text-gray-600">
          Strana {page} / {pageCount}
        </div>
        <div className="flex gap-2">
          <Link
            className={[
              'rounded-md border px-3 py-1.5 font-semibold',
              page <= 1 ? 'pointer-events-none border-gray-200 text-gray-400' : 'border-gray-300 hover:bg-gray-50',
            ].join(' ')}
            href={buildHref(Math.max(1, page - 1))}
          >
            Předchozí
          </Link>
          <Link
            className={[
              'rounded-md border px-3 py-1.5 font-semibold',
              page >= pageCount ? 'pointer-events-none border-gray-200 text-gray-400' : 'border-gray-300 hover:bg-gray-50',
            ].join(' ')}
            href={buildHref(Math.min(pageCount, page + 1))}
          >
            Další
          </Link>
        </div>
      </div>
    </main>
  );
}