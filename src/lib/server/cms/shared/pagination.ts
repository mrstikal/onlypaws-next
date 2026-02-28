/**
 * Pagination utilities for CMS queries
 * DRY helper to normalize pagination params across all CMS modules
 */

export interface PaginationParams {
  page: number;
  perPage: number;
}

export interface PaginationResult {
  safePage: number;
  safePerPage: number;
  skip: number;
  take: number;
}

/**
 * Normalize and validate pagination params
 * @param page 1-based page number
 * @param perPage items per page
 * @returns Normalized pagination params with skip/take for Prisma
 */
export function formatPaginationParams(
  page: number,
  perPage: number,
): PaginationResult {
  const safePage = Math.max(1, page);
  const safePerPage = Math.min(100, Math.max(5, perPage));
  const skip = (safePage - 1) * safePerPage;
  const take = safePerPage;

  return { safePage, safePerPage, skip, take };
}

/**
 * Calculate last page number based on total items and per-page count
 */
export function calculateLastPage(total: number, safePerPage: number): number {
  return Math.max(1, Math.ceil(total / safePerPage));
}

