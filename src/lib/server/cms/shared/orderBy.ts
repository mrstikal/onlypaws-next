/**
 * OrderBy builder utilities for CMS queries
 * DRY helper to construct Prisma orderBy conditions with consistent secondary sorting
 *
 * Benefits of using this helper:
 * - Type-safe field names through generics
 * - Consistent secondary sorting (e.g., by ID for pagination stability)
 * - Works with all Prisma models (petsOrderByWithRelationInput, postsOrderByWithRelationInput, etc.)
 *
 * Usage:
 *   const orderBy = buildOrderByWithMap(sortKey, sortDir, {
 *     name: { field: 'name', secondary: [{ id: 'desc' }] },
 *     created_at: { field: 'created_at', secondary: [{ id: 'desc' }] },
 *   });
 */

export type SortDir = 'asc' | 'desc';

/**
 * Order field definition - defines how to sort a field
 * @param primaryKey Primary field to sort by (must exist in Prisma model)
 * @param primaryDir Sort direction (asc/desc)
 * @param secondary Secondary sorting conditions (e.g., [{id: 'desc'}] for ID tiebreaker)
 * @returns Prisma-compatible orderBy array
 *
 * Example:
 *   buildOrderBy('name', 'asc', [{ id: 'desc' }])
 *   => [{ name: 'asc' }, { id: 'desc' }]
 */
export function buildOrderBy(
  primaryKey: string,
  primaryDir: SortDir,
  secondary?: Record<string, SortDir | Record<string, SortDir>>[],
): Array<Record<string, SortDir | Record<string, SortDir>>> {
  const result: Array<Record<string, SortDir | Record<string, SortDir>>> = [
    { [primaryKey]: primaryDir },
  ];

  if (secondary) {
    result.push(...secondary);
  } else {
    // Default secondary sorting - ID in opposite direction for consistency
    result.push({ id: primaryDir === 'asc' ? 'asc' : 'desc' });
  }

  return result;
}

/**
 * Generic orderBy builder with mapping from sortKey to field definitions
 * Provides type safety by mapping string keys to Prisma field names
 *
 * @param sortKey Selected sort key (type-checked against sortMap keys)
 * @param sortDir Sort direction (asc/desc)
 * @param sortMap Map of sortKey -> { field: fieldName, secondary?: [...] }
 * @param defaultOrderBy Default orderBy if sortKey is not in the map
 * @returns Prisma-compatible orderBy array
 *
 * Example:
 *   buildOrderByWithMap(sortKey, sortDir, {
 *     'created_at': { field: 'created_at', secondary: [{ id: 'desc' }] },
 *     'name': { field: 'name', secondary: [{ id: 'desc' }] },
 *   })
 */
export function buildOrderByWithMap<T extends string>(
  sortKey: T,
  sortDir: SortDir,
  sortMap: Record<
    T,
    {
      field: string;
      secondary?: Record<string, SortDir | Record<string, SortDir>>[];
    }
  >,
  defaultOrderBy?: Record<string, SortDir | Record<string, SortDir>>[],
): Array<Record<string, SortDir | Record<string, SortDir>>> {
  const config = sortMap[sortKey];

  if (config) {
    return buildOrderBy(config.field, sortDir, config.secondary);
  }

  // Default orderBy if defined
  if (defaultOrderBy) {
    return defaultOrderBy;
  }

  // Fallback - sort by ID
  return [{ id: sortDir }];
}

