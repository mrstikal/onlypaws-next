'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
};

type BreedCard = {
  id: string; // BigInt -> string
  name: string;
  species: 'dog' | 'cat' | string;
  description: string | null;
  pets_count: number;
  pets: Array<{
    id: string; // BigInt -> string
    name: string;
    slug: string;
    profile_picture: string | null;
  }>;
};

type Filters = {
  species: 'all' | 'dog' | 'cat';
  has_pets: 'all' | 'with' | 'without';
  q: string;
};

function speciesLabel(species: string) {
  if (species === 'dog') return 'Psi';
  if (species === 'cat') return 'Kočky';
  return 'Vše';
}

async function fetchBreeds(params: {
  species: Filters['species'];
  hasPets: Filters['has_pets'];
  q: string;
  page: number;
}) {
  const search = new URLSearchParams();

  if (params.page > 1) search.set('page', String(params.page));
  if (params.species !== 'all') search.set('species', params.species);
  if (params.hasPets !== 'all') search.set('has_pets', params.hasPets);
  if (params.q.trim()) search.set('q', params.q.trim());

  const res = await fetch(`/api/breeds?${search.toString()}`, { method: 'GET' });
  if (!res.ok) throw new Error(`Breeds fetch failed: ${res.status}`);

  return (await res.json()) as {
    breeds: Paginated<BreedCard>;
    filters: Filters;
  };
}

export default function BreedsIndexClient() {
  const [species, setSpecies] = useState<Filters['species']>('all');
  const [hasPets, setHasPets] = useState<Filters['has_pets']>('all');
  const [q, setQ] = useState<string>('');
  const hasLoadedInitiallyRef = useRef(false);

  const speciesPills = useMemo(
    () => [
      { key: 'all' as const, label: 'Vše' },
      { key: 'dog' as const, label: 'Psi' },
      { key: 'cat' as const, label: 'Kočky' },
    ],
    [],
  );

  const hasPetsPills = useMemo(
    () => [
      { key: 'all' as const, label: 'Všechny' },
      { key: 'with' as const, label: 'Jen s mazlíčky' },
      { key: 'without' as const, label: 'Bez mazlíčků' },
    ],
    [],
  );

  const [items, setItems] = useState<BreedCard[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  const [loadingMore, setLoadingMore] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const canLoadMore = useMemo(() => !loadingMore && currentPage < lastPage, [loadingMore, currentPage, lastPage]);

  const reloadFirstPage = useCallback(
    async (next: { species: Filters['species']; hasPets: Filters['has_pets']; q: string }) => {
      setLoadingMore(true);
      try {
        const data = await fetchBreeds({ species: next.species, hasPets: next.hasPets, q: next.q, page: 1 });

        setItems(data.breeds.data);
        setCurrentPage(data.breeds.current_page);
        setLastPage(data.breeds.last_page);
        setTotal(data.breeds.total);
      } finally {
        setLoadingMore(false);
        setBootLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!hasLoadedInitiallyRef.current) {
      hasLoadedInitiallyRef.current = true;
      reloadFirstPage({ species, hasPets, q }).catch((e) => console.error(e));
      return;
    }

    const handle = window.setTimeout(() => {
      reloadFirstPage({ species, hasPets, q }).catch((e) => console.error(e));
    }, 300);

    return () => window.clearTimeout(handle);
  }, [species, hasPets, q, reloadFirstPage]);

  const reset = () => {
    const next = { species: 'all' as const, hasPets: 'all' as const, q: '' };
    setSpecies(next.species);
    setHasPets(next.hasPets);
    setQ(next.q);
    reloadFirstPage(next).catch((e) => console.error(e));
  };

  const loadMore = async () => {
    if (!canLoadMore) return;

    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const data = await fetchBreeds({ species, hasPets, q, page: nextPage });

      const seen = new Set(items.map((b) => b.id));
      const next = data.breeds.data.filter((b) => !seen.has(b.id));

      setItems((prev) => prev.concat(next));
      setCurrentPage(data.breeds.current_page);
      setLastPage(data.breeds.last_page);
      setTotal(data.breeds.total);
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
  }, [canLoadMore, currentPage, lastPage, loadingMore, species, hasPets, q, items]);

  return (
    <main className="op-container py-8">
      <div className="mb-6 op-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="pb-4 text-2xl font-bold tracking-tight text-rose-700">Plemena</h1>
            <div className="text-sm text-gray-600">
              Nalezeno <span className="font-semibold">{total}</span> plemen
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

        <div className="mt-4 grid gap-3 md:grid-cols-3 md:items-end">
          <div>
            <div className="text-xs font-semibold text-gray-700">Druh</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {speciesPills.map((p) => {
                const active = p.key === species;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setSpecies(p.key)}
                    className={[
                      'rounded-full py-1.5 pl-2.5 pr-3 text-sm font-semibold',
                      active ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-800 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-700">Zobrazit plemena</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {hasPetsPills.map((p) => {
                const active = p.key === hasPets;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setHasPets(p.key)}
                    className={[
                      'rounded-full py-1.5 pl-2.5 pr-3 text-sm font-semibold',
                      active ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-800 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <div className="text-xs font-semibold text-gray-700">Vyhledávání podle názvu plemena</div>
            <input
              className={[
                'mt-2 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900',
                'placeholder:text-gray-400',
                'focus:border-rose-600 focus:ring-rose-600',
              ].join(' ')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="např. Sibiřská kočka"
            />
          </label>
        </div>
      </div>


      {bootLoading ? (
        <div className="op-card p-6 text-center text-sm text-gray-600">Načítám…</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((b) => (
              <article key={b.id} className="op-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-900">
                      {speciesLabel(b.species)}
                    </div>

                    <h2 className="mt-2 text-base font-extrabold text-gray-900">{b.name}</h2>
                    <div className="mt-0.5 text-xs text-gray-600">{b.pets_count} mazlíčků</div>
                  </div>
                </div>

                {b.description ? (
                  <p className="mt-3 line-clamp-3 text-sm text-gray-600">{b.description}</p>
                ) : (
                  <p className="mt-3 text-sm text-gray-500">Popis zatím není vyplněn.</p>
                )}

                <div className="mt-4">
                  <div className="text-xs font-semibold text-gray-700">Mazlíčci</div>

                  {b.pets.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {b.pets.map((p) => (
                        <Link
                          key={p.id}
                          href={`/pets/${p.id}/${p.slug}`}
                          className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm text-violet-700 hover:bg-gray-50 hover:underline"
                        >
                          {p.name}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-gray-600">Zatím žádní mazlíčci v tomto plemeni.</div>
                  )}
                </div>
              </article>
            ))}
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