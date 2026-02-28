// src/app/cms/likes/page.tsx
import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { isStaff } from '@/lib/cmsAuthz';
import { loadLikesPage, type CmsLikesSortKey } from '@/lib/server/cms/likes/queries';
import { formatDateTimeCS } from '@/utils/datetime';
import DeleteLikeInlineButton from '@/components/cms/DeleteLikeInlineButton';
import { ROUTES } from '@/constants/routes';
import { clampInt, asString, normalizeSortDir, buildHref, toggleDir } from '@/lib/cms/params';

// Admin pages - vždy fresh data bez cache
export const revalidate = false;

type SortDir = 'asc' | 'desc';

const VALID_SORT_KEYS: CmsLikesSortKey[] = ['created_at', 'id', 'user_id', 'likeable_type', 'likeable_id'];

function normalizeSortKey(value: string | null, defaultKey: CmsLikesSortKey): CmsLikesSortKey {
  if (value && VALID_SORT_KEYS.includes(value as CmsLikesSortKey)) {
    return value as CmsLikesSortKey;
  }
  return defaultKey;
}


function SortHeaderLink({
  label,
  href,
  active,
  dir,
}: {
  label: string;
  href: string;
  active: boolean;
  dir: 'asc' | 'desc';
}) {
  const arrow = active ? (dir === 'asc' ? '▲' : '▼') : '↕';

  return (
    <Link
      href={href}
      className={[
        'inline-flex select-none items-center gap-1',
        'hover:underline',
        active ? 'font-bold text-gray-900' : 'font-semibold text-gray-700',
      ].join(' ')}
      title={active ? `Řazení: ${dir === 'asc' ? 'vzestupně' : 'sestupně'}` : 'Klikněte pro řazení'}
    >
      <span>{label}</span>
      <span className={active ? 'text-gray-900' : 'text-gray-400'} aria-hidden="true">
        {arrow}
      </span>
    </Link>
  );
}

function sortKeyLabel(key: string) {
  if (key === 'id') return 'ID';
  if (key === 'user_id') return 'Uživatel';
  if (key === 'likeable_type') return 'Typ';
  if (key === 'likeable_id') return 'Cíl';
  if (key === 'created_at') return 'Vytvořeno';
  return key;
}

export default async function CmsLikesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');

  const sp = await searchParams;

  const page = clampInt(asString(sp.page), 1, 1, 10_000);
  const perPage = clampInt(asString(sp.per_page), 20, 5, 100);

  const sortKey = normalizeSortKey(asString(sp.sort), 'created_at');
  const sortDir: SortDir = normalizeSortDir(asString(sp.dir));

  const from = asString(sp.from);
  const until = asString(sp.until);
  const userQ = asString(sp.user);
  const type = asString(sp.type);

  const scope = isStaff(auth.user) ? 'all' : 'mine';
  const staff = isStaff(auth.user);

  const data = await loadLikesPage({
    scope,
    viewerUserId: BigInt(auth.user.id),
    page,
    perPage,
    sortKey,
    sortDir,
    fromDate: from,
    untilDate: until,
    userSearch: userQ,
    likeableType: type === 'post' || type === 'pet' || type === 'comment' ? type : null,
  });

  const commonParams = {
    per_page: String(data.perPage),
    from: from ?? null,
    until: until ?? null,
    user: userQ ?? null,
    type: type ?? null,
  };

  const sortLink = (key: string) =>
    buildHref(ROUTES.CMS.LIKES, {
      ...commonParams,
      page: '1',
      sort: key,
      dir: toggleDir(sortKey, sortDir, key),
    });

  return (
    <main className="p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Lajky</h1>
          <p className="mt-1 text-sm text-gray-600">{scope === 'mine' ? 'Moje' : 'Všechny'}</p>
        </div>
        <div className="text-sm text-gray-600">Celkem: {data.total}</div>
      </div>

      <form
        className="mt-4 grid grid-cols-1 gap-3 rounded-md border border-gray-200 bg-white p-3 md:grid-cols-5"
        method="GET"
        action={ROUTES.CMS.LIKES}
      >
        <input type="hidden" name="sort" value={sortKey} />
        <input type="hidden" name="dir" value={sortDir} />
        <input type="hidden" name="per_page" value={String(data.perPage)} />

        <label className="block">
          <div className="text-xs font-semibold text-gray-600">Od</div>
          <input
            name="from"
            type="date"
            defaultValue={from ?? ''}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-gray-600">Do</div>
          <input
            name="until"
            type="date"
            defaultValue={until ?? ''}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
        </label>

        <label className="block md:col-span-2">
          <div className="text-xs font-semibold text-gray-600">Uživatel (jméno / e-mail)</div>
          <input
            name="user"
            defaultValue={userQ ?? ''}
            placeholder="Hledat…"
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-gray-600">Typ</div>
          <select
            name="type"
            defaultValue={type ?? ''}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
          >
            <option value="">Vše</option>
            <option value="pet">Pet</option>
            <option value="post">Post</option>
            <option value="comment">Komentář</option>
          </select>
        </label>

        <div className="md:col-span-5 flex flex-wrap items-center gap-2">
          <button
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
            type="submit"
          >
            Filtrovat
          </button>
          <Link
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            href={ROUTES.CMS.LIKES}
          >
            Reset
          </Link>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700"
          title="Aktuální řazení"
        >
          Seřazeno podle: {sortKeyLabel(sortKey)} ({sortDir === 'asc' ? 'vzestupně' : 'sestupně'})
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-3 py-2">
                <SortHeaderLink
                  label="ID"
                  href={sortLink('id')}
                  active={sortKey === 'id'}
                  dir={sortDir}
                />
              </th>

              {scope === 'all' ? (
                <th className="px-3 py-2">
                  <SortHeaderLink
                    label="Uživatel"
                    href={sortLink('user_id')}
                    active={sortKey === 'user_id'}
                    dir={sortDir}
                  />
                </th>
              ) : null}

              <th className="px-3 py-2">
                <SortHeaderLink
                  label="Typ"
                  href={sortLink('likeable_type')}
                  active={sortKey === 'likeable_type'}
                  dir={sortDir}
                />
              </th>

              <th className="px-3 py-2">
                <SortHeaderLink
                  label="Cíl"
                  href={sortLink('likeable_id')}
                  active={sortKey === 'likeable_id'}
                  dir={sortDir}
                />
              </th>

              <th className="px-3 py-2">
                <SortHeaderLink
                  label="Vytvořeno"
                  href={sortLink('created_at')}
                  active={sortKey === 'created_at'}
                  dir={sortDir}
                />
              </th>
              {staff ? <th className="px-3 py-2 text-right">Akce</th> : null}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {data.rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <Link className="text-blue-700 hover:underline" href={ROUTES.CMS.like(r.id)}>
                    {r.id}
                  </Link>
                </td>

                {scope === 'all' ? <td className="px-3 py-2">{r.user_label ?? `Uživatel #${r.user_id}`}</td> : null}

                <td className="px-3 py-2">{r.likeable_type.split('\\').pop() ?? r.likeable_type}</td>
                <td className="px-3 py-2">{r.likeable_label}</td>
                <td className="px-3 py-2">{formatDateTimeCS(r.created_at)}</td>
                {staff ? (
                  <td className="px-3 py-2 text-right">
                    <DeleteLikeInlineButton likeId={r.id} />
                  </td>
                ) : null}
              </tr>
            ))}

            {data.rows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-sm text-gray-600" colSpan={scope === 'all' ? 5 : 4}>
                  Nic nenalezeno.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="text-gray-600">
          Stránka {data.page} z {data.lastPage}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            className={`rounded-md border border-gray-300 bg-white px-3 py-1.5 font-semibold text-gray-900 hover:bg-gray-50 ${
              data.page <= 1 ? 'pointer-events-none opacity-50' : ''
            }`}
            href={buildHref(ROUTES.CMS.LIKES, {
              ...commonParams,
              sort: sortKey,
              dir: sortDir,
              per_page: String(data.perPage),
              page: String(Math.max(1, data.page - 1)),
            })}
          >
            Předchozí
          </Link>

          <Link
            className={`rounded-md border border-gray-300 bg-white px-3 py-1.5 font-semibold text-gray-900 hover:bg-gray-50 ${
              data.page >= data.lastPage ? 'pointer-events-none opacity-50' : ''
            }`}
            href={buildHref(ROUTES.CMS.LIKES, {
              ...commonParams,
              sort: sortKey,
              dir: sortDir,
              per_page: String(data.perPage),
              page: String(Math.min(data.lastPage, data.page + 1)),
            })}
          >
            Další
          </Link>
        </div>
      </div>
    </main>
  );
}