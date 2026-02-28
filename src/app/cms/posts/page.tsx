// src/app/cms/posts/page.tsx
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { isStaff } from '@/lib/cmsAuthz';
import { loadPostsPage, type CmsPostsSortKey } from '@/lib/server/cms/posts/queries';
import { formatDateTimeCS } from '@/utils/datetime';
import DeletePostInlineButton from '@/components/cms/DeletePostInlineButton';
import { ROUTES } from '@/constants/routes';
import { clampInt, asString, normalizeSortDir, buildHref, toggleDir } from '@/lib/cms/params';

type SortDir = 'asc' | 'desc';

const VALID_SORT_KEYS: CmsPostsSortKey[] = ['created_at', 'id', 'pet_id', 'likes_count', 'comments_count', 'is_premium'];

function normalizeSortKey(value: string | null, defaultKey: CmsPostsSortKey): CmsPostsSortKey {
  if (value && VALID_SORT_KEYS.includes(value as CmsPostsSortKey)) {
    return value as CmsPostsSortKey;
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
  if (key === 'pet_id') return 'Pet';
  if (key === 'likes_count') return 'Likes';
  if (key === 'comments_count') return 'Comments';
  if (key === 'is_premium') return 'Premium';
  if (key === 'media_type') return 'Media';
  if (key === 'created_at') return 'Vytvořeno';
  return key;
}

export default async function CmsPostsPage({
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
  const q = asString(sp.q);
  const userQ = asString(sp.user);
  const premium = asString(sp.premium) ?? 'all';

  const staff = isStaff(auth.user);
  const scope = staff ? 'all' : 'mine';

  const data = await loadPostsPage({
    scope,
    viewerUserId: BigInt(auth.user.id),
    page,
    perPage,
    sortKey,
    sortDir,
    fromDate: from,
    untilDate: until,
    q,
    userSearch: staff ? userQ : null,
    premium: premium === 'free' || premium === 'premium' ? premium : 'all',
  });

  const commonParams = {
    per_page: String(data.perPage),
    from: from ?? null,
    until: until ?? null,
    q: q ?? null,
    user: staff ? (userQ ?? null) : null,
    premium,
  };

  const sortLink = (key: string) =>
    buildHref(ROUTES.CMS.POSTS, {
      ...commonParams,
      page: '1',
      sort: key,
      dir: toggleDir(sortKey, sortDir, key),
    });

  const colCount = 7 + (staff ? 1 : 0) + 1; // +1 akce

  return (
    <main className="p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Příspěvky</h1>
          <p className="mt-1 text-sm text-gray-600">{scope === 'mine' ? 'Moje' : 'Všechny'}</p>
        </div>

        <div className="flex items-center gap-3">
          {!staff ? (
            <Link
              href={ROUTES.CMS.POSTS_NEW}
              className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Vytvořit post
            </Link>
          ) : null}

          <div className="text-sm text-gray-600">Celkem: {data.total}</div>
        </div>
      </div>

      <form className="mt-4 grid grid-cols-1 gap-3 rounded-md border border-gray-200 bg-white p-3 md:grid-cols-6" method="GET" action={ROUTES.CMS.POSTS}>
        <input type="hidden" name="sort" value={sortKey} />
        <input type="hidden" name="dir" value={sortDir} />
        <input type="hidden" name="per_page" value={String(data.perPage)} />

        <label className="block md:col-span-2">
          <div className="text-xs font-semibold text-gray-600">Od</div>
          <input name="from" type="date" defaultValue={from ?? ''} className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm" />
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-gray-600">Do</div>
          <input name="until" type="date" defaultValue={until ?? ''} className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm" />
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-gray-600">Premium</div>
          <select name="premium" defaultValue={premium} className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm">
            <option value="all">Vše</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
          </select>
        </label>

        {staff ? (
          <label className="block md:col-span-2">
            <div className="text-xs font-semibold text-gray-600">Uživatel (jméno / e-mail)</div>
            <input name="user" defaultValue={userQ ?? ''} placeholder="Hledat…" className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm" />
          </label>
        ) : null}

        <div className="md:col-span-6 flex flex-wrap items-center gap-2">
          <button className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800" type="submit">
            Filtrovat
          </button>
          <Link className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-50" href={ROUTES.CMS.POSTS}>
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
            <th className="px-3 py-2">Náhled</th>
            <th className="px-3 py-2">
              <SortHeaderLink label="ID" href={sortLink('id')} active={sortKey === 'id'} dir={sortDir} />
            </th>
            {staff ? <th className="px-3 py-2">Uživatel</th> : null}
            <th className="px-3 py-2">
              <SortHeaderLink label="Mazlíček" href={sortLink('pet_id')} active={sortKey === 'pet_id'} dir={sortDir} />
            </th>
            <th className="px-3 py-2">Caption</th>
            <th className="px-3 py-2">
              <SortHeaderLink label="Lajky" href={sortLink('likes_count')} active={sortKey === 'likes_count'} dir={sortDir} />
            </th>
            <th className="px-3 py-2">
              <SortHeaderLink label="Komentáře" href={sortLink('comments_count')} active={sortKey === 'comments_count'} dir={sortDir} />
            </th>
            <th className="px-3 py-2">
              <SortHeaderLink label="Vytvořeno" href={sortLink('created_at')} active={sortKey === 'created_at'} dir={sortDir} />
            </th>
            <th className="px-3 py-2 text-right">Akce</th>
          </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
          {data.rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-3 py-2">
                <div className="h-10 w-10 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                  {r.media_url ? <Image src={r.media_url} alt="" className="h-full w-full object-cover" width={40} height={40} /> : null}
                </div>
              </td>

              <td className="px-3 py-2">
                <Link className="text-blue-700 hover:underline" href={ROUTES.CMS.post(r.id)}>
                  {r.id}
                </Link>
              </td>

              {staff ? <td className="px-3 py-2">{r.owner_user_label ?? `Uživatel #${r.owner_user_id}`}</td> : null}

              <td className="px-3 py-2">
                {r.pet_name ? (
                  <span className="font-semibold text-gray-900">{r.pet_name}</span>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
                <div className="text-xs text-gray-500">#{r.pet_id}</div>
              </td>

              <td className="px-3 py-2">
                <div className="text-xs text-gray-500">
                  {r.is_premium ? 'Premium' : 'Free'}
                </div>
                <div className="mt-0.5">{r.caption ?? '—'}</div>
              </td>

              <td className="px-3 py-2">{r.likes_count}</td>
              <td className="px-3 py-2">{r.comments_count}</td>
              <td className="px-3 py-2">{formatDateTimeCS(r.created_at)}</td>

              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-900 hover:bg-gray-50"
                    href={ROUTES.CMS.postEdit(r.id)}
                  >
                    Upravit
                  </Link>

                  <DeletePostInlineButton postId={r.id} />
                </div>              </td>
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
            className={`rounded-md border border-gray-300 bg-white px-3 py-1.5 font-semibold text-gray-900 hover:bg-gray-50 ${
              data.page <= 1 ? 'pointer-events-none opacity-50' : ''
            }`}
            href={buildHref(ROUTES.CMS.POSTS, {
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
            href={buildHref(ROUTES.CMS.POSTS, {
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