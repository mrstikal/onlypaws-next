export type MediaFolder = 'pets' | 'posts';

/**
 * Normalize media path from DB to a public URL.
 *
 * Default: /media/<folder>/<file>
 * (file is stored in ./storage/media/<folder>/<file>)
 */
export function publicUrl(folder: MediaFolder, path: unknown): string | null {
  const s = typeof path === 'string' ? path.trim() : '';
  if (!s) return null;

  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('/')) return s;

  const prefix = `${folder}/`;
  const cleaned = s.startsWith(prefix) ? s.slice(prefix.length) : s;

  return `/media/${folder}/${cleaned}`;
}