export function normalizeSlug(value: unknown) {
  const s = String(value ?? '').trim().toLowerCase();
  if (!s) return null;
  if (!/^[a-z0-9-]+$/.test(s)) return null;
  return s;
}

