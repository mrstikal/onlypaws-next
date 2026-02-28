export function startOfDayLocal(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function nextDayStartLocal(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
}

export function parseDateOnly(value: string | null) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function clip(s: string, n: number) {
  const t = s.trim().replace(/\s+/g, ' ');
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/**
 * Parse date range and create a Prisma created_at filter
 * @param fromDate YYYY-MM-DD or null
 * @param untilDate YYYY-MM-DD or null
 * @returns Object for Prisma { created_at: { gte?, lt? } } or {}
 */
export function parseDateRangeFilter(
  fromDate?: string | null,
  untilDate?: string | null,
): Record<string, Date> {
  const filter: Record<string, Date> = {};

  const from = parseDateOnly(fromDate ?? null);
  if (from) {
    filter.gte = startOfDayLocal(from);
  }

  const until = parseDateOnly(untilDate ?? null);
  if (until) {
    filter.lt = nextDayStartLocal(until);
  }

  return filter;
}

