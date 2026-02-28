import { useEffect, useMemo, useRef, useState } from 'react';

type PaginationLike = {
  current_page?: number;
  last_page?: number;
};

type LoadPageResult<T> = {
  comments: T[];
  commentsPagination: PaginationLike;
};

type Params<T extends { id: number }> = {
  entityKey: string | number;
  comments: T[];
  pagination: PaginationLike;
  pageName?: string;

  /**
   * Loader pro načtení další stránky root komentářů (Next fetch/API).
   * Musí vrátit root komentáře + pagination.
   */
  loadPage: (page: number) => Promise<LoadPageResult<T>>;

  /**
   * Jak daleko před sentinelem začít načítat (kvůli plynulosti).
   */
  rootMargin?: string;
};

export function useDeterministicRootComments<T extends { id: number }>(params: Params<T>) {
  const {
    entityKey,
    comments,
    pagination,
    pageName = 'cpage', // ponecháno pro kompatibilitu pojmů
    loadPage,
    rootMargin = '800px 0px',
  } = params;

  const [items, setItems] = useState<T[]>(() => comments ?? []);
  const [page, setPage] = useState<number>(() => pagination?.current_page ?? 1);
  const [lastPage, setLastPage] = useState<number>(() => pagination?.last_page ?? 1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [, setRootIdsByPage] = useState<Record<number, number[]>>(() => {
    const p = pagination?.current_page ?? 1;
    return { [p]: (comments ?? []).map((c) => c.id) };
  });

  const [, setRootById] = useState<Record<number, T>>(() => {
    const map: Record<number, T> = {};
    for (const c of comments ?? []) map[c.id] = c;
    return map;
  });

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const rebuildItems = (idsByPage: Record<number, number[]>, byId: Record<number, T>) => {
    const pages = Object.keys(idsByPage)
      .map((p) => Number(p))
      .filter((p) => Number.isFinite(p))
      .sort((a, b) => a - b);

    const out: T[] = [];
    const seen = new Set<number>();

    for (const p of pages) {
      for (const id of idsByPage[p] ?? []) {
        if (seen.has(id)) continue;
        const node = byId[id];
        if (!node) continue;
        seen.add(id);
        out.push(node);
      }
    }

    return out;
  };

  const applyIncomingRootPage = (incomingPage: number, incomingRoots: T[]) => {
    const incomingIds = incomingRoots.map((c) => c.id);

    setRootById((prevById) => {
      const nextById = { ...prevById };
      for (const c of incomingRoots) nextById[c.id] = c;

      setRootIdsByPage((prevIdsByPage) => {
        const nextIdsByPage = { ...prevIdsByPage, [incomingPage]: incomingIds };
        setItems(rebuildItems(nextIdsByPage, nextById));
        return nextIdsByPage;
      });

      return nextById;
    });
  };

  // Sync při změně entity nebo při změně vstupních props (např. navigace na jiný post)
  useEffect(() => {
    const incomingPage = pagination?.current_page ?? 1;

    applyIncomingRootPage(incomingPage, comments ?? []);
    setPage(incomingPage);
    setLastPage(pagination?.last_page ?? 1);

    // Reset lokálních cache při změně entity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityKey, pagination?.current_page, pagination?.last_page]);

  const canLoadMore = useMemo(() => {
    return !loadingMore && page < lastPage;
  }, [loadingMore, page, lastPage]);

  const loadMore = async () => {
    if (!canLoadMore) return;

    setLoadingMore(true);

    const nextPage = page + 1;

    try {
      const res = await loadPage(nextPage);

      const nextPagination = res.commentsPagination;
      const p = nextPagination?.current_page ?? nextPage;
      const incomingRoots = res.comments ?? [];

      applyIncomingRootPage(p, incomingRoots);
      setPage(p);
      setLastPage(nextPagination?.last_page ?? lastPage);
    } finally {
      setLoadingMore(false);
    }
  };

  // Sentinel observer (infinite scroll)
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) void loadMore();
      },
      { root: null, rootMargin, threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoadMore, page, lastPage, loadingMore, rootMargin, pageName]);

  return {
    items,
    page,
    lastPage,
    loadingMore,
    canLoadMore,
    sentinelRef,
    applyIncomingRootPage,
    setPage,
    setLastPage,
  };
}