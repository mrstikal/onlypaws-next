'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PostCard from '@/components/onlypaws/PostCard';
import RecommendedPetsCard from '@/components/onlypaws/RecommendedPetsCard';
import TipCard from '@/components/onlypaws/TipCard';

type SortKey = 'date' | 'likes' | 'comments';
type SortDir = 'asc' | 'desc';

type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
};

type PetMini = {
  id: string;
  name: string;
  slug: string;
  profile_picture: string | null;
  followers_count: number;
};

type PostCardModel = {
  id: string;
  caption: string;
  media_url: string;
  media_type: string;
  likes_count: number;
  comments_count: number;
  is_premium: boolean;
  created_at: string;
  pet: {
    id: string;
    name: string;
    profile_picture: string | null;
    followers_count: number;
    likes_count: number;
    posts_count: number;
    comments_count: number;
  } | null;
  required_tier: { name: string } | null;
  required_tier_slug: string;
  locked: boolean;
};

function normalizeSortKey(v: string | null): SortKey {
  if (v === 'date' || v === 'likes' || v === 'comments') return v;
  return 'likes';
}

function normalizeSortDir(v: string | null): SortDir {
  return v === 'asc' ? 'asc' : 'desc';
}

async function fetchFeed(params: { page: number; sort: SortKey; dir: SortDir; q: string }) {
  const sp = new URLSearchParams();
  if (params.page > 1) sp.set('page', String(params.page));
  sp.set('sort', params.sort);
  sp.set('dir', params.dir);
  if (params.q.trim()) sp.set('q', params.q.trim());

  const res = await fetch(`/api/feed?${sp.toString()}`, { method: 'GET' });
  if (!res.ok) throw new Error(`Feed fetch failed: ${res.status}`);

  return (await res.json()) as {
    posts: Paginated<PostCardModel>;
    recommendedPets: PetMini[];
  };
}

export default function FeedIndexClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initial = useMemo(() => {
    const sp = searchParams ?? new URLSearchParams();

    const sort = normalizeSortKey(sp.get('sort'));
    const dir = normalizeSortDir(sp.get('dir'));
    const q = sp.get('q') ?? '';

    return { sort, dir, q };
  }, [searchParams]);

  const [sort, setSort] = useState<SortKey>(initial.sort);
  const [dir, setDir] = useState<SortDir>(initial.dir);
  const [q, setQ] = useState<string>(initial.q);

  const [items, setItems] = useState<PostCardModel[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  const [recommendedPets, setRecommendedPets] = useState<PetMini[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const canLoadMore = useMemo(() => !loadingMore && currentPage < lastPage, [loadingMore, currentPage, lastPage]);

  const syncUrl = (next: { sort: SortKey; dir: SortDir; q: string }) => {
    const sp = new URLSearchParams();
    sp.set('sort', next.sort);
    sp.set('dir', next.dir);
    if (next.q.trim()) sp.set('q', next.q.trim());

    router.replace(`/feed?${sp.toString()}`);
  };

  const reloadFirstPage = async (next: { sort: SortKey; dir: SortDir; q: string }) => {
    setLoadingMore(true);
    try {
      syncUrl(next);

      const data = await fetchFeed({ page: 1, sort: next.sort, dir: next.dir, q: next.q });

      setItems(data.posts.data);
      setCurrentPage(data.posts.current_page);
      setLastPage(data.posts.last_page);
      setTotal(data.posts.total);
      setRecommendedPets(data.recommendedPets ?? []);
    } finally {
      setLoadingMore(false);
      setBootLoading(false);
    }
  };

  useEffect(() => {
    reloadFirstPage({ sort, dir, q }).catch((e) => console.error(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      reloadFirstPage({ sort, dir, q }).catch((e) => console.error(e));
    }, 300);

    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, dir, q]);

  const resetFilters = () => {
    const next = { sort: 'likes' as const, dir: 'desc' as const, q: '' };
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
      const data = await fetchFeed({ page: nextPage, sort, dir, q });

      const seen = new Set(items.map((p) => String(p?.id)));
      const next = data.posts.data.filter((p) => !seen.has(String(p?.id)));

      setItems((prev) => prev.concat(next));
      setCurrentPage(data.posts.current_page);
      setLastPage(data.posts.last_page);
      setTotal(data.posts.total);
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
  }, [canLoadMore, currentPage, lastPage, loadingMore, sort, dir, q, items]);

  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-12">
      <section className="lg:col-span-8">
        <h1 className="pb-4 text-2xl font-bold tracking-tight text-rose-700">Příspěvky</h1>

        <div className="op-card mb-4 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="text-sm text-gray-600">
              Nalezeno <span className="font-semibold">{total}</span> příspěvků
            </div>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Reset filtrů
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3 md:items-end">
            <label className="block">
              <div className="text-xs font-semibold text-gray-700">Řadit podle</div>
              <select
                className="mt-2 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-rose-600 focus:ring-rose-600"
                value={sort}
                onChange={(e) => setSort(normalizeSortKey(e.target.value))}
              >
                <option value="likes">Lajků</option>
                <option value="comments">Komentářů</option>
                <option value="date">Data</option>
              </select>
            </label>

            <label className="block">
              <div className="text-xs font-semibold text-gray-700">Směr</div>
              <select
                className="mt-2 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-rose-600 focus:ring-rose-600"
                value={dir}
                onChange={(e) => setDir(normalizeSortDir(e.target.value))}
              >
                <option value="desc">Sestupně</option>
                <option value="asc">Vzestupně</option>
              </select>
            </label>

            <label className="block">
              <div className="text-xs font-semibold text-gray-700">Vyhledávání</div>
              <input
                className="mt-2 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-rose-600 focus:ring-rose-600"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="např. výlet, mazlíček…"
              />
            </label>
          </div>
        </div>

        {bootLoading ? (
          <div className="op-card p-6 text-center text-sm text-gray-600">Načítám…</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((p) => (
                <PostCard key={String(p.id)} post={p} />
              ))}
            </div>

            <div className="mt-8">
              <div ref={sentinelRef} className="h-px w-full" />

              {loadingMore && <div className="mt-4 text-center text-sm text-gray-600">Načítám…</div>}

              {!loadingMore && currentPage >= lastPage && <div className="mt-4 text-center text-sm text-gray-600">To je vše.</div>}
            </div>
          </>
        )}
      </section>

      <aside className="lg:col-span-4">
        <RecommendedPetsCard pets={recommendedPets} />
        <TipCard />
      </aside>
    </main>
  );
}