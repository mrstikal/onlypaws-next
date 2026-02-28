// src/app/cms/follows/page.tsx
import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { isStaff } from '@/lib/cmsAuthz';
import { loadFollowsPage, type CmsFollowsSortKey } from '@/lib/server/cms/follows/queries';
import { formatDateTimeCS } from '@/utils/datetime';
import DeleteFollowInlineButton from '@/components/cms/DeleteFollowInlineButton';
import { ROUTES } from '@/constants/routes';
import { clampInt, asString, normalizeSortDir, buildHref, toggleDir } from '@/lib/cms/params';

// Admin pages - vždy fresh data bez cache
export const revalidate = false;

type SortDir = 'asc' | 'desc';

const VALID_SORT_KEYS: CmsFollowsSortKey[] = ['created_at', 'id', 'follower_id', 'followable_id', 'followable_type'];

function normalizeSortKey(value: string | null, defaultKey: CmsFollowsSortKey): CmsFollowsSortKey {
  if (value && VALID_SORT_KEYS.includes(value as CmsFollowsSortKey)) {
    return value as CmsFollowsSortKey;
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
  dir: SortDir;
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
  if (key === 'follower_id') return 'Follower';
  if (key === 'followable_type') return 'Typ cíle';
  if (key === 'followable_id') return 'Cíl';
  if (key === 'created_at') return 'Vytvořeno';
  return key;
}

export default async function CmsFollowsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const auth = await getAuth();
  if (!auth.isAuthed) redirect('/');

  const sp = await searchParams;

  const page = clampInt(asString(sp.page), 1, 1, 10_000);
  const perPage = clampInt(asString(sp.per_page), 20, 5, 100);

  const sortKey = normalizeSortKey(asString(sp.sort), 'created_at');
  const sortDir: SortDir = normalizeSortDir(asString(sp.dir));

  const from = asString(sp.from);
  const until = asString(sp.until);
  const type = asString(sp.type);
  const userQ = asString(sp.user);

  const staff = isStaff(auth.user);
  const scope = staff ? 'all' : 'mine';

  const data = await loadFollowsPage({
    scope,
    viewerUserId: BigInt(auth.user.id),
    page,
    perPage,
    sortKey,
    sortDir,
    fromDate: from,
    untilDate: until,
    type: type === 'pet' || type === 'user' ? type : null,
    userSearch: staff ? userQ : null,
  });

  const commonParams = {
    per_page: String(data.perPage),
    from: from ?? null,
    until: until ?? null,
    type: type ?? null,
    user: staff ? (userQ ?? null) : null,
  };

  const sortLink = (key: string) =>
    buildHref(ROUTES.CMS.FOLLOWS, {
      ...commonParams,
      page: '1',
      sort: key,
      dir: toggleDir(sortKey, sortDir, key),
    });

  const colCount = 5 + (staff ? 1 : 0) + (staff ? 1 : 0);

  return (
    <main className="p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Sledování</h1>
          <p className="mt-1 text-sm text-gray-600">{scope === 'mine' ? 'Moje (jen pro čtení)' : 'Všechna'}</p>
        </div>
        <div className="text-sm text-gray-600">Celkem: {data.total}</div>
      </div>

      <form className="mt-4 grid grid-cols-1 gap-3 rounded-md border border-gray-200 bg-white p-3 md:grid-cols-6" method="GET" action={ROUTES.CMS.FOLLOWS}>
        <input type="hidden" name="sort" value={sortKey} />
        <input type="hidden" name="dir" value={sortDir} />
        <input type="hidden" name="per_page" value={String(data.perPage)} />

        <label className="block">
          <div className="text-xs font-semibold text-gray-600">Od</div>
          <input name="from" type="date" defaultValue={from ?? ''} className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm" />
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-gray-600">Do</div>
          <input name="until" type="date" defaultValue={until ?? ''} className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm" />
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-gray-600">Typ cíle</div>
          <select name="type" defaultValue={type ?? ''} className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm">
            <option value="">Vše</option>
            <option value="pet">Mazlíček</option>
            <option value="user">Uživatel</option>
          </select>
        </label>

        {staff ? (
          <label className="block md:col-span-3">
            <div className="text-xs font-semibold text-gray-600">Follower (jméno / e-mail)</div>
            <input name="user" defaultValue={userQ ?? ''} placeholder="Hledat…" className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm" />
          </label>
        ) : null}

        <div className="md:col-span-6 flex flex-wrap items-center gap-2">
          <button className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800" type="submit">
            Filtrovat
          </button>
          <Link className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-50" href={ROUTES.CMS.FOLLOWS}>
            Reset
          </Link>
        </div>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
          Seřazeno podle: {sortKeyLabel(sortKey)} ({sortDir === 'asc' ? 'vzestupně' : 'sestupně'})
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-md border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
          <tr>
            <th className="px-3 py-2">
              <SortHeaderLink label="ID" href={sortLink('id')} active={sortKey === 'id'} dir={sortDir} />
            </th>

            {staff ? (
              <th className="px-3 py-2">
                <SortHeaderLink label="Follower" href={sortLink('follower_id')} active={sortKey === 'follower_id'} dir={sortDir} />
              </th>
            ) : null}

            <th className="px-3 py-2">
              <SortHeaderLink label="Typ cíle" href={sortLink('followable_type')} active={sortKey === 'followable_type'} dir={sortDir} />
            </th>

            <th className="px-3 py-2">
              <SortHeaderLink label="Cíl" href={sortLink('followable_id')} active={sortKey === 'followable_id'} dir={sortDir} />
            </th>

            <th className="px-3 py-2">
              <SortHeaderLink label="Vytvořeno" href={sortLink('created_at')} active={sortKey === 'created_at'} dir={sortDir} />
            </th>

            {staff ? <th className="px-3 py-2 text-right">Akce</th> : null}
          </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
          {data.rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-3 py-2">
                <Link className="text-blue-700 hover:underline" href={ROUTES.CMS.follow(r.id)}>
                  {r.id}
                </Link>
              </td>

              {staff ? <td className="px-3 py-2">{r.follower_label}</td> : null}

              <td className="px-3 py-2">{r.followable_type.split('\\').pop() ?? r.followable_type}</td>
              <td className="px-3 py-2">{r.followable_label}</td>
              <td className="px-3 py-2">{formatDateTimeCS(r.created_at)}</td>

              {staff ? (
                <td className="px-3 py-2 text-right">
                  <DeleteFollowInlineButton followId={r.id} />
                </td>
              ) : null}
            </tr>
          ))}

          {data.rows.length === 0 ? (
            <tr>
              <td className="px-3 py-8 text-center text-sm text-gray-600" colSpan={colCount}>
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
            className={`rounded-md border border-gray-300 bg-white px-3 py-1.5 font-semibold text-gray-900 hover:bg-gray-50 ${data.page <= 1 ? 'pointer-events-none opacity-50' : ''}`}
            href={buildHref(ROUTES.CMS.FOLLOWS, { ...commonParams, sort: sortKey, dir: sortDir, page: String(Math.max(1, data.page - 1)) })}
          >
            Předchozí
          </Link>

          <Link
            className={`rounded-md border border-gray-300 bg-white px-3 py-1.5 font-semibold text-gray-900 hover:bg-gray-50 ${data.page >= data.lastPage ? 'pointer-events-none opacity-50' : ''}`}
            href={buildHref(ROUTES.CMS.FOLLOWS, { ...commonParams, sort: sortKey, dir: sortDir, page: String(Math.min(data.lastPage, data.page + 1)) })}
          >
            Další
          </Link>
        </div>
      </div>
    </main>
  );
}