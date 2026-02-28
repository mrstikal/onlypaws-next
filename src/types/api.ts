/**
 * API Request/Response Types
 */

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface ApiErrorResponse {
  ok: false;
  error: string;
  errors?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export type SortDirection = 'asc' | 'desc';

