/**
 * Shared utility functions for CMS parameter parsing and conversion
 */

/**
 * Parse a string or unknown value to BigInt, return null if invalid
 */
export function parseBigIntParam(raw: string | unknown): bigint | null {
  try {
    return BigInt(String(raw));
  } catch {
    return null;
  }
}

/**
 * Convert bigint or any value to string
 */
export function bigIntToString(value: unknown): string {
  return typeof value === 'bigint' ? value.toString() : String(value);
}

/**
 * Clamp integer between min and max, return default if NaN
 */
export function clampInt(
  value: string | null,
  def: number,
  min: number,
  max: number,
): number {
  const n = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

/**
 * Extract single string from string | string[] | undefined
 */
export function asString(value: string | string[] | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

/**
 * Normalize sort direction to 'asc' or 'desc'
 */
export function normalizeSortDir(value: string | null): 'asc' | 'desc' {
  return value === 'asc' ? 'asc' : 'desc';
}

/**
 * Normalize sort key to valid value or return default
 */
export function normalizeSortKey<T extends readonly string[]>(
  value: string | null,
  validKeys: T,
  defaultKey: T[number],
): T[number] {
  if (value && validKeys.includes(value as T[number])) {
    return value as T[number];
  }
  return defaultKey;
}

/**
 * Toggle sort direction between 'asc' and 'desc'
 */
export function toggleDir(
  currentKey: string | null,
  currentDir: string | null,
  nextKey: string,
): 'asc' | 'desc' {
  if (currentKey !== nextKey) return 'asc';
  return currentDir === 'asc' ? 'desc' : 'asc';
}

/**
 * Build href with query parameters, omitting null/undefined/empty values
 */
export function buildHref(
  basePath: string,
  params: Record<string, string | null | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') continue;
    sp.set(k, v);
  }
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

