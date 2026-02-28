import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination, useFetchPaginated } from '@/hooks/index';

describe('usePagination', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => usePagination());

    expect(result.current.items).toEqual([]);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.lastPage).toBe(1);
    expect(result.current.total).toBe(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.canLoadMore).toBe(false);
    expect(result.current.perPage).toBe(12);
  });

  it('initializes with custom perPage value', () => {
    const { result } = renderHook(() => usePagination(24));

    expect(result.current.perPage).toBe(24);
  });

  it('updates items', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setItems([{ id: 1, name: 'Item 1' }]);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]).toEqual({ id: 1, name: 'Item 1' });
  });

  it('updates pagination state', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setCurrentPage(2);
      result.current.setLastPage(5);
      result.current.setTotal(100);
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.lastPage).toBe(5);
    expect(result.current.total).toBe(100);
  });

  it('calculates canLoadMore correctly', () => {
    const { result } = renderHook(() => usePagination());

    expect(result.current.canLoadMore).toBe(false);

    act(() => {
      result.current.setCurrentPage(1);
      result.current.setLastPage(3);
    });

    expect(result.current.canLoadMore).toBe(true);

    act(() => {
      result.current.setCurrentPage(3);
    });

    expect(result.current.canLoadMore).toBe(false);
  });

  it('resets all values', () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setItems([{ id: 1 }]);
      result.current.setCurrentPage(3);
      result.current.setLastPage(10);
      result.current.setTotal(100);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.currentPage).toBe(3);

    act(() => {
      result.current.reset();
    });

    expect(result.current.items).toEqual([]);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.lastPage).toBe(1);
    expect(result.current.total).toBe(0);
  });
});

describe('useFetchPaginated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useFetchPaginated('/api/items'));

    expect(result.current.items).toEqual([]);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.loading).toBe(false);
  });

  it('fetches items successfully', async () => {
    const mockResponse = {
      data: [{ id: 1, name: 'Item 1' }],
      current_page: 1,
      last_page: 3,
      total: 25,
    };

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => mockResponse,
    } as never);

    const { result } = renderHook(() => useFetchPaginated('/api/items'));

    await act(async () => {
      await result.current.fetch();
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.lastPage).toBe(3);
    expect(result.current.total).toBe(25);
  });

  it('fetches with custom options', async () => {
    const mockResponse = {
      data: [{ id: 1 }],
      current_page: 1,
      last_page: 1,
      total: 5,
    };

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => mockResponse,
    } as never);

    const { result } = renderHook(() =>
      useFetchPaginated('/api/items', { perPage: 24, initialPage: 1 })
    );

    await act(async () => {
      await result.current.fetch();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/items?page=1&per_page=24');
  });
});


