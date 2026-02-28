/**
 * Custom React Hooks
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { PaginatedResponse } from '@/types/api';

/**
 * Hook for handling pagination
 */
export function usePagination<T>(initialPerPage: number = 12) {
  const [items, setItems] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setItems([]);
    setCurrentPage(1);
    setLastPage(1);
    setTotal(0);
  }, []);

  const canLoadMore = currentPage < lastPage;

  return {
    items,
    setItems,
    currentPage,
    setCurrentPage,
    lastPage,
    setLastPage,
    total,
    setTotal,
    loading,
    setLoading,
    canLoadMore,
    reset,
    perPage: initialPerPage,
  };
}

/**
 * Hook for fetching paginated data
 */
export function useFetchPaginated<T>(
  url: string,
  options: { perPage?: number; initialPage?: number } = {}
) {
  const { perPage = 12, initialPage = 1 } = options;
  const {
    items,
    setItems,
    currentPage,
    setCurrentPage,
    lastPage,
    setLastPage,
    total,
    setTotal,
    loading,
    setLoading,
    canLoadMore,
  } = usePagination<T>(perPage);

  const fetch = useCallback(
    async (page: number = initialPage) => {
      try {
        setLoading(true);
        const response = await globalThis.fetch(
          `${url}?page=${page}&per_page=${perPage}`
        );
        const data: PaginatedResponse<T> = await response.json();

        if (page === 1) {
          setItems(data.data);
        } else {
          setItems(prev => [...prev, ...data.data]);
        }

        setCurrentPage(data.current_page);
        setLastPage(data.last_page);
        setTotal(data.total);
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    },
    [url, perPage, initialPage, setItems, setLoading, setCurrentPage, setLastPage, setTotal]
  );

  return {
    items,
    currentPage,
    lastPage,
    total,
    loading,
    canLoadMore,
    fetch,
    reset: () => {
      setItems([]);
      setCurrentPage(1);
    },
  };
}

/**
 * Hook for handling async operations with loading/error states
 */
export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate = true
) {
  const [state, setState] = useState<{
    loading: boolean;
    data: T | null;
    error: Error | null;
  }>({
    loading: immediate,
    data: null,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ loading: true, data: null, error: null });
    try {
      const response = await asyncFunction();
      setState({ loading: false, data: response, error: null });
      return response;
    } catch (error) {
      setState({
        loading: false,
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      // Call asynchronously to avoid synchronous state update in effect
      void execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate]);

  return { ...state, execute };
}

