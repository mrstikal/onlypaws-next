export function normalizeCmsMediaFileName(folder: 'pets' | 'posts', value: unknown) {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) return null;

  const prefix = `${folder}/`;
  const cleaned = s.startsWith(prefix) ? s.slice(prefix.length) : s;

  if (!/^[a-zA-Z0-9._-]+\.[a-zA-Z0-9]+$/.test(cleaned)) return null;
  return cleaned;
}

