/**
 * Where clause builder utilities for CMS queries
 * DRY helper to construct Prisma where conditions
 *
 * Usage:
 *   const whereParts: Prisma.petsWhereInput[] = [];
 *   whereParts.push({ name: 'Fluffy' });
 *   const where = buildWhereClause(whereParts);
 */

/**
 * Build a where clause from array of where conditions
 * Safely handles empty arrays by returning empty object
 * Preserves Prisma type safety by using generics and overloads
 * @param whereParts Array of Prisma where conditions (e.g., Prisma.petsWhereInput[])
 * @returns Combined where clause: { AND: whereParts } or {}
 */

// Overload: empty array returns empty object
export function buildWhereClause<T>(
  whereParts: readonly [],
): Record<string, never>;

// Overload: single item array returns the item itself
export function buildWhereClause<T>(
  whereParts: readonly [T],
): T;

// Overload: multiple items returns { AND: T[] }
export function buildWhereClause<T>(
  whereParts: readonly T[],
): { AND: T[] };

// Implementation
export function buildWhereClause<T>(
  whereParts: readonly T[],
): T | { AND: T[] } | Record<string, never> {
  if (whereParts.length === 0) {
    return {} as Record<string, never>;
  }
  if (whereParts.length === 1) {
    return whereParts[0]!;
  }
  return { AND: [...whereParts] };
}

