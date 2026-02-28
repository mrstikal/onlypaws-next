'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Select from 'react-select';
import { formatCommentsCS, formatLikesCS, formatFollowersCS } from '@/utils/pluralize';

type Filters = {
  species: 'all' | 'dog' | 'cat';
  sort: 'likes' | 'followers' | 'created';
  dir: 'asc' | 'desc';
  q: string;
};

type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
};

type PetCard = {
  id: string;
  name: string;
  slug: string;
  profile_picture: string | null;
  likes_count: number;
  followers_count: number;
  created_at: string | null;
  comments_count: number;
  breed: { name: string; species: 'dog' | 'cat' | string } | null;
};

const selectClassNames = {
  control: () => 'w-full rounded-md border border-gray-200 bg-white text-sm min-h-[38px] px-2 pl-3.5',
  valueContainer: () => 'py-1',
  singleValue: () => 'text-gray-900',
  indicatorSeparator: () => 'border-l border-gray-200 my-2 mr-2',
  dropdownIndicator: () => 'text-gray-400',
  menu: () => 'mt-1 rounded-md border border-gray-200 bg-white shadow-lg overflow-hidden',
  option: (state: { isSelected: boolean; isFocused: boolean }) =>
    [
      'px-3 py-2 text-sm cursor-pointer',
      state.isSelected ? 'bg-rose-600/80 text-white' : '',
      !state.isSelected && state.isFocused ? 'bg-gray-50' : '',
    ].join(' '),
};

function speciesLabel(species: string) {
  if (species === 'dog') return 'Psi';
  if (species === 'cat') return 'Kočky';
  return 'Vše';
}

function formatAddedAt(iso: string | null) {
  if (!iso) return null;

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  return new Intl.DateTimeFormat('cs-CZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

function normalizeFilters(sp: URLSearchParams): Filters {
  const speciesRaw = sp.get('species');
  const sortRaw = sp.get('sort');
  const dirRaw = sp.get('dir');

  const species: Filters['species'] = speciesRaw === 'dog' || speciesRaw === 'cat' ? speciesRaw : 'all';
  const sort: Filters['sort'] = sortRaw === 'followers' || sortRaw === 'created' ? sortRaw : 'likes';
  const dir: Filters['dir'] = dirRaw === 'asc' ? 'asc' : 'desc';
  const q = sp.get('q') ?? '';

  return { species, sort, dir, q };
}

async function fetchPets(params: Filters & { page: number }) {
  const sp = new URLSearchParams();

  if (params.page > 1) sp.set('page', String(params.page));
  if (params.species !== 'all') sp.set('species', params.species);
  if (params.sort !== 'likes') sp.set('sort', params.sort);
  if (params.dir !== 'desc') sp.set('dir', params.dir);
  if (params.q.trim()) sp.set('q', params.q.trim());

  const res = await fetch(`/api/pets?${sp.toString()}`, { method: 'GET' });
  if (!res.ok) throw new Error(`Pets fetch failed: ${res.status}`);

  return (await res.json()) as {
    pets: Paginated<PetCard>;
    filters: Filters;
  };
}

export default function PPetsIndexClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initial = useMemo(() => {
    const sp = searchParams ? new URLSearchParams(searchParams.toString()) : new URLSearchParams();
    return normalizeFilters(sp);
  }, [searchParams]);

  const [species, setSpecies] = useState<Filters['species']>(initial.species);
  const [sort, setSort] = useState<Filters['sort']>(initial.sort);
  const [dir, setDir] = useState<Filters['dir']>(initial.dir);
  const [q, setQ] = useState<string>(initial.q);

  const speciesOptions = useMemo(
    () => [
      { value: 'all' as const, label: 'Vše' },
      { value: 'dog' as const, label: 'Psi' },
      { value: 'cat' as const, label: 'Kočky' },
    ],
    [],
  );

  const sortOptions = useMemo(
    () => [
      { value: 'likes' as const, label: 'Počet lajků' },
      { value: 'followers' as const, label: 'Počet sledujících' },
      { value: 'created' as const, label: 'Datum přidání' },
    ],
    [],
  );

  const dirOptions = useMemo(
    () => [
      { value: 'desc' as const, label: 'Sestupně' },
      { value: 'asc' as const, label: 'Vzestupně' },
    ],
    [],
  );

  const selectedSpecies = speciesOptions.find((o) => o.value === species) ?? speciesOptions[0];
  const selectedSort = sortOptions.find((o) => o.value === sort) ?? sortOptions[0];
  const selectedDir = dirOptions.find((o) => o.value === dir) ?? dirOptions[0];

  const [items, setItems] = useState<PetCard[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const canLoadMore = useMemo(() => !loadingMore && currentPage < lastPage, [loadingMore, currentPage, lastPage]);

  const syncUrl = (next: Filters) => {
    const sp = new URLSearchParams();
    if (next.species !== 'all') sp.set('species', next.species);
    if (next.sort !== 'likes') sp.set('sort', next.sort);
    if (next.dir !== 'desc') sp.set('dir', next.dir);
    if (next.q.trim()) sp.set('q', next.q.trim());

    const qs = sp.toString();
    router.replace(qs ? `/pets?${qs}` : '/pets');
  };

  const reloadFirstPage = async (next: Filters) => {
    setLoadingMore(true);
    try {
      syncUrl(next);

      const data = await fetchPets({ ...next, page: 1 });

      setItems(data.pets.data);
      setTotal(data.pets.total);
      setCurrentPage(data.pets.current_page);
      setLastPage(data.pets.last_page);
    } finally {
      setLoadingMore(false);
      setBootLoading(false);
    }
  };

  useEffect(() => {
    reloadFirstPage({ species, sort, dir, q }).catch((e) => console.error(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      reloadFirstPage({ species, sort, dir, q }).catch((e) => console.error(e));
    }, 300);

    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [species, sort, dir, q]);

  const reset = () => {
    const next: Filters = { species: 'all', sort: 'likes', dir: 'desc', q: '' };
    setSpecies(next.species);
    setSort(next.sort);
    setDir(next.dir);
    setQ(next.q);
    reloadFirstPage(next).catch((e) => console.error(e));
  };

  const loadMore = async () => {
    if (!canLoadMore) return;

    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const data = await fetchPets({ species, sort, dir, q, page: nextPage });

      const seen = new Set(items.map((p) => p.id));
      const next = data.pets.data.filter((p) => !seen.has(p.id));

      setItems((prev) => prev.concat(next));
      setTotal(data.pets.total);
      setCurrentPage(data.pets.current_page);
      setLastPage(data.pets.last_page);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) loadMore().catch((e) => console.error(e));
      },
      { root: null, rootMargin: '800px 0px', threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoadMore, currentPage, lastPage, loadingMore, species, sort, dir, q, items]);

  return (
    <main className="op-container py-8">
      <div className="mb-6 op-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="pb-4 text-2xl font-bold tracking-tight text-rose-700">Pets</h1>
            <div className="text-sm text-gray-600">
              Found <span className="font-semibold">{total}</span> pets
            </div>
          </div>

          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Reset filtrů
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4 md:items-end">
          <div>
            <div className="text-xs font-semibold text-gray-700">Filtr: Druh</div>
            <div className="mt-0.5">
              <Select
                instanceId="pets-filter-species"
                inputId="pets-filter-species"
                unstyled
                value={selectedSpecies}
                options={speciesOptions}
                onChange={(opt) => setSpecies((opt?.value ?? 'all') as Filters['species'])}
                isSearchable={false}
                classNames={selectClassNames}
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-700">Řadit dle</div>
            <div className="mt-0.5">
              <Select
                instanceId="pets-filter-sort"
                inputId="pets-filter-sort"
                unstyled
                value={selectedSort}
                options={sortOptions}
                onChange={(opt) => setSort((opt?.value ?? 'likes') as Filters['sort'])}
                isSearchable={false}
                classNames={selectClassNames}
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-700">Směr</div>
            <div className="mt-0.5">
              <Select
                instanceId="pets-filter-dir"
                inputId="pets-filter-dir"
                unstyled
                value={selectedDir}
                options={dirOptions}
                onChange={(opt) => setDir((opt?.value ?? 'desc') as Filters['dir'])}
                isSearchable={false}
                classNames={selectClassNames}
              />
            </div>
          </div>

          <label className="block">
            <div className="text-xs font-semibold text-gray-700">Hledat dle jména mazlíčka</div>
            <input
              className="mt-0.5 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-rose-600 focus:ring-rose-600"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="např. Rex"
            />
          </label>
        </div>
      </div>

      {bootLoading ? (
        <div className="op-card p-6 text-center text-sm text-gray-600">Načítám…</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => {
              const addedAt = formatAddedAt(p.created_at);

              return (
                <article key={p.id} className="op-card p-4">
                  <Link href={`/pets/${p.id}/${p.slug}`} className="block">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-full border border-gray-200 bg-gray-50">
                        {p.profile_picture ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.profile_picture} alt={p.name} className="h-full w-full object-cover" />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-base font-extrabold text-gray-900">
                              <span className="text-rose-700">{p.name}</span>
                            </div>

                            <div className="mt-0.5 text-xs text-gray-600">
                              <div>{speciesLabel(p.breed?.species ?? 'all')}</div>
                              <div>Plemeno: {p.breed?.name ?? 'Neznámé plemeno'}</div>
                            </div>

                            {addedAt ? (
                              <div className="mt-1 text-xs text-gray-500">
                                Přidáno: <span className="font-semibold text-gray-700">{addedAt}</span>
                              </div>
                            ) : null}
                          </div>

                          <div className="text-right text-xs text-gray-700">
                            <div>{formatLikesCS(p.likes_count ?? 0)}</div>
                            <div>{formatFollowersCS(p.followers_count ?? 0)}</div>
                            <div>{formatCommentsCS(p.comments_count ?? 0)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>

          <div className="mt-8">
            <div ref={sentinelRef} className="h-px w-full" />

            {loadingMore && <div className="mt-4 text-center text-sm text-gray-600">Načítám…</div>}

            {!loadingMore && currentPage >= lastPage && <div className="mt-4 text-center text-sm text-gray-600">To je vše.</div>}
          </div>
        </>
      )}
    </main>
  );
}