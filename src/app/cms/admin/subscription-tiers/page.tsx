// src/app/cms/admin/subscription-tiers/page.tsx
import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { loadSubscriptionTiersPage, type CmsTiersSortKey } from '@/lib/server/cms/subscription-tiers/queries';
import { formatDateTimeCS } from '@/utils/datetime';
import DeleteSubscriptionTierInlineButton from '@/components/cms/DeleteSubscriptionTierInlineButton';
import { ROUTES } from '@/constants/routes';
import { clampInt, asString, normalizeSortDir, buildHref, toggleDir } from '@/lib/cms/params';

type SortDir = 'asc' | 'desc';

const VALID_SORT_KEYS: CmsTiersSortKey[] = ['created_at', 'id', 'name', 'slug', 'price_monthly'];

function normalizeSortKey(value: string | null, defaultKey: CmsTiersSortKey): CmsTiersSortKey {
  if (value && VALID_SORT_KEYS.includes(value as CmsTiersSortKey)) {
    return value as CmsTiersSortKey;
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

export default async function CmsSubscriptionTiersPage({
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

  const sortKey = normalizeSortKey(asString(sp.sort), 'price_monthly');
  const sortDir: SortDir = normalizeSortDir(asString(sp.dir));

  const from = asString(sp.from);
  const until = asString(sp.until);
  const q = asString(sp.q);

  const data = await loadSubscriptionTiersPage({
    page,
    perPage,
    sortKey,
    sortDir,
    fromDate: from,
    untilDate: until,
    q,
  });

  const commonParams = {
    per_page: String(data.perPage),
    from: from ?? null,
    until: until ?? null,
    q: q ?? null,
  };

  const sortLink = (key: string) =>
    buildHref(ROUTES.CMS.ADMIN.SUBSCRIPTION_TIERS, {
      ...commonParams,
      page: '1',
      sort: key,
      dir: toggleDir(sortKey, sortDir, key),
    });

  const colCount = 5 + 1;

  return (
    <main className="p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="mt-1 text-lg font-semibold">Předplatná</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.CMS.ADMIN.SUBSCRIPTION_TIERS_NEW}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
          >
            Vytvořit předplatné
          </Link>

          <div className="text-sm text-gray-600">Celkem: {data.total}</div>
        </div>
      </div>

      <form className="mt-4 grid grid-cols-1 gap-3 rounded-md border border-gray-200 bg-white p-3 md:grid-cols-6" method="GET" action={ROUTES.CMS.ADMIN.SUBSCRIPTION_TIERS}>
        <input type="hidden" name="sort" value={sortKey} />
        <input type="hidden" name="dir" value={sortDir} />
        <input type="hidden" name="per_page" value={String(data.perPage)} />

        <label className="block md:col-span-2">
          <div className="text-xs font-semibold text-gray-600">Hledání (name/slug)</div>
          <input name="q" defaultValue={q ?? ''} placeholder="Hledat…" className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm" />
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-gray-600">Od</div>
          <input name="from" type="date" defaultValue={from ?? ''} className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm" />
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-gray-600">Do</div>
          <input name="until" type="date" defaultValue={until ?? ''} className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm" />
        </label>

        <div className="md:col-span-6 flex flex-wrap items-center gap-2">
          <button className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800" type="submit">
            Filtrovat
          </button>
          <Link className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 hover:bg-gray-50" href={ROUTES.CMS.ADMIN.SUBSCRIPTION_TIERS}>
            Reset
          </Link>
        </div>
      </form>

      <div className="mt-3 overflow-hidden rounded-md border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
          <tr>
            <th className="px-3 py-2">
              <SortHeaderLink label="ID" href={sortLink('id')} active={sortKey === 'id'} dir={sortDir} />
            </th>
            <th className="px-3 py-2">
              <SortHeaderLink label="Název" href={sortLink('name')} active={sortKey === 'name'} dir={sortDir} />
            </th>
            <th className="px-3 py-2">
              <SortHeaderLink label="Slug" href={sortLink('slug')} active={sortKey === 'slug'} dir={sortDir} />
            </th>
            <th className="px-3 py-2">
              <SortHeaderLink label="Cena" href={sortLink('price_monthly')} active={sortKey === 'price_monthly'} dir={sortDir} />
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
                <Link className="text-blue-700 hover:underline" href={ROUTES.CMS.ADMIN.subscriptionTier(r.id)}>
                  {r.id}
                </Link>
              </td>
              <td className="px-3 py-2">{r.name}</td>
              <td className="px-3 py-2">{r.slug}</td>
              <td className="px-3 py-2">{r.price_monthly}</td>
              <td className="px-3 py-2">{formatDateTimeCS(r.created_at)}</td>
              <td className="px-3 py-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-900 hover:bg-gray-50" href={ROUTES.CMS.ADMIN.subscriptionTierEdit(r.id)}>
                    Upravit
                  </Link>
                  <DeleteSubscriptionTierInlineButton
                    tierId={r.id}
                  />
                </div>
              </td>
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
    </main>
  );
}